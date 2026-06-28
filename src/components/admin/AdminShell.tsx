"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type TableName = "admins" | "categories" | "games" | "blogs" | "contacts" | "ad_zones" | "seo_settings";
type FieldKind = "text" | "textarea" | "select" | "boolean" | "number" | "tags" | "json" | "datetime";
type RowData = Record<string, unknown>;
type FormValues = Record<string, string | boolean>;

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
      { key: "slug", label: "Slug", kind: "text", required: true },
      { key: "category_id", label: "Category ID", kind: "text", placeholder: "Optional category uuid" },
      { key: "genre", label: "Genre", kind: "text" },
      { key: "status", label: "Status", kind: "select", options: ["draft", "published", "coming_soon", "archived"], required: true },
      { key: "description", label: "Description", kind: "textarea", required: true },
      { key: "cover_url", label: "Cover URL", kind: "text" },
      { key: "iframe_url", label: "Iframe URL", kind: "text" },
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
      { key: "status", label: "Status", kind: "select", options: ["draft", "published", "archived"], required: true },
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
  tags: "",
  content: "[]",
  metadata: "{}",
  structured_data: "{}",
  noindex: false
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
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

export function AdminShell() {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<RowData | null>(null);
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

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
    if (!supabase) return; const client = supabase; const client = supabase; const client = supabase;
    setAuthReady(false);
    setAuthError("");

    const { data, error } = await supabase
      .from("admins")
      .select("id,email,display_name,role,is_active")
      .eq("id", sessionUser.id)
      .eq("is_active", true)
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
    if (!supabase) return; const client = supabase; const client = supabase; const client = supabase;
    setAuthLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);

    setAuthLoading(false);
  }

  async function handleSignOut() {
    if (!supabase) return; const client = supabase; const client = supabase;
    await supabase.auth.signOut();
    setRows([]);
    setCounts({});
    setFormOpen(false);
  }

  async function loadRows(config: ResourceConfig) {
    if (!supabase) return; const client = supabase; const client = supabase;
    setLoadingRows(true);
    setNotice("");

    const ascending = config.orderBy === "sort_order" || config.orderBy === "route";
    const { data, error } = await supabase
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
    if (!supabase) return; const client = supabase; const client = supabase;
    const pairs = await Promise.all(resources.map(async (resource) => {
      const { count } = await client.from(resource.table).select("id", { count: "exact", head: true });
      return [resource.table, count ?? 0] as const;
    }));
    setCounts(Object.fromEntries(pairs) as Partial<Record<TableName, number>>);
  }

  function startCreate() {
    setEditingId(null);
    setFormValues(buildEmptyForm(activeConfig));
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
    setFormOpen(true);
    setNotice("");
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
   if (!supabase) return;
const client = supabase;

    try {
      const payload = normalizePayload(activeConfig, formValues);
      const query = editingId
        ? supabase.from(activeConfig.table).update(payload).eq("id", editingId)
        : supabase.from(activeConfig.table).insert(payload);
      const { error } = await query;

      if (error) {
        setNotice(error.message);
        return;
      }

      setNotice(`${activeConfig.label} ${editingId ? "updated" : "created"}.`);
      setFormOpen(false);
      await loadRows(activeConfig);
      await loadCounts();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save record.");
    }
  }

  async function deleteRecord(row: RowData) {
    if (!supabase) return; const client = supabase;
    const label = formatValue(row[activeConfig.primary]);
    const confirmed = window.confirm(`Delete ${activeConfig.label.toLowerCase()} "${label}"?`);
    if (!confirmed) return;

    const { error } = await supabase.from(activeConfig.table).delete().eq("id", String(row.id));
    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice(`${activeConfig.label} deleted.`);
    await loadRows(activeConfig);
    await loadCounts();
  }

  function updateField(key: string, value: string | boolean) {
    setFormValues((current) => ({ ...current, [key]: value }));
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
              <input className="rounded-2xl border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Password
              <input className="rounded-2xl border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
            </label>
            {authError ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{authError}</p> : null}
            <button className="btn-primary w-full" disabled={authLoading} type="submit">{authLoading ? "Signing in..." : "Sign In"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-uniblex-bg">
      <div className="container-pad py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-uniblex-gray">Signed in as {formatValue(adminProfile?.email)} · {formatValue(adminProfile?.role)}</p>
            <h1 className="font-heading text-4xl gradient-text">Uniblex Admin</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={startCreate}>Create {activeConfig.label}</button>
            <button className="btn-secondary" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="card p-3">
            <div className="grid gap-2">
              {resources.map((resource) => {
                const active = resource.table === activeTable;
                return (
                  <button
                    key={resource.table}
                    onClick={() => {
                      setActiveTable(resource.table);
                      setFormOpen(false);
                    }}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${active ? "bg-uniblex-blue/10 text-uniblex-blue ring-1 ring-uniblex-blue/30" : "text-uniblex-gray hover:bg-white/[.04] hover:text-white"}`}
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {resources.slice(0, 4).map((resource) => (
                <button key={resource.table} onClick={() => setActiveTable(resource.table)} className="card p-5 text-left transition hover:border-uniblex-blue/60">
                  <p className="text-sm text-uniblex-gray">{resource.plural}</p>
                  <p className="mt-2 font-heading text-4xl">{counts[resource.table] ?? 0}</p>
                </button>
              ))}
            </div>

            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-uniblex-border p-5">
                <div>
                  <h2 className="font-heading text-2xl">{activeConfig.plural}</h2>
                  <p className="mt-1 text-sm text-uniblex-gray">{activeConfig.description}</p>
                </div>
                <button className="btn-secondary px-4 py-2 text-sm" onClick={() => void loadRows(activeConfig)}>Refresh</button>
              </div>

              {notice ? <div className="border-b border-uniblex-border bg-white/[.03] p-4 text-sm text-uniblex-blue">{notice}</div> : null}

              {formOpen ? (
                <form onSubmit={saveRecord} className="grid gap-4 border-b border-uniblex-border p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-heading text-xl">{editingId ? "Edit" : "Create"} {activeConfig.label}</h3>
                    <button type="button" className="text-sm font-bold text-uniblex-gray hover:text-white" onClick={() => setFormOpen(false)}>Cancel</button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeConfig.fields.map((field) => (
                      <label key={field.key} className={`grid gap-2 text-sm font-bold ${field.kind === "textarea" || field.kind === "json" ? "md:col-span-2" : ""}`}>
                        {field.label}
                        {renderField(field, formValues[field.key], updateField)}
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button className="btn-primary" type="submit">Save {activeConfig.label}</button>
                  </div>
                </form>
              ) : null}

              <div className="overflow-x-auto">
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
                          <div className="flex justify-end gap-2">
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
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function renderField(field: FieldConfig, value: string | boolean | undefined, updateField: (key: string, value: string | boolean) => void) {
  const baseClass = "rounded-2xl border border-uniblex-border bg-white/[.03] px-4 py-3 text-white outline-none transition focus:border-uniblex-blue";

  if (field.kind === "boolean") {
    return (
      <span className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-uniblex-border bg-white/[.03] px-4">
        <input checked={Boolean(value)} onChange={(event) => updateField(field.key, event.target.checked)} type="checkbox" />
        <span className="text-uniblex-gray">{Boolean(value) ? "Enabled" : "Disabled"}</span>
      </span>
    );
  }

  if (field.kind === "select") {
    return (
      <select className={baseClass} value={String(value ?? "")} onChange={(event) => updateField(field.key, event.target.value)} required={field.required}>
        {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
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
