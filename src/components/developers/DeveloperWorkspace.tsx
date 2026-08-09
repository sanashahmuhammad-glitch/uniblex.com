"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  Clock3,
  FileEdit,
  Gamepad2,
  LifeBuoy,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  PRIVATE_PORTAL_NAV,
  readableStatus,
  STATUS_COPY,
} from "@/lib/developerPortal";
import { supabase } from "@/lib/supabase";

export type SubmissionRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  engine: string | null;
  updated_at: string;
  build_verified: boolean;
  cover_url: string | null;
  short_description: string | null;
  game_id?: string | null;
  parent_submission_id?: string | null;
  revision_number?: number;
  active_update_id?: string | null;
  games?:
    | {
        view_count?: number | null;
        play_count?: number | null;
        published_at?: string | null;
      }
    | Array<{
        view_count?: number | null;
        play_count?: number | null;
        published_at?: string | null;
      }>
    | null;
  submission_reviews?: Array<{
    decision: string;
    developer_feedback: string | null;
    created_at: string;
  }>;
};

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function DeveloperWorkspace({
  view,
}: {
  view:
    | "dashboard"
    | "games"
    | "submissions"
    | "uploads"
    | "notifications"
    | "profile"
    | "team"
    | "billing"
    | "analytics";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setChecking(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        router.replace(
          `/developers/login?next=${encodeURIComponent(pathname)}`,
        );
        return;
      }
      setUser(data.session.user);
      const response = await fetch("/api/developer/submissions", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          submissions?: SubmissionRow[];
          notifications?: NotificationRow[];
        };
        setRows(payload.submissions || []);
        setNotifications(payload.notifications || []);
      }
      setChecking(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/developers/login");
  }

  async function createUpdate(row: SubmissionRow) {
    if (row.active_update_id) {
      router.push(`/developers/games/new?draft=${row.active_update_id}`);
      return;
    }
    setUpdatingId(row.id);
    setWorkspaceMessage("");
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session) throw new Error("Authentication expired. Sign in again.");
      const response = await fetch("/api/developer/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "create_update", id: row.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        submission?: { id?: string };
        error?: string;
      };
      if (!response.ok || !payload.submission?.id)
        throw new Error(payload.error || "A game update could not be created.");
      router.push(`/developers/games/new?draft=${payload.submission.id}`);
    } catch (error) {
      setWorkspaceMessage(
        error instanceof Error
          ? error.message
          : "A game update could not be created.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (checking)
    return (
      <main className="grid min-h-[70vh] place-items-center">
        <div className="card p-7 text-uniblex-gray">
          Checking developer access…
        </div>
      </main>
    );
  if (!user)
    return (
      <main className="grid min-h-[70vh] place-items-center">
        <div className="card p-7 text-uniblex-gray">
          Developer authentication is required.
        </div>
      </main>
    );

  const content =
    view === "dashboard" ? (
      <Dashboard
        rows={rows}
        onCreateUpdate={createUpdate}
        updatingId={updatingId}
      />
    ) : view === "games" || view === "submissions" ? (
      <GamesTable
        rows={rows}
        query={query}
        setQuery={setQuery}
        status={status}
        setStatus={setStatus}
        onCreateUpdate={createUpdate}
        updatingId={updatingId}
      />
    ) : view === "profile" ? (
      <ProfileForm user={user} />
    ) : view === "billing" ? (
      <Billing />
    ) : view === "team" ? (
      <Team />
    ) : view === "analytics" ? (
      <Analytics rows={rows} />
    ) : view === "uploads" ? (
      <Uploads rows={rows} />
    ) : (
      <Notifications notifications={notifications} />
    );

  return (
    <div className="min-h-screen bg-[#0D1118]">
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-uniblex-blue to-uniblex-purple text-white shadow-xl lg:hidden"
        aria-label="Open workspace menu"
      >
        <Menu />
      </button>
      {menuOpen ? (
        <button
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close workspace menu"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[285px] flex-col border-r border-white/10 bg-[#090d14] p-5 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/developers"
            className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-uniblex-blue"
            aria-label="Uniblex Developer Portal home"
          >
            <Image
              src="/brand/developer-icon.png"
              alt=""
              width={512}
              height={512}
              className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_0_16px_rgba(39,190,255,.22)]"
              priority
            />
            <span className="border-l border-white/15 pl-3 text-sm font-extrabold uppercase leading-[1.05] tracking-[.08em] text-white transition group-hover:text-uniblex-blue">
              Developer
              <br />
              Portal
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-2 text-uniblex-gray transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[.035] p-3">
          <p className="truncate text-sm font-bold text-white">
            {user.user_metadata?.studio_name || user.email}
          </p>
          <p className="mt-1 text-xs text-uniblex-gray">Developer account</p>
        </div>
        <nav className="mt-6 grid gap-1" aria-label="Developer workspace">
          {PRIVATE_PORTAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${pathname === item.href ? "bg-gradient-to-r from-uniblex-blue/20 to-uniblex-purple/10 text-white ring-1 ring-uniblex-blue/25" : "text-uniblex-gray hover:bg-white/5 hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-uniblex-gray">
            Resources
          </p>
          <div className="mt-2 grid gap-1">
            <Link
              href="/developers/docs"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-uniblex-gray hover:bg-white/5 hover:text-white"
            >
              <BookOpen size={15} />
              Documentation
            </Link>
            <Link
              href="/developers/guidelines"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-uniblex-gray hover:bg-white/5 hover:text-white"
            >
              <ShieldCheck size={15} />
              Quality guidelines
            </Link>
            <Link
              href="/developers/support"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-uniblex-gray hover:bg-white/5 hover:text-white"
            >
              <LifeBuoy size={15} />
              Support
            </Link>
          </div>
        </div>
        <div className="mt-auto pt-5">
          <button
            onClick={() => void signOut()}
            className="btn-secondary w-full !min-h-10 text-sm"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-h-screen p-5 sm:p-8 lg:ml-[285px] lg:p-10">
        {workspaceMessage ? (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100"
          >
            {workspaceMessage}
          </p>
        ) : null}
        {content}
      </main>
    </div>
  );
}

function Dashboard({
  rows,
  onCreateUpdate,
  updatingId,
}: {
  rows: SubmissionRow[];
  onCreateUpdate: (row: SubmissionRow) => void;
  updatingId: string | null;
}) {
  const gameKeys = new Set(
    rows
      .filter((row) => row.status !== "archived")
      .map(
        (row) =>
          row.game_id ||
          `${row.slug}:${row.parent_submission_id ? "revision" : "new"}`,
      ),
  );
  const stats = [
    ["Total games", gameKeys.size],
    ["Drafts", rows.filter((row) => row.status === "draft").length],
    [
      "Under review",
      rows.filter((row) => ["submitted", "under_review"].includes(row.status))
        .length,
    ],
    [
      "Changes",
      rows.filter((row) => row.status === "changes_requested").length,
    ],
    ["Approved", rows.filter((row) => row.status === "approved").length],
    ["Published", rows.filter((row) => row.status === "published").length],
    ["Rejected", rows.filter((row) => row.status === "rejected").length],
    ["Build verified", rows.filter((row) => row.build_verified).length],
  ];
  return (
    <>
      <PageHeading
        eyebrow="Developer workspace"
        title="Publishing overview"
        action={
          <Link href="/developers/games/new" className="btn-primary">
            <UploadCloud size={18} /> Submit a game
          </Link>
        }
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-sm text-uniblex-gray">{label}</p>
            <p className="mt-2 font-heading text-3xl text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-white">
              Recent submissions
            </h2>
            <Link
              href="/developers/submissions"
              className="text-sm font-bold text-uniblex-blue"
            >
              View all
            </Link>
          </div>
          <div className="mt-5">
            {rows.length ? (
              rows
                .slice(0, 5)
                .map((row) => (
                  <SubmissionItem
                    key={row.id}
                    row={row}
                    onCreateUpdate={onCreateUpdate}
                    updatingId={updatingId}
                  />
                ))
            ) : (
              <EmptyState
                title="No games yet"
                text="Start a private draft and work through the five submission steps."
              />
            )}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="font-heading text-xl text-white">Release readiness</h2>
          <div className="mt-5 space-y-4">
            {[
              "Studio profile",
              "Game details",
              "Media validation",
              "Build verification",
              "Content declaration",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${index === 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-uniblex-gray"}`}
                >
                  {index === 0 ? "✓" : index + 1}
                </span>
                <span className="text-sm text-white">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function GamesTable({
  rows,
  query,
  setQuery,
  status,
  setStatus,
  onCreateUpdate,
  updatingId,
}: {
  rows: SubmissionRow[];
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  onCreateUpdate: (row: SubmissionRow) => void;
  updatingId: string | null;
}) {
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          `${row.title} ${row.slug}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "all" || row.status === status),
      ),
    [query, rows, status],
  );
  return (
    <>
      <PageHeading
        eyebrow="Portfolio"
        title="My games"
        action={
          <Link href="/developers/games/new" className="btn-primary">
            New submission
          </Link>
        }
      />
      <div className="card mt-8 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative">
            <Search
              size={18}
              className="absolute left-3 top-3.5 text-uniblex-gray"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or slug"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-white outline-none focus:border-uniblex-blue"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="admin-select min-h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_COPY).map(([value, copy]) => (
              <option key={value} value={value}>
                {copy.label}
              </option>
            ))}
          </select>
          <button className="btn-secondary !min-h-12 !px-4">
            <SlidersHorizontal size={18} /> Updated newest
          </button>
        </div>
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        {filtered.length ? (
          filtered.map((row) => (
            <SubmissionItem
              key={row.id}
              row={row}
              detailed
              onCreateUpdate={onCreateUpdate}
              updatingId={updatingId}
            />
          ))
        ) : (
          <EmptyState
            title="Nothing matches"
            text="Adjust the search or status filter, or create a new submission."
          />
        )}
      </section>
      <p className="mt-4 text-sm text-uniblex-gray">
        Showing {filtered.length} of {rows.length} · Page 1
      </p>
    </>
  );
}

function SubmissionItem({
  row,
  detailed = false,
  onCreateUpdate,
  updatingId,
}: {
  row: SubmissionRow;
  detailed?: boolean;
  onCreateUpdate: (row: SubmissionRow) => void;
  updatingId: string | null;
}) {
  const metrics = Array.isArray(row.games) ? row.games[0] : row.games;
  const editable = ["draft", "changes_requested", "rejected"].includes(
    row.status,
  );
  return (
    <article className="flex flex-col gap-4 border-b border-white/10 p-4 last:border-0 sm:flex-row sm:items-center">
      <div className="relative grid h-16 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-uniblex-blue/25 to-uniblex-purple/25">
        {row.cover_url ? (
          <Image
            src={row.cover_url}
            alt=""
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <Gamepad2 className="text-white/70" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-white">{row.title}</h3>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-uniblex-gray">
            {readableStatus(row.status)}
          </span>
          {row.parent_submission_id ? (
            <span className="rounded-full bg-uniblex-blue/10 px-2 py-1 text-[10px] font-bold text-uniblex-blue">
              UPDATE R{row.revision_number || 2}
            </span>
          ) : null}
          {row.build_verified ? (
            <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
              BUILD VERIFIED
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-uniblex-gray">
          /{row.slug} · {row.engine || "Engine not set"} · Updated{" "}
          {new Date(row.updated_at).toLocaleDateString()}
        </p>
        {metrics ? (
          <p className="mt-1 text-xs text-uniblex-gray">
            {Number(metrics.view_count || 0).toLocaleString()} views ·{" "}
            {Number(metrics.play_count || 0).toLocaleString()} plays
          </p>
        ) : null}
        {detailed && row.short_description ? (
          <p className="mt-2 line-clamp-1 text-sm text-white/70">
            {row.short_description}
          </p>
        ) : null}
        {detailed && latestFeedback(row) ? (
          <p className="mt-2 rounded-lg border border-uniblex-purple/20 bg-uniblex-purple/10 p-3 text-sm text-white">
            <span className="font-bold">Reviewer feedback:</span>{" "}
            {latestFeedback(row)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {row.status === "published" ? (
          <>
            <Link
              href={`/games/${row.slug}`}
              className="btn-secondary !min-h-10 !px-3 text-sm"
            >
              Open live game <ChevronRight size={16} />
            </Link>
            <button
              type="button"
              disabled={updatingId === row.id}
              onClick={() => onCreateUpdate(row)}
              className="btn-primary !min-h-10 !px-3 text-sm disabled:opacity-50"
            >
              <FileEdit size={16} />
              {updatingId === row.id
                ? "Opening…"
                : row.active_update_id
                  ? "Continue update"
                  : "Create update"}
            </button>
          </>
        ) : (
          <Link
            href={`/developers/games/new?draft=${row.id}`}
            className="btn-secondary !min-h-10 !px-3 text-sm"
          >
            {editable ? (
              <>
                <FileEdit size={16} /> Continue submission
              </>
            ) : (
              <>
                View submission <ChevronRight size={16} />
              </>
            )}
          </Link>
        )}
      </div>
    </article>
  );
}

function latestFeedback(row: SubmissionRow) {
  return (
    [...(row.submission_reviews || [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .find((review) => review.developer_feedback)?.developer_feedback || ""
  );
}

function Uploads({ rows }: { rows: SubmissionRow[] }) {
  return (
    <>
      <PageHeading eyebrow="Storage activity" title="Upload history" />
      <section className="card mt-8 p-6">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-4 border-b border-white/10 py-4 last:border-0"
            >
              <Clock3 className="text-uniblex-blue" />
              <div>
                <p className="font-bold text-white">{row.title}</p>
                <p className="text-sm text-uniblex-gray">
                  {row.build_verified
                    ? "Build verification complete"
                    : "No verified build"}{" "}
                  · {new Date(row.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No upload operations"
            text="Media and build transfers will appear here with their exact phase and result."
          />
        )}
      </section>
    </>
  );
}

function Notifications({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  return (
    <>
      <PageHeading eyebrow="Activity" title="Notifications" />
      <section className="card mt-8 p-6">
        {notifications.length ? (
          notifications.map((item) => (
            <article
              key={item.id}
              className="flex gap-4 border-b border-white/10 py-4 last:border-0"
            >
              <Bell
                className={
                  item.read_at ? "text-uniblex-gray" : "text-uniblex-purple"
                }
              />
              <div>
                <p className="font-bold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-uniblex-gray">{item.body}</p>
                <p className="mt-2 text-xs text-uniblex-gray">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="You’re all caught up"
            text="Submission and support updates will appear here."
          />
        )}
      </section>
    </>
  );
}

function ProfileForm({ user }: { user: User }) {
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<Record<string, string>>({
    display_name: String(user.user_metadata?.display_name || ""),
  });
  useEffect(() => {
    void (async () => {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session) return;
      const response = await fetch("/api/developer/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return setMessage("Profile could not be loaded.");
      const payload = (await response.json()) as {
        profile?: Record<string, unknown>;
      };
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(payload.profile || {}))
        next[key] =
          key === "social_links"
            ? socialText(value)
            : typeof value === "string"
              ? value
              : "";
      setProfile((current) => ({ ...current, ...next }));
    })();
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data } = await supabase!.auth.getSession();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/developer/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      profile?: Record<string, unknown>;
      error?: string;
    };
    if (response.ok && payload.profile) {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(payload.profile))
        next[key] =
          key === "social_links"
            ? socialText(value)
            : typeof value === "string"
              ? value
              : "";
      setProfile(next);
    }
    setMessage(
      response.ok
        ? "Studio profile saved."
        : payload.error || "Profile could not be saved.",
    );
  }
  const fields = [
    ["studio_name", "Studio name"],
    ["display_name", "Display name"],
    ["country", "Country"],
    ["website", "Website"],
    ["portfolio_url", "Portfolio"],
    ["company_info", "Company / studio information"],
    ["social_links", "Social links"],
    ["logo_url", "Profile image / logo URL"],
    ["support_email", "Support email"],
  ];
  return (
    <>
      <PageHeading eyebrow="Identity" title="Developer profile" />
      <form onSubmit={save} className="card mt-8 grid gap-5 p-6 md:grid-cols-2">
        {fields.map(([name, label]) => (
          <label key={name} className="text-sm font-semibold text-white">
            {label}
            <input
              name={name}
              type={
                name.includes("email")
                  ? "email"
                  : name.includes("url") || name === "website"
                    ? "url"
                    : "text"
              }
              value={profile[name] || ""}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  [name]: event.target.value,
                }))
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none focus:border-uniblex-blue"
            />
          </label>
        ))}
        <label className="text-sm font-semibold text-white md:col-span-2">
          Short biography
          <textarea
            name="biography"
            value={profile.biography || ""}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                biography: event.target.value,
              }))
            }
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-4 outline-none focus:border-uniblex-blue"
          />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
          <button className="btn-primary">Save profile</button>
          {message ? (
            <span role="status" className="text-sm text-uniblex-gray">
              {message}
            </span>
          ) : null}
        </div>
      </form>
    </>
  );
}

function socialText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as { links?: unknown };
  return Array.isArray(record.links)
    ? record.links
        .filter((item): item is string => typeof item === "string")
        .join(", ")
    : "";
}

function Analytics({ rows }: { rows: SubmissionRow[] }) {
  const published = rows.filter((row) => row.status === "published");
  const metrics = published.map((row) => ({
    row,
    metric: Array.isArray(row.games) ? row.games[0] : row.games,
  }));
  const views = metrics.reduce(
    (total, item) => total + Number(item.metric?.view_count || 0),
    0,
  );
  const plays = metrics.reduce(
    (total, item) => total + Number(item.metric?.play_count || 0),
    0,
  );
  const conversion = views
    ? Math.min(100, Math.round((plays / views) * 100))
    : 0;
  return (
    <>
      <PageHeading eyebrow="Performance" title="Game analytics" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Total views" value={views.toLocaleString()} />
        <Metric label="Game starts" value={plays.toLocaleString()} />
        <Metric label="View-to-play" value={`${conversion}%`} />
      </div>
      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="font-heading text-xl text-white">Published games</h2>
          <p className="mt-1 text-sm text-uniblex-gray">
            Live counters update from the public game experience.
          </p>
        </div>
        {metrics.length ? (
          metrics.map(({ row, metric }) => (
            <article
              key={row.id}
              className="grid gap-3 border-b border-white/10 p-5 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-bold text-white">{row.title}</p>
                <p className="mt-1 text-xs text-uniblex-gray">
                  Published{" "}
                  {metric?.published_at
                    ? new Date(metric.published_at).toLocaleDateString()
                    : "recently"}
                </p>
              </div>
              <span className="text-sm text-uniblex-gray">
                {Number(metric?.view_count || 0).toLocaleString()} views
              </span>
              <span className="text-sm text-uniblex-gray">
                {Number(metric?.play_count || 0).toLocaleString()} plays
              </span>
            </article>
          ))
        ) : (
          <EmptyState
            title="No published analytics yet"
            text="Performance metrics appear after your first game is published."
          />
        )}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <BarChart3 className="text-uniblex-blue" size={20} />
      <p className="mt-4 text-sm text-uniblex-gray">{label}</p>
      <p className="mt-2 font-heading text-3xl text-white">{value}</p>
    </div>
  );
}

function Team() {
  return (
    <>
      <PageHeading eyebrow="Prepared for collaboration" title="Team" />
      <section className="card mt-8 p-6">
        <EmptyState
          title="Team invitations are coming later"
          text="Your studio owner record and future member roles are prepared. No invitations are sent in this release."
        />
      </section>
    </>
  );
}

function Billing() {
  return (
    <>
      <PageHeading eyebrow="Account" title="Billing" />
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className="card p-6">
          <p className="text-sm text-uniblex-gray">Current plan</p>
          <p className="mt-2 font-heading text-2xl text-white">Developer</p>
          <p className="mt-3 text-sm leading-6 text-uniblex-gray">
            Publishing tools and review access. No payment is required.
          </p>
        </section>
        <section className="card p-6">
          <p className="text-sm text-uniblex-gray">Payment profile</p>
          <p className="mt-2 font-heading text-2xl text-white">Not available</p>
          <p className="mt-3 text-sm leading-6 text-uniblex-gray">
            Revenue and payment setup is coming later. Do not enter banking or
            card details.
          </p>
        </section>
        <section className="card p-6">
          <p className="text-sm text-uniblex-gray">Transaction history</p>
          <p className="mt-5 text-sm text-uniblex-gray">
            No transactions. Revenue sharing is not active.
          </p>
        </section>
      </div>
    </>
  );
}

function PageHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.22em] text-uniblex-blue">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-3xl text-white sm:text-5xl">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-44 place-items-center p-6 text-center">
      <div>
        <Gamepad2 className="mx-auto text-uniblex-purple" />
        <h3 className="mt-3 font-heading text-lg text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-uniblex-gray">
          {text}
        </p>
      </div>
    </div>
  );
}
