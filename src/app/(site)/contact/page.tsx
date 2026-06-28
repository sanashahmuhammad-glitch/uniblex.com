import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Uniblex for games, articles, feedback and collaboration."
};

export default function ContactPage() {
  return (
    <main className="container-pad py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-uniblex-blue">Contact</p>
          <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">Get in Touch</h1>
          <p className="mt-5 text-uniblex-gray">For feedback, collaborations or platform updates, contact Uniblex through the form.</p>
        </div>
        <form className="card grid gap-4 p-6">
          <input className="rounded-2xl border border-uniblex-border bg-uniblex-bg px-4 py-3 outline-none focus:border-uniblex-blue" placeholder="Your name" />
          <input type="email" className="rounded-2xl border border-uniblex-border bg-uniblex-bg px-4 py-3 outline-none focus:border-uniblex-blue" placeholder="Email address" />
          <textarea rows={6} className="rounded-2xl border border-uniblex-border bg-uniblex-bg px-4 py-3 outline-none focus:border-uniblex-blue" placeholder="Message" />
          <button type="button" className="btn-primary">Send Message</button>
        </form>
      </div>
    </main>
  );
}
