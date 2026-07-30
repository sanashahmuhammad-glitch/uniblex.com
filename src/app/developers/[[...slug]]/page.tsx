import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeveloperAuthForm } from "@/components/developers/DeveloperAuthForm";
import { DeveloperWorkspace } from "@/components/developers/DeveloperWorkspace";
import { DeveloperWizard } from "@/components/developers/DeveloperWizard";
import { SupportCenter } from "@/components/developers/SupportCenter";
import { DeveloperLanding, DocumentationContent, GuidelinesContent, SimpleResourcePage } from "@/components/developers/PublicPortalPage";

const privateViews = new Set(["dashboard", "games", "drafts", "submissions", "uploads", "published", "notifications", "profile", "team", "billing"]);
const titles: Record<string, string> = {
  docs: "Documentation", sdk: "SDK", requirements: "Game Requirements", guidelines: "Quality Guidelines",
  unity: "Unity WebGL Guide", html5: "HTML5 Guide", builds: "Build & ZIP Requirements", media: "Media & Artwork Guidelines",
  publishing: "Publishing Process", monetization: "Monetization Overview", faq: "Frequently Asked Questions", support: "Support",
  login: "Developer Login", register: "Developer Registration", recover: "Password Recovery"
};

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const slug = (await params).slug || [];
  const key = slug.join("/");
  const isPrivate = privateViews.has(slug[0] || "") || key === "games/new";
  const title = titles[slug[0] || ""] || (isPrivate ? "Developer Workspace" : "Uniblex Developer Portal");
  return { title, alternates: isPrivate ? undefined : { canonical: `/developers${key ? `/${key}` : ""}` }, robots: isPrivate || ["login", "register", "recover"].includes(slug[0] || "") ? { index: false, follow: false } : { index: true, follow: true } };
}

export default async function DeveloperRoute({ params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug || [];
  const key = slug.join("/");
  if (!key) return <DeveloperLanding />;
  if (key === "login") return <DeveloperAuthForm mode="login" />;
  if (key === "register") return <DeveloperAuthForm mode="register" />;
  if (key === "recover") return <DeveloperAuthForm mode="recover" />;
  if (key === "support") return <SupportCenter />;
  if (key === "games/new") return <DeveloperWizard />;
  if (privateViews.has(key)) {
    const view = key === "drafts" || key === "published" ? "games" : key;
    return <DeveloperWorkspace view={view as "dashboard" | "games" | "submissions" | "uploads" | "notifications" | "profile" | "billing"} />;
  }
  if (["docs", "getting-started", "unity", "html5", "builds"].includes(key)) return <DocumentationContent />;
  if (key === "requirements") return <GuidelinesContent kind="requirements" />;
  if (key === "guidelines") return <GuidelinesContent kind="quality" />;
  if (key === "media") return <GuidelinesContent kind="media" />;
  if (key === "sdk") return <SimpleResourcePage eyebrow="Integration" title="Uniblex SDK" intro="The first SDK release is intentionally small: stable browser lifecycle signals without locking your game to a proprietary runtime." items={[
    { title: "Ready signal", text: "Notify the host when loading is complete and the first playable frame is available. Games must still work if the optional bridge is unavailable." },
    { title: "Pause and resume", text: "Respond to visibility changes and host pause requests by suspending gameplay and audio safely." },
    { title: "Fullscreen", text: "Request fullscreen only from a user gesture and always provide an obvious exit path." },
    { title: "Data boundaries", text: "Do not collect credentials or personal data. Save APIs and monetization hooks will be documented before they become available." }
  ]} />;
  if (key === "publishing") return <SimpleResourcePage eyebrow="Release workflow" title="Publishing process" intro="Every release moves through a controlled, auditable review state." items={[
    { title: "1. Draft", text: "Complete listing details, artwork, compatibility declarations, and a locally validated browser build." },
    { title: "2. Verification", text: "Files upload directly to isolated object storage and are checked against the authoritative manifest." },
    { title: "3. Review", text: "A reviewer tests quality, policy compliance, controls, responsive behavior, and listing accuracy." },
    { title: "4. Decision", text: "Approved releases can be published by an authorized Uniblex role. Changes remain attached to the submission timeline." }
  ]} />;
  if (key === "monetization") return <SimpleResourcePage eyebrow="Business" title="Monetization overview" intro="Uniblex is preparing developer monetization, but revenue sharing and payment collection are not active." items={[
    { title: "No payment details yet", text: "The portal never asks for card, bank, tax, or payout information in this release." },
    { title: "Ads must be approved", text: "Do not embed an advertising SDK or deceptive promotion. Future integrations will use documented host controls." },
    { title: "Transparent rollout", text: "Commercial terms, eligibility, reporting, and payout setup will be presented for explicit acceptance before activation." },
    { title: "Questions", text: "Contact Developer Support for publishing or policy questions; support cannot promise revenue terms." }
  ]} />;
  if (key === "faq") return <SimpleResourcePage eyebrow="Answers" title="Frequently asked questions" intro="Quick answers for common publishing decisions." items={[
    { title: "Which games are supported?", text: "Self-contained HTML5 and Unity WebGL games that run in current desktop browsers; mobile support is optional but must be declared accurately." },
    { title: "Can I use an external host?", text: "External runtime dependencies require review. A complete ZIP is preferred for reliable verification and hosting." },
    { title: "Why must I reselect files?", text: "Browsers do not restore local file bytes after a refresh. The draft keeps metadata and tells you exactly which files need reselection." },
    { title: "How long does review take?", text: "Timing varies with queue depth and game complexity. The portal shows the authoritative status and reviewer feedback." },
    { title: "Can I update a submitted game?", text: "Requested changes can be addressed in a new submission revision. Reviewed snapshots remain auditable." },
    { title: "Who can publish?", text: "Only authorized Uniblex owner or admin roles can publish after approval." }
  ]} />;
  notFound();
}
