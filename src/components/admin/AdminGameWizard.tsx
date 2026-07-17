"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Check, ChevronLeft, ChevronRight, CloudUpload, Eye, FileArchive, ImagePlus, LoaderCircle, Rocket, Save, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadWebglMvp, updateWebglMvp, type WebglUploadProgress } from "@/lib/webglMvpClient";
import {
  canPublishVerifiedBuild,
  EMPTY_GAME_FORM,
  formatBytes,
  GAME_ENGINES,
  getSlugPreview,
  sanitizeAdminError,
  splitTags,
  SUBMISSION_STEPS,
  validateSubmissionStep,
  type GameEngine,
  type GameFormState
} from "@/components/admin/adminUploadLogic";
import type { AdminCategory, AdminGameRow } from "@/components/admin/adminPortalTypes";

type AdminGameWizardProps = {
  categories: AdminCategory[];
  editingGame: AdminGameRow | null;
  r2GameUploadsEnabled: boolean;
  onCancel: () => void;
  onComplete: (message: string) => void;
};

type UploadResultState = {
  operationId: string;
  gameId: string;
  previewUrl: string;
  buildType: string;
  compressionMode: string;
  fileCount: number;
  totalBytes: number;
};

const fieldClass = "min-h-12 w-full rounded-xl border border-white/10 bg-[#0b1017] px-4 text-sm text-white outline-none transition placeholder:text-uniblex-gray/60 focus:border-uniblex-blue focus:ring-2 focus:ring-uniblex-blue/15 disabled:cursor-not-allowed disabled:opacity-50";

export function AdminGameWizard({ categories, editingGame, r2GameUploadsEnabled, onCancel, onComplete }: AdminGameWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GameFormState>(() => initialForm(editingGame));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [requestError, setRequestError] = useState("");
  const [progress, setProgress] = useState<WebglUploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResultState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const coverPreview = useObjectUrl(coverFile, form.coverUrl);
  const thumbnailPreview = useObjectUrl(thumbnailFile, form.thumbnailUrl || form.coverUrl);
  const slugPreview = useMemo(() => getSlugPreview(form.title, form.slug), [form.slug, form.title]);
  const isExternal = form.engine === "Externally hosted iframe";
  const isEditingVerifiedGame = Boolean(editingGame?.build_status && editingGame.build_status !== "none");

  useEffect(() => {
    if (!uploading) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function update<K extends keyof GameFormState>(key: K, value: GameFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors([]);
  }

  function goNext() {
    const nextErrors = validateSubmissionStep(step, form, Boolean(coverFile), Boolean(thumbnailFile), Boolean(zipFile));
    if (step === 3 && !r2GameUploadsEnabled && !isExternal) {
      setErrors([]);
      setStep(4);
      return;
    }
    if (editingGame && step === 3) {
      setErrors([]);
      setStep(4);
      return;
    }
    if (nextErrors.length) {
      setErrors(nextErrors);
      document.getElementById("wizard-errors")?.focus();
      return;
    }
    setErrors([]);
    setStep((current) => Math.min(4, current + 1));
  }

  function acceptZip(file: File | null) {
    setRequestError("");
    if (!file) { setZipFile(null); return; }
    if (!file.name.toLowerCase().endsWith(".zip")) { setErrors(["WebGL build must be a .zip file."]); return; }
    if (file.size > 1024 * 1024 * 1024) { setErrors(["ZIP exceeds the 1 GB upload limit."]); return; }
    setZipFile(file);
    setErrors([]);
    setUploadResult(null);
    setProgress(null);
  }

  async function startSecureUpload() {
    const allErrors = [0, 1, 2, 3].flatMap((target) => validateSubmissionStep(target, form, Boolean(coverFile), Boolean(thumbnailFile), Boolean(zipFile)));
    if (allErrors.length) { setErrors([...new Set(allErrors)]); return; }
    if (!zipFile || !supabase || !r2GameUploadsEnabled || editingGame) return;
    setUploading(true);
    setRequestError("");
    setErrors([]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const media = await uploadMedia({ title: form.title, slug: slugPreview, coverFile, thumbnailFile, screenshots });
      setForm((current) => ({ ...current, coverUrl: media.coverUrl || current.coverUrl, thumbnailUrl: media.thumbnailUrl || media.coverUrl || current.thumbnailUrl, screenshotUrls: media.screenshotUrls.length ? media.screenshotUrls : current.screenshotUrls }));
      const result = await uploadWebglMvp(zipFile, {
        slug: slugPreview,
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        genre: form.engine,
        coverUrl: media.coverUrl || form.coverUrl,
        thumbnailUrl: media.thumbnailUrl || media.coverUrl || form.thumbnailUrl,
        screenshotUrls: media.screenshotUrls.length ? media.screenshotUrls : form.screenshotUrls,
        tags: splitTags(form.tags),
        desktopControls: form.desktopSupport ? controlsPayload(form) : [],
        mobileControls: form.mobileSupport ? controlsPayload(form) : []
      }, setProgress, controller.signal);
      const nextResult = {
        operationId: result.operationId,
        gameId: result.gameId,
        previewUrl: result.previewUrl,
        buildType: result.manifest.buildType,
        compressionMode: result.manifest.compressionMode,
        fileCount: result.manifest.files.length,
        totalBytes: result.manifest.totalBytes
      };
      setUploadResult(nextResult);
      await updateListingOptions(result.gameId, form, media.screenshotUrls);
      setStep(4);
    } catch (error) {
      setRequestError(controller.signal.aborted ? "Upload cancelled safely. You can select Retry when ready." : sanitizeAdminError(error));
    } finally {
      abortRef.current = null;
      setUploading(false);
    }
  }

  async function saveDraft() {
    if (!supabase) return;
    if (!editingGame && !isExternal && !uploadResult) return;
    setSaving(true);
    setRequestError("");
    try {
      if (uploadResult) {
        await updateListingOptions(uploadResult.gameId, form, form.screenshotUrls);
        onComplete("Verified build saved as a draft.");
        return;
      }
      const required = [0, 1, 2, ...(isExternal ? [3] : [])].flatMap((target) => validateSubmissionStep(target, form, Boolean(coverFile), Boolean(thumbnailFile), Boolean(zipFile)));
      if (required.length) { setErrors([...new Set(required)]); return; }
      const media = coverFile || thumbnailFile || screenshots.length ? await uploadMedia({ title: form.title, slug: slugPreview, coverFile, thumbnailFile, screenshots }) : { coverUrl: form.coverUrl, thumbnailUrl: form.thumbnailUrl, screenshotUrls: form.screenshotUrls };
      const payload = listingPayload(form, slugPreview, media);
      const query = editingGame ? supabase.from("games").update(payload).eq("id", editingGame.id) : supabase.from("games").insert({ ...payload, status: "draft", build_status: "none", sort_order: 0 });
      const { error } = await query;
      if (error) throw error;
      onComplete(editingGame ? "Game details updated." : "External game saved as a draft.");
    } catch (error) {
      setRequestError(sanitizeAdminError(error));
    } finally {
      setSaving(false);
    }
  }

  async function previewVerified() {
    if (!uploadResult) return;
    setSaving(true);
    try {
      const response = await updateWebglMvp(uploadResult.operationId, "preview");
      const url = String(response.previewUrl || uploadResult.previewUrl);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) { setRequestError(sanitizeAdminError(error)); }
    finally { setSaving(false); }
  }

  async function publishVerified() {
    if (!uploadResult || !canPublishVerifiedBuild(true, uploadResult.operationId)) return;
    setSaving(true);
    setRequestError("");
    try {
      await updateWebglMvp(uploadResult.operationId, "publish");
      onComplete("Game published from its verified build.");
    } catch (error) { setRequestError(sanitizeAdminError(error)); }
    finally { setSaving(false); }
  }

  return (
    <section aria-labelledby="submit-game-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">Secure publishing</p><h1 id="submit-game-heading" className="mt-2 font-heading text-3xl text-white sm:text-4xl">{editingGame ? "Edit Game" : "Submit Game"}</h1><p className="mt-2 text-sm text-uniblex-gray">Complete each section, then verify the build before publishing.</p></div>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-uniblex-gray hover:text-white"><X size={17} /> Close</button>
      </div>

      <ol className="mt-7 grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-[#111822]/80 p-2" aria-label="Submission progress">
        {SUBMISSION_STEPS.map((label, index) => <li key={label} className="min-w-0"><button type="button" onClick={() => index < step && setStep(index)} disabled={index > step || uploading} className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition sm:justify-start sm:px-3 ${index === step ? "bg-gradient-to-r from-uniblex-blue/20 to-uniblex-purple/15 text-white ring-1 ring-uniblex-blue/30" : index < step ? "text-emerald-200 hover:bg-white/5" : "text-uniblex-gray/60"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${index < step ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10"}`}>{index < step ? <Check size={14} /> : index + 1}</span><span className="hidden truncate sm:block">{label}</span></button></li>)}
      </ol>

      {errors.length ? <div id="wizard-errors" tabIndex={-1} role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 outline-none focus:ring-2 focus:ring-red-400"><div className="flex gap-2 font-bold text-red-100"><AlertCircle size={19} /> Please fix the following</div><ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-red-200">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      {requestError ? <div role="alert" className="mt-5 flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between"><span>{requestError}</span>{step === 3 && zipFile && !uploading ? <button type="button" onClick={() => void startSecureUpload()} className="font-bold text-white underline">Retry safely</button> : null}</div> : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-[#111822]/80 p-4 sm:p-6">
        {step === 0 ? <DetailsStep form={form} categories={categories} slugPreview={slugPreview} update={update} /> : null}
        {step === 1 ? <OptionsStep form={form} update={update} /> : null}
        {step === 2 ? <MediaStep coverPreview={coverPreview} thumbnailPreview={thumbnailPreview} screenshots={screenshots} onCover={setCoverFile} onThumbnail={setThumbnailFile} onScreenshots={setScreenshots} /> : null}
        {step === 3 ? <BuildStep form={form} update={update} enabled={r2GameUploadsEnabled} editing={isEditingVerifiedGame} zipFile={zipFile} dragging={dragging} progress={progress} uploading={uploading} uploadResult={uploadResult} onDrag={setDragging} onZip={acceptZip} onUpload={() => void startSecureUpload()} onCancel={() => abortRef.current?.abort()} /> : null}
        {step === 4 ? <ReviewStep form={form} slugPreview={slugPreview} coverPreview={coverPreview} thumbnailPreview={thumbnailPreview} zipFile={zipFile} uploadResult={uploadResult} enabled={r2GameUploadsEnabled} /> : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => step ? setStep(step - 1) : onCancel()} disabled={uploading || saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-bold text-uniblex-gray hover:text-white disabled:opacity-50"><ChevronLeft size={17} /> {step ? "Back" : "Cancel"}</button>
          <div className="flex flex-col gap-3 sm:flex-row">
            {step === 4 ? <>
              {uploadResult?.previewUrl ? <button type="button" onClick={() => void previewVerified()} disabled={saving} className="btn-secondary"><Eye size={17} /> Preview</button> : null}
              <button type="button" onClick={() => void saveDraft()} disabled={saving || (!editingGame && !isExternal && !uploadResult)} className="btn-secondary" title={!editingGame && !isExternal && !uploadResult ? "A verified upload is required before this draft can be persisted" : "Save draft"}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} {editingGame ? "Save changes" : "Save as draft"}</button>
              <button type="button" onClick={() => void publishVerified()} disabled={saving || !canPublishVerifiedBuild(Boolean(uploadResult), uploadResult?.operationId || "")} className="btn-primary" title={uploadResult ? "Publish verified build" : "Publishing requires authoritative verification"}><Rocket size={17} /> Publish</button>
            </> : step === 3 && !isExternal && r2GameUploadsEnabled && !editingGame ? null : <button type="button" onClick={goNext} disabled={uploading || saving} className="btn-primary">{step === 3 ? "Review submission" : "Continue"}<ChevronRight size={17} /></button>}
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailsStep({ form, categories, slugPreview, update }: { form: GameFormState; categories: AdminCategory[]; slugPreview: string; update: <K extends keyof GameFormState>(key: K, value: GameFormState[K]) => void }) {
  return <div><StepHeading number="01" title="Game Details" text="Give reviewers and players the essential information first." /><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Game name" required><input className={fieldClass} value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={160} placeholder="Neon Drift Arena" /></Field><Field label="Slug preview"><input className={fieldClass} value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder={slugPreview || "neon-drift-arena"} /><Hint>/games/{slugPreview || "your-game"}</Hint></Field><Field label="Short description" required wide><textarea className={`${fieldClass} min-h-24 py-3`} value={form.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} maxLength={220} placeholder="A concise player-facing summary." /><Hint>{form.shortDescription.length}/220 characters</Hint></Field><Field label="Full description" required wide><textarea className={`${fieldClass} min-h-36 py-3`} value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} placeholder="Explain the objective, progression, and what makes the game fun." /></Field><Field label="Category" required><select className={`${fieldClass} admin-select`} value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Game engine" required><select className={`${fieldClass} admin-select`} value={form.engine} onChange={(event) => update("engine", event.target.value as GameEngine)}>{GAME_ENGINES.map((engine) => <option key={engine}>{engine}</option>)}</select></Field><Field label="Tags" wide><input className={fieldClass} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="racing, arcade, multiplayer" /><Hint>Separate up to 20 tags with commas.</Hint></Field></div></div>;
}

function OptionsStep({ form, update }: { form: GameFormState; update: <K extends keyof GameFormState>(key: K, value: GameFormState[K]) => void }) {
  const toggles: Array<[keyof GameFormState, string, string]> = [["desktopSupport", "Desktop support", "Playable with a desktop browser"], ["mobileSupport", "Mobile support", "Responsive and touch-friendly"], ["keyboardControls", "Keyboard controls", "Keyboard input is supported"], ["touchControls", "Touch controls", "On-screen or gesture controls"], ["gamepadSupport", "Gamepad support", "Standard browser gamepads"], ["multiplayer", "Multiplayer", "Local or online multiplayer"], ["savesProgress", "Saves progress", "Persistent player progress"]];
  return <div><StepHeading number="02" title="Game Options" text="Accurate compatibility details reduce failed reviews and player frustration." /><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{toggles.map(([key, label, text]) => <label key={String(key)} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4"><input type="checkbox" className="mt-1 h-4 w-4 accent-uniblex-blue" checked={Boolean(form[key])} onChange={(event) => update(key, event.target.checked as never)} /><span><span className="block text-sm font-bold text-white">{label}</span><span className="mt-1 block text-xs text-uniblex-gray">{text}</span></span></label>)}</div><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Orientation"><select className={`${fieldClass} admin-select`} value={form.orientation} onChange={(event) => update("orientation", event.target.value as GameFormState["orientation"])}><option value="landscape">Landscape</option><option value="portrait">Portrait</option><option value="any">Any orientation</option></select></Field><Field label="Recommended aspect ratio"><select className={`${fieldClass} admin-select`} value={form.aspectRatio} onChange={(event) => update("aspectRatio", event.target.value as GameFormState["aspectRatio"])}>{["16/9", "16/10", "4/3", "9/16", "1/1"].map((ratio) => <option key={ratio}>{ratio}</option>)}</select></Field><Field label="Loading instructions" wide><textarea className={`${fieldClass} min-h-24 py-3`} value={form.loadingInstructions} onChange={(event) => update("loadingInstructions", event.target.value)} placeholder="For example: first launch may take 20-30 seconds." /></Field><Field label="Controls / instructions" required wide><textarea className={`${fieldClass} min-h-28 py-3`} value={form.controls} onChange={(event) => update("controls", event.target.value)} placeholder="WASD or arrow keys to move. Space to jump." /></Field></div></div>;
}

function MediaStep({ coverPreview, thumbnailPreview, screenshots, onCover, onThumbnail, onScreenshots }: { coverPreview: string; thumbnailPreview: string; screenshots: File[]; onCover: (file: File | null) => void; onThumbnail: (file: File | null) => void; onScreenshots: (files: File[]) => void }) {
  return <div><StepHeading number="03" title="Media" text="Upload clear artwork that represents the actual game experience." /><div className="mt-6 grid gap-5 lg:grid-cols-2"><MediaPicker label="Cover image" guidance="JPG, PNG, or WebP - Recommended 1600x900 - Max 15 MB" preview={coverPreview} onChange={onCover} /><MediaPicker label="Card thumbnail" guidance="JPG, PNG, or WebP - Recommended 640x360 - Max 15 MB" preview={thumbnailPreview} onChange={onThumbnail} /></div><div className="mt-5 rounded-xl border border-dashed border-white/15 bg-white/[.02] p-5"><label className="flex cursor-pointer flex-col items-center text-center"><ImagePlus className="text-uniblex-purple" size={28} /><span className="mt-2 text-sm font-bold text-white">Optional screenshots</span><span className="mt-1 text-xs text-uniblex-gray">Up to 6 JPG, PNG, or WebP files. Recommended 16:9.</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => onScreenshots(validateImages(Array.from(event.target.files || []), 6))} /></label>{screenshots.length ? <div className="mt-4 flex flex-wrap gap-2">{screenshots.map((file) => <span key={`${file.name}-${file.size}`} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-uniblex-gray">{file.name}</span>)}</div> : null}</div></div>;
}

function BuildStep({ form, update, enabled, editing, zipFile, dragging, progress, uploading, uploadResult, onDrag, onZip, onUpload, onCancel }: { form: GameFormState; update: <K extends keyof GameFormState>(key: K, value: GameFormState[K]) => void; enabled: boolean; editing: boolean; zipFile: File | null; dragging: boolean; progress: WebglUploadProgress | null; uploading: boolean; uploadResult: UploadResultState | null; onDrag: (value: boolean) => void; onZip: (file: File | null) => void; onUpload: () => void; onCancel: () => void }) {
  if (form.engine === "Externally hosted iframe") return <div><StepHeading number="04" title="Hosted Build" text="External games can be saved as drafts, but publishing remains reserved for authoritatively verified builds." /><Field label="HTTPS iframe URL" required><input className={fieldClass} type="url" value={form.iframeUrl} onChange={(event) => update("iframeUrl", event.target.value)} placeholder="https://games.example.com/my-game/index.html" /></Field><div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">External URLs are not verified by the WebGL MVP, so the Publish action stays unavailable.</div></div>;
  if (editing) return <div><StepHeading number="04" title="WebGL Build" text="Existing verified builds are immutable in the reviewed MVP." /><div className="mt-6 rounded-xl border border-uniblex-purple/25 bg-uniblex-purple/10 p-5 text-sm text-white"><ShieldCheck className="mb-3 text-uniblex-purple" />Build replacement is not supported. Save listing changes or submit a new game with a new slug.</div></div>;
  return <div><StepHeading number="04" title="WebGL Build" text="The browser Worker extracts and checksums files incrementally, without loading the entire ZIP into memory." />{!enabled ? <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-amber-200" /><div><p className="font-bold text-amber-100">Production uploads are quarantined</p><p className="mt-1 text-sm leading-6 text-amber-100/75">R2_GAME_UPLOADS_ENABLED is false. You can review this submission, but ZIP selection, upload, verification, and publishing remain disabled.</p></div></div></div> : <><label onDragEnter={(event) => { event.preventDefault(); onDrag(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => onDrag(false)} onDrop={(event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); onDrag(false); onZip(event.dataTransfer.files[0] || null); }} className={`mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${dragging ? "border-uniblex-blue bg-uniblex-blue/10" : "border-white/20 bg-white/[.02] hover:border-uniblex-blue/60"}`}><FileArchive size={38} className="text-uniblex-blue" /><span className="mt-4 font-bold text-white">Drop your WebGL ZIP here</span><span className="mt-1 text-sm text-uniblex-gray">or choose a file - maximum 1 GB</span><input type="file" accept=".zip,application/zip,application/x-zip-compressed" className="sr-only" disabled={uploading} onChange={(event) => onZip(event.target.files?.[0] || null)} /></label>{zipFile ? <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{zipFile.name}</p><p className="mt-1 text-xs text-uniblex-gray">{formatBytes(zipFile.size)}</p></div>{!uploading && !uploadResult ? <button type="button" onClick={() => onZip(null)} className="rounded-lg p-2 text-uniblex-gray hover:text-white" aria-label="Remove selected ZIP"><X size={18} /></button> : null}</div> : null}{progress ? <ProgressPanel progress={progress} uploading={uploading} onCancel={onCancel} /> : null}{uploadResult ? <DetectedBuild result={uploadResult} /> : null}{!uploadResult ? <button type="button" onClick={onUpload} disabled={!zipFile || uploading} className="btn-primary mt-5 w-full sm:w-auto">{uploading ? <LoaderCircle className="animate-spin" size={18} /> : <CloudUpload size={18} />}{uploading ? "Uploading securely..." : "Start secure upload"}</button> : null}</>}</div>;
}

function ReviewStep({ form, slugPreview, coverPreview, thumbnailPreview, zipFile, uploadResult, enabled }: { form: GameFormState; slugPreview: string; coverPreview: string; thumbnailPreview: string; zipFile: File | null; uploadResult: UploadResultState | null; enabled: boolean }) {
  return <div><StepHeading number="05" title="Review" text="Confirm the listing and authoritative build status before saving or publishing." /><div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="grid gap-4"><ReviewGroup title="Game details" rows={[["Name", form.title], ["Slug", slugPreview], ["Category", form.categoryId || "Not selected"], ["Engine", form.engine], ["Tags", splitTags(form.tags).join(", ") || "None"]]} /><ReviewGroup title="Compatibility" rows={[["Platforms", [form.desktopSupport && "Desktop", form.mobileSupport && "Mobile"].filter(Boolean).join(", ")], ["Orientation", form.orientation], ["Aspect ratio", form.aspectRatio], ["Controls", form.controls]]} /><ReviewGroup title="Build" rows={[["ZIP", zipFile ? `${zipFile.name} - ${formatBytes(zipFile.size)}` : form.engine === "Externally hosted iframe" ? form.iframeUrl : "Not uploaded"], ["Detected type", uploadResult?.buildType || "Not detected"], ["Entry point", uploadResult ? "index.html" : "Not verified"], ["Compression", uploadResult?.compressionMode || "Not detected"], ["Verification", uploadResult ? `${uploadResult.fileCount}/${uploadResult.fileCount} files verified` : enabled ? "Required before publish" : "Unavailable while quarantined"]]} /></div><div><div className="overflow-hidden rounded-xl border border-white/10 bg-black"><div className="relative aspect-video">{coverPreview || thumbnailPreview ? <Image src={coverPreview || thumbnailPreview} alt="Game artwork preview" fill sizes="320px" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-uniblex-gray">No media preview</div>}</div><div className="p-4"><h2 className="font-heading text-xl text-white">{form.title || "Untitled game"}</h2><p className="mt-2 line-clamp-3 text-sm text-uniblex-gray">{form.shortDescription || form.description || "Add a description."}</p></div></div><div className={`mt-4 flex gap-3 rounded-xl border p-4 text-sm ${uploadResult ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-amber-400/25 bg-amber-400/10 text-amber-100"}`}>{uploadResult ? <Check className="shrink-0" /> : <ShieldCheck className="shrink-0" />}<p>{uploadResult ? "Authoritative verification passed. Preview and Publish are available." : "Publish is disabled until every uploaded object passes authoritative verification."}</p></div></div></div></div>;
}

function ProgressPanel({ progress, uploading, onCancel }: { progress: WebglUploadProgress; uploading: boolean; onCancel: () => void }) {
  return <div className="mt-5 rounded-xl border border-uniblex-blue/25 bg-uniblex-blue/[.06] p-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-bold text-white">{progress.phase}</span><span className="font-heading text-uniblex-blue">{progress.percentage}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-gradient-to-r from-uniblex-blue to-uniblex-purple transition-all" style={{ width: `${progress.percentage}%` }} /></div><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-uniblex-gray"><span>{progress.completedFiles}/{progress.totalFiles || "?"} files</span><span>{formatBytes(progress.completedBytes)} / {progress.totalBytes ? formatBytes(progress.totalBytes) : "calculating"}</span>{progress.currentFile ? <span className="max-w-full truncate">{progress.currentFile}</span> : null}</div>{uploading ? <button type="button" onClick={onCancel} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-200 underline"><X size={14} /> Cancel upload safely</button> : null}</div>;
}

function DetectedBuild({ result }: { result: UploadResultState }) {
  return <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4"><div className="flex items-center gap-2 font-bold text-emerald-100"><Check size={18} /> Verification complete</div><dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><ReviewItem label="Detected" value={result.buildType} /><ReviewItem label="Entry" value="index.html" /><ReviewItem label="Compression" value={result.compressionMode} /><ReviewItem label="Files" value={String(result.fileCount)} /></dl></div>;
}

function MediaPicker({ label, guidance, preview, onChange }: { label: string; guidance: string; preview: string; onChange: (file: File | null) => void }) {
  return <label className="cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[.025]"><div className="relative aspect-video bg-black">{preview ? <Image src={preview} alt={`${label} preview`} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-uniblex-gray"><ImagePlus size={30} /></div>}</div><div className="p-4"><span className="text-sm font-bold text-white">{label}</span><span className="mt-1 block text-xs leading-5 text-uniblex-gray">{guidance}</span><span className="mt-3 inline-flex rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-uniblex-blue">Choose image</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => onChange(validateImages(Array.from(event.target.files || []), 1)[0] || null)} /></div></label>;
}

function StepHeading({ number, title, text }: { number: string; title: string; text: string }) { return <div className="flex gap-3"><span className="font-heading text-sm text-uniblex-purple">{number}</span><div><h2 className="font-heading text-2xl text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-uniblex-gray">{text}</p></div></div>; }
function Field({ label, required = false, wide = false, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) { return <label className={`grid content-start gap-2 text-sm font-bold text-white ${wide ? "md:col-span-2" : ""}`}>{label}{required ? <span className="sr-only"> required</span> : null}{children}</label>; }
function Hint({ children }: { children: React.ReactNode }) { return <span className="text-xs font-normal text-uniblex-gray">{children}</span>; }
function ReviewGroup({ title, rows }: { title: string; rows: string[][] }) { return <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><h2 className="font-heading text-lg text-white">{title}</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2">{rows.map(([label, value]) => <ReviewItem key={label} label={label} value={value || "None"} />)}</dl></div>; }
function ReviewItem({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs text-uniblex-gray">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-white">{value.replaceAll("_", " ")}</dd></div>; }

function useObjectUrl(file: File | null, fallback: string) {
  const [url, setUrl] = useState(fallback);
  useEffect(() => { if (!file) { setUrl(fallback); return; } const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file, fallback]);
  return url;
}

function initialForm(game: AdminGameRow | null): GameFormState {
  if (!game) return { ...EMPTY_GAME_FORM };
  const controls = [...(Array.isArray(game.desktop_controls) ? game.desktop_controls : []), ...(Array.isArray(game.mobile_controls) ? game.mobile_controls : [])].map(String).filter(Boolean);
  const engine = String(game.build_metadata?.engine || (game.iframe_url ? "Externally hosted iframe" : game.genre || "HTML5"));
  return { ...EMPTY_GAME_FORM, title: game.title || "", slug: game.slug || "", shortDescription: String(game.build_metadata?.shortDescription || game.description || "").slice(0, 220), description: game.description || "", categoryId: game.category_id || "", tags: (game.tags || []).join(", "), engine: GAME_ENGINES.includes(engine as GameEngine) ? engine as GameEngine : "Other", iframeUrl: game.iframe_url || "", aspectRatio: (game.aspect_ratio as GameFormState["aspectRatio"]) || "16/9", controls: [...new Set(controls)].join("\n"), coverUrl: game.cover_url || "", thumbnailUrl: game.thumbnail_url || "", screenshotUrls: game.screenshot_urls || [] };
}

function controlsPayload(form: GameFormState) { return form.controls.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 30); }
function listingPayload(form: GameFormState, slug: string, media: { coverUrl: string; thumbnailUrl: string; screenshotUrls: string[] }) { return { title: form.title.trim(), slug, description: form.description.trim(), category_id: form.categoryId || null, genre: form.engine, cover_url: media.coverUrl, thumbnail_url: media.thumbnailUrl || media.coverUrl, screenshot_urls: media.screenshotUrls, iframe_url: form.engine === "Externally hosted iframe" ? form.iframeUrl.trim() : null, aspect_ratio: form.aspectRatio, tags: splitTags(form.tags), desktop_controls: form.desktopSupport ? controlsPayload(form) : [], mobile_controls: form.mobileSupport ? controlsPayload(form) : [], build_metadata: { engine: form.engine, shortDescription: form.shortDescription, options: { desktopSupport: form.desktopSupport, mobileSupport: form.mobileSupport, keyboardControls: form.keyboardControls, touchControls: form.touchControls, gamepadSupport: form.gamepadSupport, multiplayer: form.multiplayer, savesProgress: form.savesProgress, orientation: form.orientation, loadingInstructions: form.loadingInstructions } } }; }

async function updateListingOptions(gameId: string, form: GameFormState, screenshotUrls: string[]) {
  if (!supabase) return;
  const { error } = await supabase.from("games").update({ aspect_ratio: form.aspectRatio, screenshot_urls: screenshotUrls, tags: splitTags(form.tags), desktop_controls: form.desktopSupport ? controlsPayload(form) : [], mobile_controls: form.mobileSupport ? controlsPayload(form) : [] }).eq("id", gameId);
  if (error) throw error;
}

async function uploadMedia({ title, slug, coverFile, thumbnailFile, screenshots }: { title: string; slug: string; coverFile: File | null; thumbnailFile: File | null; screenshots: File[] }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Admin session expired. Sign in again.");
  const body = new FormData();
  body.set("title", title); body.set("slug", slug);
  if (coverFile) body.set("coverImage", coverFile);
  if (thumbnailFile) body.set("thumbnailImage", thumbnailFile);
  screenshots.forEach((file) => body.append("screenshots", file));
  const response = await fetch("/api/admin/uploads/game-media", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Media upload failed.");
  return { coverUrl: String(payload.coverUrl || ""), thumbnailUrl: String(payload.thumbnailUrl || ""), screenshotUrls: Array.isArray(payload.screenshotUrls) ? payload.screenshotUrls.map(String) : [] };
}

function validateImages(files: File[], max: number) { return files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 15 * 1024 * 1024).slice(0, max); }
