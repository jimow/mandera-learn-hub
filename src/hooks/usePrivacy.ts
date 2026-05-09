import { useAuth } from "@/contexts/AuthContext";
import { useSettingsMap } from "./useSettings";

export function maskValue(v?: string | null) {
  if (!v) return v as any;
  if (v.length <= 4) return "•".repeat(v.length);
  return v.slice(0, 2) + "•".repeat(Math.max(3, v.length - 4)) + v.slice(-2);
}

/**
 * Returns helpers that mask PII (phone, email, ID, address) for non-privileged roles
 * when the system setting privacy.mask_pii is enabled.
 */
export function usePrivacy() {
  const { isAdmin, hasRole, hasPermission } = useAuth();
  const { map } = useSettingsMap();
  const maskEnabled = map["privacy.mask_pii"] !== false;
  const canViewPii =
    isAdmin() ||
    hasRole("education_officer") ||
    hasRole("center_admin") ||
    hasPermission("students", "view_sensitive") ||
    hasPermission("teachers", "view_sensitive");

  const shouldMask = maskEnabled && !canViewPii;

  return {
    shouldMask,
    canViewPii,
    mask: (v?: string | null) => (shouldMask ? maskValue(v) : v),
    maskStudent: <T extends Record<string, any>>(s: T): T => {
      if (!shouldMask) return s;
      return {
        ...s,
        parent_phone: maskValue(s.parent_phone),
        parent_email: maskValue(s.parent_email),
        address: s.address ? "•••••" : s.address,
        admission_number: maskValue(s.admission_number),
      } as T;
    },
    maskTeacher: <T extends Record<string, any>>(t: T): T => {
      if (!shouldMask) return t;
      return {
        ...t,
        phone: maskValue(t.phone),
        email: maskValue(t.email),
        national_id: maskValue(t.national_id),
      } as T;
    },
    maskUser: <T extends Record<string, any>>(u: T): T => {
      if (!shouldMask) return u;
      return { ...u, phone: maskValue(u.phone), email: maskValue(u.email) } as T;
    },
  };
}
