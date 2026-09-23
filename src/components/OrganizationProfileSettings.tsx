import { usePersistentDraft } from "../hooks/usePersistentDraft";
import { useAuth } from "../store/auth";
import { useState } from "react";
import { useUpdateOrganization } from "../hooks/useHiring";
import { ApplicationUploadFields } from "./ApplicationUploadFields";
import { DEFAULT_APPLICATION, validateApplicationDefaults, type ApplicationDefaults } from "../lib/applicationUploads";

export function OrganizationProfileSettings({ organization }: { organization: { id:string; description?:string; location?:string; website?:string; application_defaults?:ApplicationDefaults } }) {
  const {userId}=useAuth();
  const update=useUpdateOrganization(organization.id);
  const [description,setDescription]=usePersistentDraft(userId?`possara-org-settings:${userId}:${organization.id}:description`:null,organization.description||"");
  const [location,setLocation]=usePersistentDraft(userId?`possara-org-settings:${userId}:${organization.id}:location`:null,organization.location||"");
  const [website,setWebsite]=usePersistentDraft(userId?`possara-org-settings:${userId}:${organization.id}:website`:null,organization.website||"");
  const [defaults,setDefaults]=usePersistentDraft(userId?`possara-org-settings:${userId}:${organization.id}:defaults`:null,organization.application_defaults||DEFAULT_APPLICATION);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function save(event:React.FormEvent){
    event.preventDefault();setError("");setMessage("");
    try{await update.mutateAsync({description:description.trim(),location:location.trim(),website:website.trim()||null,application_defaults:validateApplicationDefaults(defaults)});setMessage("Organization profile and hiring defaults saved.");}
    catch(error){setError(error instanceof Error?error.message:"Could not save your changes.");}
  }
  return <form onSubmit={save} className="space-y-4 rounded-3xl border border-paper-dim bg-white p-5">
    <h2 className="text-lg font-semibold">Profile details</h2>
    <label className="block text-sm font-semibold">About<textarea rows={4} value={description} maxLength={800} onChange={event=>setDescription(event.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="block text-sm font-semibold">Location<input value={location} onChange={event=>setLocation(event.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="block text-sm font-semibold">Website<input type="url" value={website} onChange={event=>setWebsite(event.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <p className="text-sm text-ink-light">Upload defaults apply to new jobs. Existing jobs keep their own requirements.</p>
    <ApplicationUploadFields value={defaults} onChange={setDefaults}/>
    {error&&<p role="alert" className="text-sm text-flag">{error}</p>}{message&&<p role="status" className="text-sm text-trust-dark">{message}</p>}
    <button disabled={update.isPending} className="rounded-xl bg-brand px-4 py-3 font-semibold text-white disabled:opacity-50">{update.isPending?"Saving…":"Save profile and defaults"}</button>
  </form>;
}
