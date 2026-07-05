export type AdminProfile = {
  id: string;
  email: string;
  display_name: string | null;
  role: "owner" | "admin";
  is_active: boolean;
};

export const allowedAdminRoles = ["owner", "admin"] as const;
export const adminPasswordRecoveryRedirectUrl = "https://www.uniblex.com/admin/reset-password";

export function isAllowedAdminRole(role: unknown): role is AdminProfile["role"] {
  return role === "owner" || role === "admin";
}
