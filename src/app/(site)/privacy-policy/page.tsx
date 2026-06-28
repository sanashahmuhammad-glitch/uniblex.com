import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Uniblex privacy policy."
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container-pad py-14">
      <article className="card p-8 md:p-12">
        <h1 className="font-heading text-5xl">Privacy Policy</h1>
        <p className="mt-6 leading-8 text-uniblex-gray">
          Uniblex respects user privacy. This page explains how basic contact form information, analytics data and site usage information may be handled. Final legal content should be reviewed before launch.
        </p>
        <h2 className="mt-8 font-heading text-2xl">Information We Collect</h2>
        <p className="mt-3 leading-8 text-uniblex-gray">We may collect basic contact details submitted through forms and anonymous analytics information used to improve the website.</p>
        <h2 className="mt-8 font-heading text-2xl">Contact</h2>
        <p className="mt-3 leading-8 text-uniblex-gray">For privacy questions, contact hello.uniblex@gmail.com.</p>
      </article>
    </main>
  );
}
