const nav = ["Dashboard", "Games", "Blog Posts", "Ad Zones", "Settings"];

export function AdminShell() {
  return (
    <main className="min-h-screen bg-uniblex-bg">
      <div className="container-pad py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-uniblex-gray">Admin UI Preview</p>
            <h1 className="font-heading text-4xl gradient-text">Uniblex Admin</h1>
          </div>
          <button className="btn-primary">Create New</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="card p-4">
            <div className="grid gap-2">
              {nav.map((item) => (
                <button key={item} className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-uniblex-gray transition hover:bg-uniblex-blue/10 hover:text-uniblex-blue">
                  {item}
                </button>
              ))}
            </div>
          </aside>
          <section className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Games", "3"],
                ["Articles", "3"],
                ["Drafts", "2"],
                ["Ad Zones", "4"]
              ].map(([label, value]) => (
                <div key={label} className="card p-6">
                  <p className="text-sm text-uniblex-gray">{label}</p>
                  <p className="mt-2 font-heading text-4xl">{value}</p>
                </div>
              ))}
            </div>
            <div className="card overflow-hidden">
              <div className="border-b border-uniblex-border p-6">
                <h2 className="font-heading text-2xl">Content Manager</h2>
              </div>
              <div className="grid gap-4 p-6">
                {["Upload WebGL game build", "Create blog article", "Toggle ad placement", "Update SEO metadata"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-uniblex-border p-4">
                    <span>{item}</span>
                    <button className="btn-secondary px-4 py-2 text-sm">Manage</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
