import { useEffect, useMemo, useState } from "react";
import { useMyOrganizations } from "./useHiring";

export type ActiveOrganizationIdentity = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  verified: boolean | null;
  verification_status: string | null;
  role: "owner" | "recruiter";
};

export function useActiveOrganizationIdentity() {
  const { data } = useMyOrganizations();
  const [version,setVersion]=useState(0);

  useEffect(()=>{
    const refresh=()=>setVersion((value)=>value+1);
    window.addEventListener("possara-acting-identity-change",refresh);
    window.addEventListener("storage",refresh);
    return()=>{
      window.removeEventListener("possara-acting-identity-change",refresh);
      window.removeEventListener("storage",refresh);
    };
  },[]);

  return useMemo<ActiveOrganizationIdentity | null>(() => {
    if (typeof window === "undefined") return null;
    const activeId = window.localStorage.getItem("possara-active-organization");
    if (!activeId) return null;
    const row = (data ?? []).find((item: any) => {
      const relation = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
      return relation?.id === activeId;
    }) as any;
    if (!row || !["owner", "recruiter"].includes(row.role)) return null;
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo_url: org.logo_url ?? null,
      verified: org.verified ?? false,
      verification_status: org.verification_status ?? null,
      role: row.role,
    };
  }, [data,version]);
}
