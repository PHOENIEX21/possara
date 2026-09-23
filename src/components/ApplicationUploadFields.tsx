import { DOCUMENT_TYPES, type ApplicationDefaults } from "../lib/applicationUploads";

export function ApplicationUploadFields({ value, onChange }: { value: ApplicationDefaults; onChange: (value: ApplicationDefaults) => void }) {
  return <fieldset className="space-y-3 rounded-2xl border border-paper-dim p-4">
    <legend className="px-1 font-semibold">Applicant upload fields</legend>
    <p className="text-sm text-ink-light">Request a CV, certificate, portfolio, photo, or another document. Each field accepts one file, up to 10 MB.</p>
    {value.labels.map((label, index) => <div key={index} className="flex items-end gap-2">
      <label className="min-w-0 flex-1 text-sm font-semibold">Field {index + 1}<input maxLength={100} value={label} placeholder="e.g. Portfolio or certificate" onChange={event => onChange({ ...value, labels: value.labels.map((item, i) => i === index ? event.target.value : item) })} className="mt-1 w-full rounded-xl border p-3" /></label>
      {value.labels.length > 1 && <button type="button" aria-label={`Remove field ${index + 1}`} onClick={() => onChange({ ...value, labels: value.labels.filter((_, i) => i !== index) })} className="px-2 py-3 text-sm text-flag">Remove</button>}
    </div>)}
    <button type="button" disabled={value.labels.length >= 10} onClick={() => onChange({ ...value, labels: [...value.labels, ""] })} className="rounded-xl bg-paper px-3 py-2 text-sm font-semibold">+ Add upload field</button>
    <fieldset><legend className="mb-2 text-sm font-semibold">Accepted formats</legend><div className="flex flex-wrap gap-3">{DOCUMENT_TYPES.map(item => <label key={item.mime} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={value.accept.includes(item.mime)} onChange={event => onChange({ ...value, accept: event.target.checked ? [...value.accept, item.mime] : value.accept.filter(type => type !== item.mime) })} />{item.label}</label>)}</div></fieldset>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.required} onChange={event => onChange({ ...value, required: event.target.checked })} />Require every listed upload</label>
  </fieldset>;
}
