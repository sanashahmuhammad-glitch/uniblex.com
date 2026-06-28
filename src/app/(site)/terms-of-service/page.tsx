import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Uniblex terms of service."
};

export default function TermsPage() {
  return (
    <main className="container-pad py-12 md:py-16">
      <article className="card p-8 md:p-12">
        <h1 className="font-heading text-4xl leading-tight md:text-5xl">Terms of Service</h1>
        <p className="mt-6 leading-8 text-uniblex-gray">
          By using Uniblex, visitors agree to use the platform responsibly. Game content, articles, logos and brand assets belong to their respective owners. Final legal content should be reviewed before launch.
        </p>
        <h2 className="mt-8 font-heading text-2xl">Use of Content</h2>
        <p className="mt-3 leading-8 text-uniblex-gray">Articles and platform content are for educational and entertainment purposes.</p>
        <h2 className="mt-8 font-heading text-2xl">Limitations</h2>
        <p className="mt-3 leading-8 text-uniblex-gray">Uniblex is provided as-is and may change features, games or content at any time.</p>
      </article>
    </main>
  );
}
