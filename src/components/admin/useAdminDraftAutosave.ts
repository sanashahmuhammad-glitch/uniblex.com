"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAdminSubmissionDraft,
  deleteAdminSubmissionDraft,
  isMeaningfulAdminDraft,
  saveAdminSubmissionDraft,
  type AdminSubmissionDraft,
  type PersistedBuildResult,
  type PersistedMediaSelection
} from "@/lib/adminSubmissionDraft";
import { cleanupGameMedia, type VerifiedGameMedia } from "@/lib/gameMediaUploadClient";
import type { GameFormState } from "@/components/admin/adminUploadLogic";
import type { GameMediaRole } from "@/lib/r2GameMedia";

type Selection = { role: GameMediaRole; file: File };

export function useAdminDraftAutosave(options: {
  ownerId: string;
  initialDraft: AdminSubmissionDraft | null;
  enabled: boolean;
  step: number;
  form: GameFormState;
  selections: Selection[];
  verifiedMedia: VerifiedGameMedia[];
  zipFile: File | null;
  restoredZip: AdminSubmissionDraft["zip"];
  buildResult: PersistedBuildResult | null;
  uploading: boolean;
  onSaved: (draft: AdminSubmissionDraft) => void;
}) {
  const baseRef = useRef<AdminSubmissionDraft>(options.initialDraft || createAdminSubmissionDraft(options.ownerId));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(options.initialDraft ? "saved" : "idle");
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const latestRef = useRef<AdminSubmissionDraft>(baseRef.current);
  const instanceId = useRef(crypto.randomUUID());
  const persistRef = useRef<() => Promise<void>>(async () => undefined);
  const clearedRef = useRef(false);

  const snapshot = useCallback(() => {
    const now = new Date().toISOString();
    const verifiedByRole = new Map(options.verifiedMedia.map((item) => [item.role, item]));
    const selectionByRole = new Map(options.selections.map((item) => [item.role, item.file]));
    const roles = new Set<GameMediaRole>([
      ...options.verifiedMedia.map((item) => item.role),
      ...options.selections.map((item) => item.role)
    ]);
    const media: PersistedMediaSelection[] = [];
    for (const role of roles) {
      const verified = verifiedByRole.get(role);
      const selected = selectionByRole.get(role);
      if (verified && (!selected || sameFile(selected, verified))) media.push({ ...verified, status: "verified" });
      else if (selected) media.push({ role, name: selected.name, contentType: selected.type, size: selected.size, lastModified: selected.lastModified, status: "needs-reselection" });
    }
    const zip = options.buildResult && (options.zipFile || options.restoredZip)
      ? { name: options.zipFile?.name || options.restoredZip?.name || "build.zip", contentType: options.zipFile?.type || options.restoredZip?.contentType || "application/zip", size: options.zipFile?.size || options.restoredZip?.size || 1, lastModified: options.zipFile?.lastModified || options.restoredZip?.lastModified || 0, status: "verified" as const }
      : options.zipFile
        ? { name: options.zipFile.name, contentType: options.zipFile.type, size: options.zipFile.size, lastModified: options.zipFile.lastModified, status: "needs-reselection" as const }
        : options.restoredZip;
    return {
      ...baseRef.current,
      updatedAt: now,
      currentStep: options.step,
      form: options.form,
      media,
      zip,
      buildResult: options.buildResult
    } satisfies AdminSubmissionDraft;
  }, [options.buildResult, options.form, options.restoredZip, options.selections, options.step, options.verifiedMedia, options.zipFile]);

  const persist = useCallback(async () => {
    if (!options.enabled || conflict || clearedRef.current) return;
    const next = snapshot();
    latestRef.current = next;
    if (!isMeaningfulAdminDraft(next)) return;
    setSaveState("saving");
    try {
      const saved = await saveAdminSubmissionDraft(next);
      baseRef.current = saved;
      latestRef.current = saved;
      setDirty(false);
      setSaveState("saved");
      options.onSaved(saved);
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(`uniblex-admin-draft:${options.ownerId}`);
        channel.postMessage({ instanceId: instanceId.current, draftId: saved.draftId, updatedAt: saved.updatedAt });
        channel.close();
      }
    } catch {
      setSaveState("error");
    }
  }, [conflict, options.enabled, options.onSaved, options.ownerId, snapshot]);
  persistRef.current = persist;

  useEffect(() => {
    const saveWhenHidden = () => { if (document.visibilityState === "hidden") void persistRef.current(); };
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => { document.removeEventListener("visibilitychange", saveWhenHidden); void persistRef.current(); };
  }, []);



  useEffect(() => {
    if (!options.enabled) return;
    setDirty(true);
    setSaveState((current) => current === "error" ? current : "idle");
    const timer = window.setTimeout(() => void persist(), 500);
    return () => window.clearTimeout(timer);
  }, [options.enabled, options.step, options.form, options.selections, options.verifiedMedia, options.zipFile, options.buildResult, persist]);

  useEffect(() => {
    if (!options.enabled) return;
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(`uniblex-admin-draft:${options.ownerId}`);
    channel.onmessage = (event) => {
      const message = event.data as Record<string, unknown>;
      if (message.instanceId === instanceId.current || message.draftId !== baseRef.current.draftId) return;
      if (Date.parse(String(message.updatedAt || "")) > Date.parse(baseRef.current.updatedAt)) setConflict(true);
    };
    return () => channel.close();
  }, [options.enabled, options.ownerId]);

  useEffect(() => {
    if (!options.enabled || (!dirty && !options.uploading)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, options.enabled, options.uploading]);

  const discard = useCallback(async () => {
    const draft = snapshot();
    const keys = draft.buildResult ? [] : draft.media.map((item) => item.objectKey).filter((key): key is string => Boolean(key));
    await cleanupGameMedia(draft.draftId, keys);
    clearedRef.current = true;
    await deleteAdminSubmissionDraft(options.ownerId, draft.draftId);
  }, [options.ownerId, snapshot]);
  const clearDraftOnly = useCallback(async () => {
    clearedRef.current = true;
    await deleteAdminSubmissionDraft(options.ownerId, baseRef.current.draftId);
  }, [options.ownerId]);

  return { draftId: baseRef.current.draftId, saveState, conflict, persist, discard, clearDraftOnly };
}

function sameFile(file: File, verified: VerifiedGameMedia) {
  return file.name === verified.name && file.size === verified.size && file.type === verified.contentType && file.lastModified === verified.lastModified;
}
