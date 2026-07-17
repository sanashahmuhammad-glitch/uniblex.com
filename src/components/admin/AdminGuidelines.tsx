import { Archive, CheckCircle2, FileImage, FolderOpen, ShieldCheck } from "lucide-react";

const guidelines = [
  { icon: Archive, title: "Prepare one ZIP", text: "Include exactly one index.html. A single wrapper folder is fine; nested archives and unsafe paths are rejected." },
  { icon: FolderOpen, title: "Keep build references local", text: "Every local script, stylesheet, WASM, data, and Unity loader reference must exist inside the submitted game root." },
  { icon: FileImage, title: "Use production-ready media", text: "Use JPG, PNG, or WebP. Recommended cover: 1600×900. Card thumbnail: 640×360. Keep important content centered." },
  { icon: ShieldCheck, title: "Verification controls publishing", text: "Publishing is enabled only after the authoritative R2 size and SHA-256 checks pass for every uploaded object." }
];

export function AdminGuidelines() {
  return (
    <section aria-labelledby="guidelines-heading">
      <p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">Documentation</p>
      <h1 id="guidelines-heading" className="mt-2 font-heading text-3xl text-white sm:text-4xl">Submission Guidelines</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-uniblex-gray">A clean build and complete listing make review faster. The secure uploader inspects files locally before anything is sent.</p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {guidelines.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-white/10 bg-[#111822]/80 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-uniblex-blue/20 to-uniblex-purple/20 text-uniblex-blue"><Icon size={22} /></span><h2 className="mt-4 font-heading text-xl text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-uniblex-gray">{text}</p></article>)}
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <h2 className="font-heading text-xl text-white">Before you submit</h2>
        <ul className="mt-4 grid gap-3 text-sm text-uniblex-gray sm:grid-cols-2">
          {["Game loads from index.html without a development server", "Desktop and mobile support accurately declared", "Controls are clear and tested", "No secrets, source maps, or private files in the ZIP", "Media is licensed and free of third-party branding", "Descriptions and tags match the actual game"].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-300" />{item}</li>)}
        </ul>
      </div>
    </section>
  );
}
