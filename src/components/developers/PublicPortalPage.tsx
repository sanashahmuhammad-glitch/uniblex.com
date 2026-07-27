import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, Gamepad2, Gauge, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { DOC_SECTIONS, QUALITY_CHECKS } from "@/lib/developerPortal";

export function DeveloperLanding() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="soft-grid absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid min-h-[720px] max-w-[1440px] items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[.26em] text-uniblex-blue">Uniblex Developer Portal</p>
            <h1 className="max-w-4xl font-heading text-4xl leading-[1.08] text-white sm:text-6xl lg:text-7xl">Ship browser games with <span className="gradient-text">confidence.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-uniblex-gray">Prepare, validate, submit, and follow your game through review in one secure publishing workspace built for independent developers and studios.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/developers/register" className="btn-primary">Start publishing <ArrowRight size={18} /></Link>
              <Link href="/developers/docs" className="btn-secondary">Read the documentation</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-uniblex-gray">
              {["Public documentation", "Direct-to-R2 uploads", "Visible review status"].map((text) => <span key={text} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-uniblex-blue" />{text}</span>)}
            </div>
          </div>
          <PortalPreview />
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-purple">One controlled workflow</p>
          <h2 className="mt-3 font-heading text-3xl text-white sm:text-5xl">From playable build to review-ready release.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Code2, title: "Prepare", text: "Follow original Unity and HTML5 guidance for paths, compression, canvas behavior, and performance." },
            { icon: UploadCloud, title: "Validate", text: "Inspect ZIP structure in the browser, detect engines and entry points, and retry only failed files." },
            { icon: ShieldCheck, title: "Submit", text: "Send media and build bytes directly to R2. Application functions handle authorization, not large files." },
            { icon: Gauge, title: "Track", text: "See verification, review feedback, requested changes, approval, and publication in a clear timeline." }
          ].map(({ icon: Icon, title, text }) => <article key={title} className="card p-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-uniblex-blue/25 to-uniblex-purple/25 text-uniblex-blue"><Icon /></span><h3 className="mt-5 font-heading text-xl text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-uniblex-gray">{text}</p></article>)}
        </div>
      </section>
    </main>
  );
}

function PortalPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-uniblex-blue/20 to-uniblex-purple/20 blur-3xl" />
      <div className="card relative overflow-hidden p-3 shadow-[0_30px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /><span className="ml-3 text-xs text-uniblex-gray">developers.uniblex.com</span></div>
        <div className="grid gap-3 p-3 sm:grid-cols-[.34fr_.66fr]">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="mb-5 flex items-center gap-2 text-sm font-bold text-white"><Gamepad2 size={18} className="text-uniblex-blue" /> Workspace</div>
            {["Overview", "My Games", "Submit a Game", "Submissions"].map((item, index) => <div key={item} className={`mb-2 rounded-lg px-3 py-2 text-xs ${index === 1 ? "bg-uniblex-blue/15 text-white" : "text-uniblex-gray"}`}>{item}</div>)}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {["7 Games", "2 Review", "4 Published"].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-center text-xs font-bold text-white">{item}</div>)}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3"><div className="h-16 w-20 rounded-lg bg-gradient-to-br from-uniblex-blue/50 to-uniblex-purple/50" /><div className="flex-1"><p className="text-sm font-bold text-white">Neon Drift</p><p className="mt-1 text-xs text-uniblex-gray">Build verified · WebGL</p><div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-4/5 rounded-full bg-gradient-to-r from-uniblex-blue to-uniblex-purple" /></div></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">APPROVED</span></div>
            </div>
            <div className="rounded-xl border border-dashed border-white/15 p-5 text-center text-xs text-uniblex-gray"><Sparkles className="mx-auto mb-2 text-uniblex-purple" size={22} />Review feedback stays attached to each release.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentationContent() {
  return (
    <main className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
      <aside className="h-max rounded-2xl border border-white/10 bg-black/20 p-4 lg:sticky lg:top-24">
        <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[.2em] text-uniblex-blue">On this page</p>
        <nav className="grid max-h-[68vh] gap-1 overflow-auto" aria-label="Documentation sections">{DOC_SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`} className="rounded-lg px-3 py-2 text-sm text-uniblex-gray hover:bg-white/5 hover:text-white">{section.title}</a>)}</nav>
      </aside>
      <article className="max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[.24em] text-uniblex-purple">Documentation</p>
        <h1 className="mt-3 font-heading text-4xl text-white sm:text-6xl">Build and publish on Uniblex</h1>
        <p className="mt-5 text-lg leading-8 text-uniblex-gray">A practical reference for packaging stable browser games, presenting them accurately, and moving through review.</p>
        <div className="mt-12 space-y-12">
          {DOC_SECTIONS.map((section) => <section key={section.id} id={section.id} className="scroll-mt-28 border-t border-white/10 pt-8"><h2 className="font-heading text-2xl text-white sm:text-3xl">{section.title}</h2><p className="mt-4 text-base leading-8 text-uniblex-gray">{section.body}</p></section>)}
        </div>
      </article>
    </main>
  );
}

export function GuidelinesContent({ kind = "quality" }: { kind?: "quality" | "requirements" | "media" | "webgl" }) {
  const copy = {
    quality: ["Quality Guidelines", "The baseline every submitted game must meet."],
    requirements: ["Game Requirements", "Technical, content, privacy, and presentation requirements."],
    media: ["Media & Artwork", "Create accurate, high-quality listing assets for every surface."],
    webgl: ["WebGL Build Guidelines", "Package a safe, responsive, and verifiable browser build."]
  }[kind];
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Developer standards</p>
      <h1 className="mt-3 font-heading text-4xl text-white sm:text-6xl">{copy[0]}</h1>
      <p className="mt-5 text-lg text-uniblex-gray">{copy[1]}</p>
      <div className="mt-10 grid gap-3">
        {QUALITY_CHECKS.map((check, index) => <div key={check} className="card flex gap-4 p-5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-uniblex-blue/10 text-sm font-bold text-uniblex-blue">{String(index + 1).padStart(2, "0")}</span><p className="leading-7 text-white/90">{check}</p></div>)}
      </div>
      <div className="mt-10 rounded-2xl border border-uniblex-purple/30 bg-uniblex-purple/10 p-6"><h2 className="font-heading text-xl text-white">Before you submit</h2><p className="mt-3 leading-7 text-uniblex-gray">Test the exact ZIP from a clean browser profile, verify every declared input method, and keep evidence of licenses for artwork, audio, fonts, code, and third-party services.</p></div>
    </main>
  );
}

export function SimpleResourcePage({ eyebrow, title, intro, items }: { eyebrow: string; title: string; intro: string; items: Array<{ title: string; text: string }> }) {
  return <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8"><p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">{eyebrow}</p><h1 className="mt-3 max-w-4xl font-heading text-4xl text-white sm:text-6xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-uniblex-gray">{intro}</p><div className="mt-10 grid gap-4 md:grid-cols-2">{items.map((item) => <section key={item.title} className="card p-6"><h2 className="font-heading text-xl text-white">{item.title}</h2><p className="mt-3 leading-7 text-uniblex-gray">{item.text}</p></section>)}</div></main>;
}

