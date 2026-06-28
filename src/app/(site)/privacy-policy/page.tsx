import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Uniblex privacy policy for analytics, contact forms, ads, and website usage."
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container-pad py-12 md:py-16">
      <article className="mx-auto max-w-4xl rounded-lg border border-uniblex-border bg-white/[.03] p-6 md:p-10">
        <p className="text-uniblex-blue">Last updated: June 28, 2026</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">Privacy Policy</h1>
        <p className="mt-6 leading-8 text-uniblex-gray">
          Uniblex respects visitor privacy. This policy explains how the website may collect, use, and protect information when visitors browse games, read articles, submit contact forms, or interact with analytics and advertising services.
        </p>
        {[
          ["Information We Collect", "We may collect contact form details such as name, email address, subject, and message. We may also collect anonymous analytics information such as visited pages, device type, browser, approximate location, and referral source."],
          ["How We Use Information", "Contact details are used to respond to messages and manage support or collaboration requests. Analytics information is used to improve page speed, content quality, navigation, and overall website performance."],
          ["Cookies and Analytics", "Uniblex may use Google Analytics 4 and similar tools to understand site usage. Visitors can control cookies through their browser settings."],
          ["Advertising", "The website is prepared for Google AdSense or similar ad providers. Advertising partners may use cookies or identifiers to show relevant ads according to their own policies."],
          ["Data Sharing", "Uniblex does not sell personal contact form information. Data may be processed by trusted services such as hosting, analytics, database, storage, and advertising providers when needed to operate the website."],
          ["Contact", "For privacy questions, email hello.uniblex@gmail.com."]
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
