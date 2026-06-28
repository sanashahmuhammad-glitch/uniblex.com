import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Uniblex terms of service for games, articles, and website use."
};

export default function TermsPage() {
  return (
    <main className="container-pad py-12 md:py-16">
      <article className="mx-auto max-w-4xl rounded-lg border border-uniblex-border bg-white/[.03] p-6 md:p-10">
        <p className="text-uniblex-blue">Last updated: June 28, 2026</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">Terms of Service</h1>
        <p className="mt-6 leading-8 text-uniblex-gray">
          By using Uniblex, visitors agree to use the website responsibly. These terms apply to games, articles, tutorials, contact forms, and any related website features.
        </p>
        {[
          ["Use of Website", "Visitors may browse articles and play available browser games for personal, educational, and entertainment purposes. Users must not attempt to disrupt, reverse engineer, abuse, or overload the website."],
          ["Content Ownership", "Uniblex branding, articles, platform design, and original website content belong to Uniblex and Mohsin Shah unless otherwise stated. Game files, images, and assets remain the property of their respective owners."],
          ["Game Availability", "Games may be added, updated, removed, or marked coming soon at any time. Browser compatibility can vary by device, operating system, and web browser."],
          ["Contact Submissions", "Visitors are responsible for submitting accurate information through contact forms. Spam, harmful links, or abusive messages may be ignored or removed."],
          ["Advertising and Third Parties", "Uniblex may display advertisements or link to external services. Third-party websites and providers have their own terms and privacy policies."],
          ["Contact", "For terms-related questions, email hello.uniblex@gmail.com."]
        ].map(([title, body]) => (
          <section key={title} className="mt-8">
            <h2 className="font-heading text-2xl">{title}</h2>
            <p className="mt-3 leading-8 text-uniblex-gray">{body}</p>
          </section>
        ))}
      </article>
    </main>
  );
}
