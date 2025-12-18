import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "user" | "accountant" | "hr_admin" | "project_manager";

// Available modules in the system
export const availableModules = [
  { id: "overview", label: "Tổng quan" },
  { id: "projects", label: "Dự án" },
  { id: "closed-projects", label: "Dự án đã đóng" },
  { id: "tasks", label: "Nhiệm vụ" },
  { id: "hr", label: "Nhân sự" },
  { id: "accounting", label: "Kế toán" },
  { id: "inventory", label: "Quản lí kho" },
  { id: "reports", label: "Báo cáo" },
  { id: "settings", label: "Cài đặt" },
  { id: "admin-users", label: "Quản lý người dùng" },
] as const;

export type ModuleId = typeof availableModules[number]["id"];

export const roleLabels: Record<AppRole, string> = {
  admin: "Quản trị viên",
  accountant: "Kế toán",
  hr_admin: "Hành chính nhân sự",
  project_manager: "Quản lí dự án",
  user: "Người dùng",
};

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("user");
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoleAndPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData?.role) {
          setRole(roleData.role as AppRole);
        }

        // If admin, grant all modules
        if (roleData?.role === "admin") {
          setAllowedModules(availableModules.map(m => m.id));
        } else {
          // Fetch module permissions - using type assertion until types are regenerated
          const { data: permData } = await (supabase
            .from("user_permissions" as any)
            .select("allowed_modules")
            .eq("user_id", user.id)
            .maybeSingle() as any);

          setAllowedModules(permData?.allowed_modules || ["overview"]);
        }
      } catch (error) {
        console.error("Error fetching role/permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoleAndPermissions();
  }, [user]);

  const hasAccess = (section: string): boolean => {
    // Admin always has access
    if (role === "admin") return true;
    return allowedModules.includes(section);
  };

  const getAllowedSections = (): string[] => {
    if (role === "admin") {
      return availableModules.map(m => m.id);
    }
    return allowedModules;
  };

  const isAdmin = role === "admin";

  return { role, loading, hasAccess, getAllowedSections, isAdmin, allowedModules };
};
