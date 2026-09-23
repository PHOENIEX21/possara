import { useState } from "react";
import { supabase } from "../lib/supabase";

export function SecureApplicationFile({path,label}:{path:string;label:string}) {
 const [url,setUrl]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function prepare(){setBusy(true);setError("");try{const {data,error}=await supabase.storage.from("job-documents").createSignedUrl(path,300);if(error)throw error;if(!data?.signedUrl)throw new Error("File is unavailable.");setUrl(data.signedUrl);}catch(error){setError(error instanceof Error?error.message:"Could not open this file.");}finally{setBusy(false);}}
 return <div className="min-w-0 rounded-xl bg-paper p-3"><p className="mb-2 break-words text-sm font-semibold">{label}</p><button disabled={busy} onClick={()=>void prepare()} className="text-xs font-semibold text-brand-dark">{busy?"Preparing...":url?"Refresh secure link":"Prepare secure link"}</button>{url&&<a href={url} target="_blank" rel="noopener noreferrer" className="ml-3 text-sm font-semibold underline">Open file</a>}{error&&<p role="alert" className="mt-1 text-xs text-flag">{error}</p>}</div>;
}
