import { useMemo } from "react";
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
  return useMemo<ActiveOrganizationIdentity | null>(() => {
    if (typeof window === "undefined") return null;
    const activeId = window.localStorage.getItem("possara-active-organization");
    if (!activeId) return null;
    const row = (data ?? []).find((item: any) => item.organizations?.id === activeId);
    if (!row || !["owner", "recruiter"].includes(row.role)) return null;
    const org = row.organizations;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo_url: org.logo_url ?? null,
      verified: org.verified ?? false,
      verification_status: org.verification_status ?? null,
      role: row.role,
    };
  }, [data]);
}
