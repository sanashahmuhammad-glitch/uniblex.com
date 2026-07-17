import { AlertTriangle, CheckCircle2, Clock3, Database, ShieldCheck } from "lucide-react";
import { formatBytes } from "@/components/admin/adminUploadLogic";
import type { AdminUploadOperation } from "@/components/admin/adminPortalTypes";

export function AdminUploadHistory({ operations }: { operations: AdminUploadOperation[] }) {
  return (
    <section aria-labelledby="upload-history-heading">
      <p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">Audit trail</p>
      <h1 id="upload-history-heading" className="mt-2 font-heading text-3xl text-white sm:text-4xl">Upload History</h1>
      <p className="mt-2 text-sm text-uniblex-gray">Authoritative owner-bound MVP operations, newest first.</p>
      <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#111822]/80">
        {operations.length ? (
          <div className="grid gap-3 p-3 sm:p-4">
            {operations.map((operation) => {
              const verified = operation.verified_file_count === operation.file_count && operation.file_count > 0;
              return (
                <article key={operation.id} className="grid gap-4 rounded-xl border border-white/10 bg-white/[.025] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {verified ? <CheckCircle2 size={18} className="text-emerald-300" /> : operation.state === "failed" ? <AlertTriangle size={18} className="text-red-300" /> : <Clock3 size={18} className="text-amber-200" />}
                      <h2 className="font-bold text-white">{operation.slug}</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-uniblex-gray">{operation.state.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-2 truncate font-mono text-[11px] text-uniblex-gray">Operation {operation.id}</p>
                    {operation.last_error_message ? <p className="mt-2 text-sm text-red-200">{operation.last_error_message}</p> : null}
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                    <Item label="Detected" value={operation.build_type} />
                    <Item label="Compression" value={operation.compression_mode} />
                    <Item label="Files" value={`${operation.verified_file_count}/${operation.file_count}`} />
                    <Item label="Size" value={formatBytes(operation.total_bytes)} />
                  </dl>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center p-8 text-center"><div><Database size={38} className="mx-auto text-uniblex-blue" /><h2 className="mt-4 font-heading text-2xl text-white">No upload operations yet</h2><p className="mt-2 text-sm text-uniblex-gray">Secure WebGL operations will appear here after initiation.</p></div></div>
        )}
      </div>
      <div className="mt-5 flex gap-3 rounded-xl border border-uniblex-blue/20 bg-uniblex-blue/[.06] p-4 text-sm text-uniblex-gray"><ShieldCheck className="shrink-0 text-uniblex-blue" size={20} /><p>History is read through owner-scoped RLS. Signed upload URLs and credentials are never displayed.</p></div>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-uniblex-gray">{label}</dt><dd className="mt-1 max-w-32 truncate font-semibold text-white">{value.replaceAll("_", " ")}</dd></div>;
}
