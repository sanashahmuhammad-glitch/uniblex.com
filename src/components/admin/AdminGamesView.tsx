"use client";

import Image from "next/image";
import { Eye, FileEdit, Gamepad2, Plus, RefreshCw, Rocket, Search, Trash2, Undo2 } from "lucide-react";
import type { AdminGameRow, AdminUploadOperation } from "@/components/admin/adminPortalTypes";

type AdminGamesViewProps = {
  games: AdminGameRow[];
  operations: AdminUploadOperation[];
  loading: boolean;
  error: string;
  busyGameId: string;
  onRetry: () => void;
  onSubmit: () => void;
  onEdit: (game: AdminGameRow) => void;
  onPublish: (operation: AdminUploadOperation) => void;
  onUnpublish: (game: AdminGameRow) => void;
};

export function AdminGamesView({ games, operations, loading, error, busyGameId, onRetry, onSubmit, onEdit, onPublish, onUnpublish }: AdminGamesViewProps) {
  const operationByGame = new Map(operations.map((operation) => [operation.game_id, operation]));

  return (
    <section aria-labelledby="my-games-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">Game management</p>
          <h1 id="my-games-heading" className="mt-2 font-heading text-3xl text-white sm:text-4xl">My Games</h1>
          <p className="mt-2 text-sm text-uniblex-gray">Review builds, preview verified uploads, and control publishing.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onSubmit}><Plus size={18} /> Submit a Game</button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric label="Total games" value={games.length} />
        <Metric label="Published" value={games.filter((game) => game.status === "published").length} accent="text-emerald-300" />
        <Metric label="Builds verified" value={operations.filter((operation) => ["ready_for_preview", "previewed", "published"].includes(operation.state)).length} accent="text-uniblex-blue" />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111822]/80 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Gamepad2 size={18} className="text-uniblex-blue" /> Game library</div>
          <button type="button" onClick={onRetry} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-uniblex-gray transition hover:border-uniblex-blue/50 hover:text-white disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-5" role="alert">
            <p className="font-bold text-red-100">Games could not be loaded.</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
            <button type="button" onClick={onRetry} className="mt-4 text-sm font-bold text-white underline">Try again</button>
          </div>
        ) : loading ? (
          <div className="grid gap-3 p-4" aria-label="Loading games">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-white/[.04]" />)}</div>
        ) : games.length === 0 ? (
          <div className="grid min-h-[360px] place-items-center p-8 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-uniblex-blue/20 bg-uniblex-blue/10 text-uniblex-blue"><Search size={30} /></span>
              <h2 className="mt-5 font-heading text-2xl text-white">No games submitted yet</h2>
              <p className="mt-2 text-sm leading-6 text-uniblex-gray">Start with game details, add polished media, then upload a build through the verified publishing flow.</p>
              <button type="button" onClick={onSubmit} className="btn-primary mt-6">Submit a Game</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-3 sm:p-4">
            {games.map((game) => {
              const operation = operationByGame.get(game.id);
              const previewUrl = game.preview_url || game.iframe_url;
              const publishable = operation && ["ready_for_preview", "previewed"].includes(operation.state);
              const engine = operation?.build_type ? friendlyBuildType(operation.build_type) : String(game.build_metadata?.engine || (game.iframe_url ? "External iframe" : "Not detected"));
              const busy = busyGameId === game.id;
              return (
                <article key={game.id} className="grid gap-4 rounded-xl border border-white/10 bg-white/[.025] p-4 transition hover:border-uniblex-blue/30 xl:grid-cols-[112px_minmax(0,1fr)_auto] xl:items-center">
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[#080b10] xl:h-[72px] xl:w-28">
                    {game.thumbnail_url || game.cover_url ? <Image src={String(game.thumbnail_url || game.cover_url)} alt={`${game.title} thumbnail`} fill sizes="112px" className="object-cover" unoptimized /> : <div className="grid h-full place-items-center text-uniblex-gray"><Gamepad2 size={25} /></div>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-bold text-white">{game.title}</h2>
                      <StatusBadge value={game.status || "draft"} />
                      <StatusBadge value={game.build_status || "none"} muted />
                    </div>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                      <Meta label="Engine" value={engine} />
                      <Meta label="Build" value={operation?.state || game.build_status || "none"} />
                      <Meta label="Updated" value={formatDate(game.updated_at || game.created_at)} />
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:max-w-[330px] xl:justify-end">
                    {previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer" className="portal-action"><Eye size={14} /> Preview</a> : <button type="button" className="portal-action opacity-50" disabled title="Preview becomes available after verification"><Eye size={14} /> Preview</button>}
                    <button type="button" className="portal-action" onClick={() => onEdit(game)} disabled={busy}><FileEdit size={14} /> Edit</button>
                    {game.status === "published" ? <button type="button" className="portal-action" onClick={() => onUnpublish(game)} disabled={busy}><Undo2 size={14} /> Unpublish</button> : <button type="button" className="portal-action" onClick={() => publishable && onPublish(operation)} disabled={!publishable || busy} title={publishable ? "Publish verified build" : "Publish requires authoritative verification"}><Rocket size={14} /> Publish</button>}
                    <button type="button" className="portal-action cursor-not-allowed opacity-45" disabled title="Coming soon: secure deletion for verified MVP builds"><Trash2 size={14} /> Delete · Coming soon</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, accent = "text-white" }: { label: string; value: number; accent?: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.035] p-4"><p className="text-xs font-semibold uppercase tracking-[.16em] text-uniblex-gray">{label}</p><p className={`mt-2 font-heading text-3xl ${accent}`}>{value}</p></div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-uniblex-gray">{label}</dt><dd className="mt-1 truncate font-semibold text-white/90">{value.replaceAll("_", " ")}</dd></div>;
}

function StatusBadge({ value, muted = false }: { value: string; muted?: boolean }) {
  const positive = ["published", "ready", "ready_for_preview", "previewed"].includes(value);
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${positive ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : muted ? "border-white/10 bg-white/5 text-uniblex-gray" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>{value.replaceAll("_", " ")}</span>;
}

function friendlyBuildType(value: string) {
  if (value.startsWith("unity")) return `Unity (${value.replace("unity-", "")})`;
  return value === "html5" ? "HTML5" : value;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}
