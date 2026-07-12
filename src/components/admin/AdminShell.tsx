"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AdminProfile } from "@/lib/adminAuth";
import { allowedAdminRoles } from "@/lib/adminAuth";
import { slugify } from "@/lib/slug";

type TableName = "admins" | "categories" | "games" | "blogs" | "contacts" | "ad_zones" | "seo_settings";
type FieldKind = "text" | "textarea" | "select" | "boolean" | "number" | "tags" | "json" | "datetime";
type RowData = Record<string, unknown>;
type FormValues = Record<string, string | boolean>;
type ExtractedZipEntry = {
  name: string;
  blob: Blob;
};

type FieldConfig = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type ResourceConfig = {
  table: TableName;
  label: string;
  plural: string;
  description: string;
  primary: string;
  orderBy: string;
  fields: FieldConfig[];
};

const sharedAdminFields: FieldConfig[] = [
  { key: "id", label: "Auth User ID", kind: "text", required: true, placeholder: "Supabase auth.users id" },
  { key: "email", label: "Email", kind: "text", required: true },
  { key: "display_name", label: "Display Name", kind: "text" },
  { key: "role", label: "Role", kind: "select", options: ["admin", "owner"], required: true },
  { key: "is_active", label: "Active", kind: "boolean" }
];

const resources: ResourceConfig[] = [
  {
    table: "games",
    label: "Game",
    plural: "Games",
    description: "Create and manage WebGL game listings.",
    primary: "title",
    orderBy: "created_at",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "slug", label: "Slug", kind: "text", placeholder: "Generated from title if empty" },
      { key: "category_id", label: "Category ID", kind: "text", placeholder: "Optional category uuid" },
      { key: "genre", label: "Genre", kind: "text" },
      { key: "status", label: "Status", kind: "select", options: ["draft", "preview", "published", "archived"], required: true },
      { key: "description", label: "Description", kind: "textarea", required: true },
      { key: "cover_url", label: "Cover URL", kind: "text" },
      { key: "iframe_url", label: "Iframe URL", kind: "text" },
      { key: "thumbnail_url", label: "Thumbnail URL", kind: "text" },
      { key: "screenshot_urls", label: "Screenshot URLs", kind: "tags", placeholder: "https://..., https://..." },
      { key: "aspect_ratio", label: "Aspect Ratio", kind: "select", options: ["16/9", "16/10", "4/3", "9/16", "1/1"], required: true },
      { key: "desktop_controls", label: "Desktop Controls JSON", kind: "json", placeholder: "[\"WASD / Arrow Keys = Move\"]" },
      { key: "mobile_controls", label: "Mobile Controls JSON", kind: "json", placeholder: "[\"Use on-screen controls\"]" },
      { key: "tags", label: "Tags", kind: "tags", placeholder: "WebGL, Arcade, Runner" },
      { key: "sort_order", label: "Sort Order", kind: "number" },
      { key: "published_at", label: "Published At", kind: "datetime" }
    ]
  },
  {
    table: "blogs",
    label: "Blog Post",
    plural: "Blog Posts",
    description: "Create and manage articles and tutorials.",
    primary: "title",
    orderBy: "created_at",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "slug", label: "Slug", kind: "text", required: true },
      { key: "category_id", label: "Category ID", kind: "text", placeholder: "Optional category uuid" },
      { key: "excerpt", label: "Excerpt", kind: "textarea", required: true },
      { key: "content", label: "Content JSON", kind: "json", placeholder: "[\"Paragraph one\", \"Paragraph two\"]" },
      { key: "status", label: "Status", kind: "select", options: ["draft", "preview", "published", "archived"], required: true },
      { key: "reading_time", label: "Reading Time", kind: "text" },
      { key: "image_url", label: "Image URL", kind: "text" },
      { key: "author_name", label: "Author Name", kind: "text" },
      { key: "published_at", label: "Published At", kind: "datetime" }
    ]
  },
  {
    table: "categories",
    label: "Category",
    plural: "Categories",
    description: "Organize game and blog content.",
    primary: "name",
    orderBy: "sort_order",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "slug", label: "Slug", kind: "text", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "type", label: "Type", kind: "select", options: ["game", "blog"], required: true },
      { key: "is_published", label: "Published", kind: "boolean" },
      { key: "sort_order", label: "Sort Order", kind: "number" }
    ]
  },
  {
    table: "ad_zones",
    label: "Ad Zone",
    plural: "Ad Zones",
    description: "Manage ad placements and provider snippets.",
    primary: "label",
    orderBy: "sort_order",
    fields: [
      { key: "key", label: "Key", kind: "text", required: true },
      { key: "label", label: "Label", kind: "text", required: true },
      { key: "placement", label: "Placement", kind: "text", required: true },
      { key: "provider", label: "Provider", kind: "text" },
      { key: "code", label: "Ad Code", kind: "textarea" },
      { key: "is_active", label: "Active", kind: "boolean" },
      { key: "sort_order", label: "Sort Order", kind: "number" }
    ]
  },
  {
    table: "seo_settings",
    label: "SEO Setting",
    plural: "SEO Settings",
    description: "Manage route-level metadata and structured data.",
    primary: "route",
    orderBy: "route",
    fields: [
      { key: "route", label: "Route", kind: "text", required: true, placeholder: "/games/neon-runner" },
      { key: "title", label: "Title", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "canonical_url", label: "Canonical URL", kind: "text" },
      { key: "og_image_url", label: "OG Image URL", kind: "text" },
      { key: "noindex", label: "No Index", kind: "boolean" },
      { key: "structured_data", label: "Structured Data JSON", kind: "json", placeholder: "{}" },
      { key: "is_active", label: "Active", kind: "boolean" }
    ]
  },
  {
    table: "contacts",
    label: "Contact",
    plural: "Contacts",
    description: "Read, update, archive, or delete contact submissions.",
    primary: "email",
    orderBy: "created_at",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "email", label: "Email", kind: "text", required: true },
      { key: "subject", label: "Subject", kind: "text" },
      { key: "message", label: "Message", kind: "textarea", required: true },
      { key: "status", label: "Status", kind: "select", options: ["new", "read", "archived"], required: true },
      { key: "metadata", label: "Metadata JSON", kind: "json", placeholder: "{}" }
    ]
  },
  {
    table: "admins",
    label: "Admin",
    plural: "Admins",
    description: "Grant or revoke admin access for Supabase Auth users.",
    primary: "email",
    orderBy: "created_at",
    fields: sharedAdminFields
  }
];

const defaultValues: Partial<Record<string, string | boolean>> = {
  role: "admin",
  is_active: true,
  status: "draft",
  type: "game",
  is_published: false,
  sort_order: "0",
  aspect_ratio: "16/9",
  tags: "",
  content: "[]",
  metadata: "{}",
  structured_data: "{}",
  desktop_controls: "[]",
  mobile_controls: "[]",
  noindex: false
};

const webglBucketName = "webgl-games";

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function toInputValue(value: unknown, field: FieldConfig): string | boolean {
  if (field.kind === "boolean") return Boolean(value);
  if (field.kind === "json") return value ? JSON.stringify(value, null, 2) : String(defaultValues[field.key] ?? "{}");
  if (field.kind === "tags") return Array.isArray(value) ? value.join(", ") : "";
  if (field.kind === "datetime" && typeof value === "string") return value.slice(0, 16);
  return value === null || value === undefined ? String(defaultValues[field.key] ?? "") : String(value);
}

function buildEmptyForm(config: ResourceConfig): FormValues {
  return config.fields.reduce<FormValues>((values, field) => {
    const configuredDefault = defaultValues[field.key];
    const fallbackDefault = field.kind === "select" ? field.options?.[0] ?? "" : "";
    values[field.key] = field.kind === "boolean" ? Boolean(configuredDefault) : String(configuredDefault ?? fallbackDefault);
    return values;
  }, {});
}

function normalizePayload(config: ResourceConfig, values: FormValues) {
  return config.fields.reduce<RowData>((payload, field) => {
    const rawValue = values[field.key];

    if (field.kind === "boolean") {
      payload[field.key] = Boolean(rawValue);
      return payload;
    }

    const textValue = String(rawValue ?? "").trim();

    if (field.kind === "number") {
      payload[field.key] = textValue === "" ? 0 : Number(textValue);
      return payload;
    }

    if (field.kind === "tags") {
      payload[field.key] = textValue ? textValue.split(",").map((tag) => tag.trim()).filter(Boolean) : [];
      return payload;
    }

    if (field.kind === "json") {
      payload[field.key] = textValue ? JSON.parse(textValue) : JSON.parse(String(defaultValues[field.key] ?? "{}"));
      return payload;
    }

    if (field.kind === "datetime") {
      if (!textValue) {
        payload[field.key] = null;
        return payload;
      }

      const dateValue = new Date(textValue);
      if (Number.isNaN(dateValue.getTime())) throw new Error(`${field.label} is not a valid date.`);
      payload[field.key] = dateValue.toISOString();
      return payload;
    }

    if (!field.required && textValue === "") {
      payload[field.key] = null;
      return payload;
    }

    payload[field.key] = textValue;
    return payload;
  }, {});
}

type AdminShellProps = {
  initialAdminProfile?: AdminProfile | null;
  r2GameUploadsEnabled?: boolean;
};

export function AdminShell({ initialAdminProfile = null, r2GameUploadsEnabled = false }: AdminShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<RowData | null>(initialAdminProfile);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTable, setActiveTable] = useState<TableName>("games");
  const [rows, setRows] = useState<RowData[]>([]);
  const [counts, setCounts] = useState<Partial<Record<TableName, number>>>({});
  const [loadingRows, setLoadingRows] = useState(false);
  const [notice, setNotice] = useState("");
  const [formValues, setFormValues] = useState<FormValues>({});
  const [gameZipFile, setGameZipFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [previewGameUrl, setPreviewGameUrl] = useState("");
  const [successGameSlug, setSuccessGameSlug] = useState("");

  const activeConfig = useMemo(() => resources.find((resource) => resource.table === activeTable) ?? resources[0], [activeTable]);
  const isAuthorized = Boolean(user && adminProfile);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        void verifyAdmin(sessionUser);
      } else {
        setAuthReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setAdminProfile(null);
      if (sessionUser) {
        void verifyAdmin(sessionUser);
      } else {
        setAuthReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      void loadRows(activeConfig);
      void loadCounts();
    }
  }, [activeConfig, isAuthorized]);

  async function verifyAdmin(sessionUser: User) {
    if (!supabase) return;
    const client = supabase;
    setAuthReady(false);
    setAuthError("");

    const { data, error } = await client
      .from("admins")
      .select("id,email,display_name,role,is_active")
      .eq("id", sessionUser.id)
      .eq("is_active", true)
      .in("role", allowedAdminRoles)
      .maybeSingle();

    if (error || !data) {
      setAdminProfile(null);
      setAuthError("This account is signed in, but it is not active in the admins table.");
    } else {
      setAdminProfile(data as RowData);
    }

    setAuthReady(true);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const client = supabase;
    setAuthLoading(true);
    setAuthError("");

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);

    setAuthLoading(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    const client = supabase;
    await client.auth.signOut();
    window.location.href = "/admin/login";
    setRows([]);
    setCounts({});
    setFormOpen(false);
  }

  async function loadRows(config: ResourceConfig) {
    if (!supabase) return;
    const client = supabase;
    setLoadingRows(true);
    setNotice("");

    const ascending = config.orderBy === "sort_order" || config.orderBy === "route";
    const { data, error } = await client
      .from(config.table)
      .select("*")
      .order(config.orderBy, { ascending });

    if (error) {
      setRows([]);
      setNotice(error.message);
    } else {
      setRows((data ?? []) as RowData[]);
    }

    setLoadingRows(false);
  }

  async function loadCounts() {
    if (!supabase) return;
    const client = supabase;
    const pairs = await Promise.all(resources.map(async (resource) => {
      const { count } = await client.from(resource.table).select("id", { count: "exact", head: true });
      return [resource.table, count ?? 0] as const;
    }));
    setCounts(Object.fromEntries(pairs) as Partial<Record<TableName, number>>);
  }

  function startCreate() {
    setEditingId(null);
    setFormValues(buildEmptyForm(activeConfig));
    setGameZipFile(null);
    setCoverImageFile(null);
    setPreviewGameUrl("");
    setSuccessGameSlug("");
    setFormOpen(true);
    setNotice("");
  }

  function startEdit(row: RowData) {
    const nextValues = activeConfig.fields.reduce<FormValues>((values, field) => {
      values[field.key] = toInputValue(row[field.key], field);
      return values;
    }, {});
    setEditingId(String(row.id));
    setFormValues(nextValues);
    setGameZipFile(null);
    setCoverImageFile(null);
    setPreviewGameUrl("");
    setSuccessGameSlug("");
    setFormOpen(true);
    setNotice("");
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const client = supabase;

    try {
      setUploadLoading(true);
      setUploadProgress(0);
      let nextValues = { ...formValues };
      let uploadSummary = "";
      let persistedGameId = editingId;

      if (activeConfig.table === "games") {
        const prepared = await prepareGameValues(nextValues);
        nextValues = prepared.values;
        uploadSummary = prepared.message;
        persistedGameId = prepared.gameId ?? persistedGameId;
      }

      const payload = normalizePayload(activeConfig, nextValues);
      const query = persistedGameId
        ? client.from(activeConfig.table).update(payload).eq("id", persistedGameId)
        : client.from(activeConfig.table).insert(payload);
      const { error } = await query;

      if (error) {
        setNotice(error.message);
        return;
      }

      if (activeConfig.table === "games") {
        setNotice(`Game Published Successfully${uploadSummary ? ` ${uploadSummary}` : ""}`);
        setSuccessGameSlug(String(payload.slug ?? ""));
      } else {
        setNotice(`${activeConfig.label} ${editingId ? "updated" : "created"}.${uploadSummary ? ` ${uploadSummary}` : ""}`);
        setSuccessGameSlug("");
      }
      setFormOpen(false);
      setGameZipFile(null);
      setCoverImageFile(null);
      setPreviewGameUrl("");
      await loadRows(activeConfig);
      await loadCounts();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save record.");
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  }

  async function prepareGameValues(values: FormValues) {
    if (!supabase) return { values, message: "" };

    const title = String(values.title ?? "").trim();
    const currentSlug = String(values.slug ?? "").trim();
    const generatedSlug = slugify(currentSlug || title);
    const iframeUrl = String(values.iframe_url ?? "").trim();

    if (!title) {
      throw new Error("Title is required.");
    }
    if (!generatedSlug) {
      throw new Error("Enter a title or slug before saving a game.");
    }
    if (!editingId && !gameZipFile && !iframeUrl) {
      throw new Error("Please provide either a WebGL ZIP or an iframe URL.");
    }
    if (editingId && !gameZipFile && !iframeUrl) {
      throw new Error("Please provide either a WebGL ZIP or an iframe URL.");
    }
    if (iframeUrl && !isValidHttpUrl(iframeUrl)) {
      throw new Error("Iframe URL must be a valid http or https URL.");
    }

    const nextValues: FormValues = {
      ...values,
      slug: generatedSlug,
      status: String(values.status ?? "").trim() || "draft",
      sort_order: String(values.sort_order ?? "").trim() || "0"
    };

    if (String(nextValues.status) === "published" && !String(nextValues.published_at ?? "").trim()) {
      nextValues.published_at = toDatetimeLocalValue(new Date());
    }

    await ensureUniqueGameSlug(generatedSlug);

    if (!gameZipFile && !coverImageFile) {
      setFormValues(nextValues);
      return { values: nextValues, message: iframeUrl ? "External iframe URL saved." : "" };
    }

    if (gameZipFile && !r2GameUploadsEnabled) {
      throw new Error("WebGL upload automation is temporarily unavailable while security validation is completed.");
    }

    if (gameZipFile && !gameZipFile.name.toLowerCase().endsWith(".zip")) {
      throw new Error("Game upload must be a .zip file.");
    }

    const messages: string[] = [];
    let persistedGameId: string | undefined;

    if (gameZipFile) {
      const uploadResult = await uploadWebglZipToR2(gameZipFile, generatedSlug, title, editingId, String(values.description ?? ""), setUploadProgress);
      nextValues.iframe_url = uploadResult.iframeUrl;
      persistedGameId = uploadResult.gameId;
      messages.push(uploadResult.message);
    }

    if (coverImageFile) {
      nextValues.cover_url = await uploadCoverViaAdminRoute(coverImageFile, generatedSlug, title);
      messages.push("Cover image uploaded to Cloudinary.");
    }

    const message = messages.join(" ");
    setFormValues(nextValues);
    return { values: nextValues, message, gameId: persistedGameId };
  }

  async function ensureUniqueGameSlug(slug: string) {
    if (!supabase || activeConfig.table !== "games") return;

    let query = supabase.from("games").select("id").eq("slug", slug).limit(1);
    if (editingId) query = query.neq("id", editingId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (data?.length) throw new Error("Slug already exists.");
  }

  async function deleteRecord(row: RowData) {
    if (!supabase) return;
    const client = supabase;
    const label = formatValue(row[activeConfig.primary]);
    const deleteNote = activeConfig.table === "games" ? " R2 cleanup will be requested for this game." : "";
    const confirmed = window.confirm(`Delete ${activeConfig.label.toLowerCase()} "${label}"?${deleteNote}`);
    if (!confirmed) return;

    const { error } = activeConfig.table === "games"
      ? await runGameAction("delete", String(row.id))
      : await client.from(activeConfig.table).delete().eq("id", String(row.id));
    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice(`${activeConfig.label} deleted.`);
    await loadRows(activeConfig);
    await loadCounts();
  }

  async function runGameAction(action: "publish" | "preview" | "unpublish" | "delete" | "rollback", gameId: string, buildId?: string) {
    if (!supabase) return { error: new Error("Supabase is not configured.") };

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: new Error("Admin session expired. Sign in again.") };

    const response = await fetch("/api/admin/games/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, gameId, buildId })
    });
    const payload = await parseUploadResponse(response, "Game action failed.");

    return response.ok ? { error: null } : { error: new Error(String(payload.error ?? "Game action failed.")) };
  }
  function updateField(key: string, value: string | boolean) {
    setFormValues((current) => {
      const next = { ...current, [key]: value };
      if (activeConfig.table === "games" && key === "title" && !editingId && !String(current.slug ?? "").trim()) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  async function copyText(value: string, message: string) {
    if (!value) return;
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setNotice(message);
  }

  if (!supabase) {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <section className="card max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Admin Setup</p>
          <h1 className="mt-3 font-heading text-4xl">Supabase is not configured</h1>
          <p className="mt-4 leading-7 text-uniblex-gray">
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel to enable admin login and database management.
          </p>
        </section>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <div className="card p-8 text-uniblex-gray">Checking admin access...</div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="container-pad flex min-h-screen items-center justify-center py-12">
        <section className="card w-full max-w-md p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-uniblex-blue">Protected Admin</p>
          <h1 className="mt-3 font-heading text-4xl gradient-text">Uniblex Login</h1>
          <form onSubmit={handleLogin} className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
            </label>
            {authError ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{authError}</p> : null}
            <button className="btn-primary w-full" disabled={authLoading} type="submit">{authLoading ? "Signing in..." : "Sign In"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-uniblex-bg">
      <div className="container-pad py-6 md:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-8">
          <div className="min-w-0">
            <p className="text-sm text-uniblex-gray">Signed in as {formatValue(adminProfile?.email)} | {formatValue(adminProfile?.role)}</p>
            <h1 className="gradient-text font-heading text-3xl sm:text-4xl">Uniblex Admin</h1>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <button className="btn-primary px-3 text-sm sm:px-6 sm:text-base" onClick={startCreate}>Create {activeConfig.label}</button>
            <button className="btn-secondary px-3 text-sm sm:px-6 sm:text-base" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="card overflow-hidden p-2 lg:p-3">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
              {resources.map((resource) => {
                const active = resource.table === activeTable;
                return (
                  <button
                    key={resource.table}
                    onClick={() => {
                      setActiveTable(resource.table);
                      setFormOpen(false);
                    }}
                    className={`shrink-0 rounded-lg px-4 py-3 text-left text-sm font-semibold transition lg:w-full ${active ? "bg-uniblex-blue/10 text-uniblex-blue ring-1 ring-uniblex-blue/30" : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      {resource.plural}
                      <span className="text-xs text-uniblex-gray">{counts[resource.table] ?? 0}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="grid gap-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {resources.slice(0, 4).map((resource) => (
                <button key={resource.table} onClick={() => setActiveTable(resource.table)} className="card p-4 text-left transition hover:border-uniblex-blue/60 sm:p-5">
                  <p className="text-sm text-uniblex-gray">{resource.plural}</p>
                  <p className="mt-2 font-heading text-3xl sm:text-4xl">{counts[resource.table] ?? 0}</p>
                </button>
              ))}
            </div>

            <div className="card overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-uniblex-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <h2 className="font-heading text-2xl">{activeConfig.plural}</h2>
                  <p className="mt-1 text-sm text-uniblex-gray">{activeConfig.description}</p>
                </div>
                <button className="btn-secondary min-h-0 px-4 py-2 text-sm" onClick={() => void loadRows(activeConfig)}>Refresh</button>
              </div>

              {notice ? (
                <div className="border-b border-uniblex-border bg-white/[.03] p-4 text-sm text-uniblex-blue">
                  <span>{notice}</span>
                  {successGameSlug ? (
                    <a className="ml-3 font-bold text-white underline decoration-uniblex-blue underline-offset-4" href={`/games/${successGameSlug}`} target="_blank" rel="noreferrer">
                      View Game
                    </a>
                  ) : null}
                </div>
              ) : null}

              {formOpen ? (
                <form onSubmit={saveRecord} className="grid gap-4 border-b border-uniblex-border p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-heading text-xl">{editingId ? "Edit" : "Create"} {activeConfig.label}</h3>
                    <button type="button" className="text-sm font-bold text-uniblex-gray hover:text-white" onClick={() => setFormOpen(false)}>Cancel</button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeConfig.table === "games" ? (
                      <GameUploadFields
                        r2GameUploadsEnabled={r2GameUploadsEnabled}
                        gameZipFile={gameZipFile}
                        coverImageFile={coverImageFile}
                        coverUrl={String(formValues.cover_url ?? "")}
                        uploadProgress={uploadProgress}
                        setGameZipFile={setGameZipFile}
                        setCoverImageFile={setCoverImageFile}
                      />
                    ) : null}
                    {activeConfig.fields.map((field) => {
                      if (activeConfig.table === "games" && field.key === "iframe_url") {
                        return (
                          <GameIframeField
                            key={field.key}
                            field={field}
                            value={String(formValues[field.key] ?? "")}
                            updateField={updateField}
                            onPreview={() => setPreviewGameUrl(String(formValues.iframe_url ?? "").trim())}
                          />
                        );
                      }

                      return (
                        <label key={field.key} className={`grid gap-2 text-sm font-bold ${field.kind === "textarea" || field.kind === "json" ? "md:col-span-2" : ""}`}>
                          {field.label}
                          {renderField(field, formValues[field.key], updateField)}
                        </label>
                      );
                    })}
                  </div>
                  {activeConfig.table === "games" && previewGameUrl ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-bold">Game Preview</p>
                      <iframe className="h-[420px] w-full rounded-lg border border-uniblex-border bg-black" src={previewGameUrl} title="Game preview" allowFullScreen />
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
                    {activeConfig.table === "games" ? (
                      <button className="btn-secondary" disabled={uploadLoading} type="button" onClick={() => setPreviewGameUrl(String(formValues.iframe_url ?? "").trim())}>
                        Preview Game
                      </button>
                    ) : null}
                    <button className="btn-primary" disabled={uploadLoading} type="submit">
                      {uploadLoading ? "Saving..." : `Save ${activeConfig.label}`}
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-white/[.03] text-xs uppercase tracking-[.18em] text-uniblex-gray">
                    <tr>
                      <th className="px-5 py-4">{activeConfig.primary}</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Updated</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRows ? (
                      <tr><td className="px-5 py-6 text-uniblex-gray" colSpan={4}>Loading...</td></tr>
                    ) : rows.length ? rows.map((row) => (
                      <tr key={String(row.id)} className="border-t border-uniblex-border/80">
                        <td className="px-5 py-4 font-bold">{formatValue(row[activeConfig.primary])}</td>
                        <td className="px-5 py-4 text-uniblex-gray">{formatValue(row.status ?? row.role ?? row.type ?? row.is_active)}</td>
                        <td className="px-5 py-4 text-uniblex-gray">{formatValue(row.updated_at ?? row.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            {activeConfig.table === "games" ? (
                              <>
                                <a className="btn-secondary min-h-0 rounded-xl px-3 py-2 text-xs" href={`/games/${row.slug}`} target="_blank" rel="noreferrer">View Game</a>
                                <button className="btn-secondary min-h-0 rounded-xl px-3 py-2 text-xs" onClick={() => void copyText(`${window.location.origin}/games/${row.slug}`, "Game URL copied.")}>Copy Game URL</button>
                                <button className="btn-secondary min-h-0 rounded-xl px-3 py-2 text-xs" disabled={!row.iframe_url} onClick={() => void copyText(String(row.iframe_url ?? ""), "Iframe URL copied.")}>Copy Iframe URL</button>
                              </>
                            ) : null}
                            <button className="btn-secondary min-h-0 rounded-xl px-3 py-2 text-xs" onClick={() => startEdit(row)}>Manage</button>
                            <button className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10" onClick={() => void deleteRecord(row)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="px-5 py-6 text-uniblex-gray" colSpan={4}>No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 md:hidden">
                {loadingRows ? (
                  <div className="rounded-lg border border-uniblex-border bg-white/[.025] p-4 text-sm text-uniblex-gray">Loading...</div>
                ) : rows.length ? rows.map((row) => (
                  <div key={String(row.id)} className="rounded-lg border border-uniblex-border bg-white/[.025] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{formatValue(row[activeConfig.primary])}</p>
                        <p className="mt-1 text-xs text-uniblex-gray">{formatValue(row.status ?? row.role ?? row.type ?? row.is_active)}</p>
                      </div>
                      <p className="shrink-0 text-right text-[11px] text-uniblex-gray">{formatValue(row.updated_at ?? row.created_at)}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {activeConfig.table === "games" ? (
                        <>
                          <a className="btn-secondary min-h-0 rounded-md px-3 py-2 text-xs" href={`/games/${row.slug}`} target="_blank" rel="noreferrer">View</a>
                          <button className="btn-secondary min-h-0 rounded-md px-3 py-2 text-xs" onClick={() => void copyText(`${window.location.origin}/games/${row.slug}`, "Game URL copied.")}>Copy URL</button>
                        </>
                      ) : null}
                      <button className="btn-secondary min-h-0 rounded-md px-3 py-2 text-xs" onClick={() => startEdit(row)}>Manage</button>
                      <button className="rounded-md border border-red-500/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10" onClick={() => void deleteRecord(row)}>Delete</button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-uniblex-border bg-white/[.025] p-4 text-sm text-uniblex-gray">No records found.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function renderField(field: FieldConfig, value: string | boolean | undefined, updateField: (key: string, value: string | boolean) => void) {
  const baseClass = "rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue";

  if (field.kind === "boolean") {
    return (
      <span className="flex min-h-[48px] items-center gap-3 rounded-lg border border-uniblex-border bg-white/[.03] px-4">
        <input checked={Boolean(value)} onChange={(event) => updateField(field.key, event.target.checked)} type="checkbox" />
        <span className="text-uniblex-gray">{Boolean(value) ? "Enabled" : "Disabled"}</span>
      </span>
    );
  }

  if (field.kind === "select") {
    return (
      <select className={`${baseClass} admin-select bg-slate-900 text-white`} value={String(value ?? "")} onChange={(event) => updateField(field.key, event.target.value)} required={field.required}>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option} className="bg-slate-900 text-white" style={{ backgroundColor: "#111827", color: "#ffffff" }}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.kind === "textarea" || field.kind === "json") {
    return (
      <textarea className={`${baseClass} min-h-[130px] font-mono text-sm`} value={String(value ?? "")} onChange={(event) => updateField(field.key, event.target.value)} required={field.required} placeholder={field.placeholder} />
    );
  }

  return (
    <input
      className={baseClass}
      value={String(value ?? "")}
      onChange={(event) => updateField(field.key, event.target.value)}
      required={field.required}
      placeholder={field.placeholder}
      type={field.kind === "number" ? "number" : field.kind === "datetime" ? "datetime-local" : "text"}
    />
  );
}

async function uploadWebglZipToR2(
  file: File,
  slug: string,
  title: string,
  gameId: string | null,
  description: string,
  onProgress: (progress: number) => void
) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Admin session expired. Sign in again before uploading a build.");

  const partSize = 8 * 1024 * 1024;
  const partCount = Math.ceil(file.size / partSize);
  const initiateResponse = await fetch("/api/admin/games/builds/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug, title, gameId, description, fileName: file.name, fileSize: file.size, partCount })
  });
  const initiatePayload = await parseUploadResponse(initiateResponse, "Unable to prepare R2 upload.");

  if (!initiateResponse.ok) {
    throw new Error(typeof initiatePayload.error === "string" ? initiatePayload.error : "Unable to prepare R2 upload.");
  }

  const uploadState = {
    buildId: String(initiatePayload.buildId),
    gameId: String(initiatePayload.gameId),
    zipKey: String(initiatePayload.zipKey),
    uploadId: String(initiatePayload.uploadId)
  };
  const partUrls = (initiatePayload.partUrls ?? []) as Array<{ partNumber: number; url: string }>;
  const completed: Array<{ partNumber: number; etag: string }> = [];
  const uploadedByPart = new Map<number, number>();

  try {
    for (const part of partUrls) {
      const start = (part.partNumber - 1) * partSize;
      const chunk = file.slice(start, Math.min(start + partSize, file.size));
      const etag = await uploadPartToR2(part.url, chunk, (loaded) => {
        uploadedByPart.set(part.partNumber, loaded);
        const uploaded = Array.from(uploadedByPart.values()).reduce((sum, value) => sum + value, 0);
        onProgress(Math.max(1, Math.min(99, Math.round((uploaded / file.size) * 100))));
      });
      uploadedByPart.set(part.partNumber, chunk.size);
      completed.push({ partNumber: part.partNumber, etag });
    }

    onProgress(99);
    const completeResponse = await fetch("/api/admin/games/builds/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...uploadState, parts: completed })
    });
    const completePayload = await parseUploadResponse(completeResponse, "Unable to complete R2 upload.");

    if (!completeResponse.ok) {
      throw new Error(typeof completePayload.error === "string" ? completePayload.error : "Unable to complete R2 upload.");
    }

    onProgress(100);
    return {
      gameId: uploadState.gameId,
      iframeUrl: String(completePayload.indexUrl ?? initiatePayload.indexUrl),
      message: `Uploaded ${file.name} directly to Cloudflare R2 and extracted build v${initiatePayload.version}.`
    };
  } catch (error) {
    await fetch("/api/admin/games/builds/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...uploadState, error: error instanceof Error ? error.message : "Upload failed." })
    }).catch(() => undefined);
    throw error;
  }
}

function uploadPartToR2(url: string, chunk: Blob, onProgress: (loaded: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        const etag = request.getResponseHeader("ETag") || request.getResponseHeader("etag") || "";
        resolve(etag.replace(/^\"|\"$/g, ""));
      } else {
        reject(new Error(request.responseText || `R2 part upload failed with status ${request.status}.`));
      }
    };
    request.onerror = () => reject(new Error("Network error while uploading a ZIP part to R2."));
    request.send(chunk);
  });
}
async function uploadWebglZipToStorage(file: File, slug: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const entries = await extractZipFile(file);
  const indexEntry = entries.find((entry) => entry.name.toLowerCase() === "index.html");

  if (!indexEntry) {
    throw new Error("ZIP must contain an index.html file.");
  }

  for (const entry of entries) {
    const storagePath = `${slug}/${entry.name}`;
    const { error } = await supabase.storage
      .from(webglBucketName)
      .upload(storagePath, entry.blob, {
        cacheControl: "3600",
        contentType: getContentType(entry.name),
        upsert: true
      });

    if (error) {
      throw new Error(`Unable to upload ${entry.name}: ${error.message}`);
    }
  }

  const { data } = supabase.storage.from(webglBucketName).getPublicUrl(`${slug}/index.html`);

  return {
    iframeUrl: data.publicUrl,
    message: `WebGL ZIP extracted in the browser and uploaded ${entries.length} files to Supabase Storage.`
  };
}

async function extractZipFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Game upload must be a .zip file.");
  }

  const buffer = await file.arrayBuffer();
  const entries = await readZipEntries(buffer);
  const indexEntry = entries.find((entry) => entry.name.split("/").pop()?.toLowerCase() === "index.html");

  if (!indexEntry) {
    throw new Error("ZIP must contain an index.html file.");
  }

  const prefix = indexEntry.name.includes("/") ? indexEntry.name.slice(0, indexEntry.name.lastIndexOf("/")) : "";

  return entries
    .map((entry) => ({ ...entry, name: normalizeZipPath(stripZipPrefix(entry.name, prefix)) }))
    .filter((entry) => Boolean(entry.name));
}

async function readZipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const entries: ExtractedZipEntry[] = [];
  const centralDirectoryOffset = findCentralDirectoryOffset(view);
  const totalEntries = view.getUint16(centralDirectoryOffset + 10, true);
  let offset = view.getUint32(centralDirectoryOffset + 16, true);

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("ZIP central directory is invalid.");
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const rawName = decodeZipString(buffer.slice(offset + 46, offset + 46 + nameLength));
    const name = normalizeZipPath(rawName);

    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported by the browser uploader.");
    }

    if (flags & 0x01) {
      throw new Error("Encrypted ZIP files are not supported.");
    }

    if (name && !rawName.endsWith("/")) {
      if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
        throw new Error("ZIP local file header is invalid.");
      }

      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;

      if (dataEnd > buffer.byteLength) {
        throw new Error("ZIP file is invalid or truncated.");
      }

      const blob = await inflateZipEntry(buffer.slice(dataStart, dataEnd), method, uncompressedSize, name);
      entries.push({ name, blob });
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (!entries.length) {
    throw new Error("ZIP file does not contain extractable files.");
  }

  return entries;
}

function findCentralDirectoryOffset(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 65557);

  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }

  throw new Error("ZIP end-of-central-directory record was not found.");
}

async function inflateZipEntry(data: ArrayBuffer, method: number, expectedSize: number, name: string) {
  if (method === 0) return new Blob([data], { type: getContentType(name) });

  if (method !== 8) {
    throw new Error("ZIP compression method is not supported.");
  }

  const DecompressionStreamConstructor = globalThis.DecompressionStream;

  if (!DecompressionStreamConstructor) {
    throw new Error("This browser cannot extract compressed ZIP files. Use a current Chrome or Edge browser, then try again.");
  }

  try {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStreamConstructor("deflate-raw"));
    const blob = await new Response(stream).blob();

    if (expectedSize && blob.size !== expectedSize) {
      throw new Error("ZIP entry failed size validation.");
    }

    return new Blob([blob], { type: getContentType(name) });
  } catch (error) {
    throw new Error(error instanceof Error ? `Unable to extract ${name}: ${error.message}` : `Unable to extract ${name}.`);
  }
}

function decodeZipString(value: ArrayBuffer) {
  return new TextDecoder("utf-8").decode(value);
}

function normalizeZipPath(name: string) {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    return "";
  }

  return parts.join("/");
}

function stripZipPrefix(name: string, prefix: string) {
  if (!prefix) return name;
  return name === prefix ? "" : name.startsWith(`${prefix}/`) ? name.slice(prefix.length + 1) : name;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toDatetimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

async function uploadCoverViaAdminRoute(file: File, slug: string, title: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Admin session expired. Sign in again before uploading a cover image.");
  }

  const formData = new FormData();
  formData.set("title", title);
  formData.set("slug", slug);
  formData.set("coverImage", file);

  const response = await fetch("/api/admin/uploads/game", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  const payload = await parseUploadResponse(response, "Cover upload failed.");

  if (!response.ok || typeof payload.coverUrl !== "string") {
    throw new Error(typeof payload.error === "string" ? payload.error : "Cover upload failed.");
  }

  return payload.coverUrl as string;
}

async function parseUploadResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || fallbackMessage);
  }
}

function getContentType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "html":
      return "text/html; charset=utf-8";
    case "js":
      return "application/javascript; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "wasm":
      return "application/wasm";
    case "data":
      return "application/octet-stream";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

function GameUploadFields({
  r2GameUploadsEnabled,
  gameZipFile,
  coverImageFile,
  coverUrl,
  uploadProgress,
  setGameZipFile,
  setCoverImageFile
}: {
  r2GameUploadsEnabled: boolean;
  gameZipFile: File | null;
  coverImageFile: File | null;
  coverUrl: string;
  uploadProgress: number;
  setGameZipFile: (file: File | null) => void;
  setCoverImageFile: (file: File | null) => void;
}) {
  const [coverPreview, setCoverPreview] = useState("");

  useEffect(() => {
    if (!coverImageFile) {
      setCoverPreview(coverUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(coverImageFile);
    setCoverPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverImageFile, coverUrl]);

  return (
    <div className="grid gap-4 rounded-lg border border-uniblex-border bg-white/[.02] p-4 md:col-span-2 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="text-sm font-bold text-white">Publishing Mode</p>
        <p className="mt-1 text-xs text-uniblex-gray">Use iframe URL for games hosted on Cloudflare R2. ZIP upload is optional.</p>
      </div>
      <div className="rounded-lg border border-uniblex-border bg-white/[.02] p-3 text-sm font-bold">
        Mode A: External Hosted Game URL
        <p className="mt-1 text-xs font-normal text-uniblex-gray">Paste the full R2 index.html URL in the Iframe URL field below.</p>
      </div>
      {r2GameUploadsEnabled ? (
        <label className="grid gap-2 text-sm font-bold">
          Mode B: Upload WebGL ZIP
          <input
            className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-uniblex-blue file:px-3 file:py-2 file:font-bold file:text-white"
            accept=".zip,application/zip,application/x-zip-compressed"
            type="file"
            onChange={(event) => setGameZipFile(event.target.files?.[0] ?? null)}
          />
          <span className="text-xs font-normal text-uniblex-gray">
            {gameZipFile ? gameZipFile.name : "Uploads directly to Cloudflare R2, then a Worker validates and extracts the build."}
          </span>
        </label>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          WebGL upload automation is temporarily unavailable while security validation is completed.
        </div>
      )}
      {uploadProgress > 0 ? (
        <div className="md:col-span-2 rounded-lg border border-uniblex-blue/30 bg-uniblex-blue/10 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-uniblex-blue"><span>R2 upload and extraction</span><span>{uploadProgress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-uniblex-blue transition-all" style={{ width: `${uploadProgress}%` }} /></div>
        </div>
      ) : null}
      <label className="grid gap-2 text-sm font-bold">
        Cover Image Upload
        <input
          className="rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-uniblex-purple file:px-3 file:py-2 file:font-bold file:text-white"
          accept="image/*"
          type="file"
          onChange={(event) => setCoverImageFile(event.target.files?.[0] ?? null)}
        />
        <span className="text-xs font-normal text-uniblex-gray">
          {coverImageFile ? coverImageFile.name : "Uploads to Cloudinary and saves secure_url as cover_url."}
        </span>
      </label>
      {coverPreview ? (
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-bold">Cover Preview</p>
          <div className="aspect-[16/9] max-w-md overflow-hidden rounded-lg border border-uniblex-border bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Selected game cover preview" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GameIframeField({
  field,
  value,
  updateField,
  onPreview
}: {
  field: FieldConfig;
  value: string;
  updateField: (key: string, value: string | boolean) => void;
  onPreview: () => void;
}) {
  const trimmedUrl = value.trim();

  return (
    <label className="grid gap-2 text-sm font-bold md:col-span-2">
      {field.label}
      <span className="flex flex-col gap-2 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-lg border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue"
          value={value}
          onChange={(event) => updateField(field.key, event.target.value)}
          placeholder="https://pub-...r2.dev/game/index.html"
          type="url"
        />
        <button
          className="btn-secondary min-h-0 px-4 py-3 text-sm"
          disabled={!trimmedUrl}
          onClick={() => window.open(trimmedUrl, "_blank", "noopener,noreferrer")}
          type="button"
        >
          Test URL
        </button>
        <button
          className="btn-secondary min-h-0 px-4 py-3 text-sm"
          disabled={!trimmedUrl}
          onClick={onPreview}
          type="button"
        >
          Preview Game
        </button>
      </span>
      <span className="text-xs font-normal text-uniblex-gray">Use iframe URL for games hosted on Cloudflare R2. ZIP upload is optional.</span>
    </label>
  );
}
