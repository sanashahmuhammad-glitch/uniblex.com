"use client";
import Link from "next/link";
import { AD_FORMATS, AD_POLICY_VERSION, emptyMonetization, MONETIZATION_MODES, type MonetizationDisclosure } from "@/lib/monetization";
export function MonetizationFields({ value, onChange }: { value: MonetizationDisclosure; onChange: (value: MonetizationDisclosure) => void }) {
  const change = (patch: Partial<MonetizationDisclosure>) => onChange({ ...value, ...patch });
  return <fieldset className="mt-6 rounded-xl border border-white/10 p-5 text-white"><legend className="px-2 font-bold">Monetization / Advertising</legend>
    <label className="block">Does this game contain advertising or monetization?<select className="admin-select mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3" value={value.mode === "none" ? "no" : "yes"} onChange={e => onChange(e.target.value === "no" ? emptyMonetization() : { ...emptyMonetization(), mode: "developer_ads" })}><option value="no">No</option><option value="yes">Yes</option></select></label>
    {value.mode !== "none" && <div className="mt-4 grid gap-4">
      <label>Integration type<select className="admin-select mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3" value={value.mode} onChange={e => change({ mode: e.target.value as MonetizationDisclosure["mode"] })}>{MONETIZATION_MODES.filter(mode => mode !== "none").map(mode => <option key={mode} value={mode}>{({ developer_ads: "Developer-managed ads", uniblex_ads: "Uniblex SDK / host-managed ads", hybrid: "Both integration types" } as Record<string, string>)[mode]}</option>)}</select></label>
      <p className="text-sm text-uniblex-gray">Third-party providers require review and are not endorsed by Uniblex. Host-managed ads are preferred; provider availability is not guaranteed. Earnings reporting is not yet available.</p>
      <label>Ad provider / monetization service<input className="mt-2 min-h-12 w-full rounded-xl bg-black/30 p-3" value={value.provider} maxLength={160} onChange={e => change({ provider: e.target.value })} /></label>
      <fieldset><legend>Ad formats</legend><div className="mt-2 flex flex-wrap gap-4">{AD_FORMATS.map(format => <label key={format} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={value.formats.includes(format)} onChange={e => change({ formats: e.target.checked ? [...value.formats, format] : value.formats.filter(f => f !== format) })} />{format}</label>)}</div></fieldset>
      <label className="flex gap-2"><input type="checkbox" checked={value.externalDestinations} onChange={e => change({ externalDestinations: e.target.checked })} />Ads open external destinations</label>
      <label>Integration details, external hosts, and review instructions<textarea className="mt-2 w-full rounded-xl bg-black/30 p-3" rows={4} maxLength={2000} value={value.notes} onChange={e => change({ notes: e.target.value })} /></label>
      <Link className="text-uniblex-blue underline" href="/game-monetization-policy" target="_blank">Read the advertising policy</Link>
      <label className="flex gap-2"><input type="checkbox" checked={value.policyVersion === AD_POLICY_VERSION} onChange={e => change({ policyVersion: e.target.checked ? AD_POLICY_VERSION : null })} />I confirm that this game's advertising complies with the Uniblex Game Monetization &amp; Advertising Policy.</label>
    </div>}
  </fieldset>;
}
