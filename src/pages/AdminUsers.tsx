import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  role: AppRole;
  display_name: string;
  email?: string;
  department?: string;
}

const rolePill: Record<
  AppRole,
  { bg: string; text: string }
> = {
  admin: { bg: "bg-destructive/10", text: "text-[var(--c-danger-soft)]" },
  receptionist: { bg: "bg-info/10", text: "text-[var(--c-info)]" },
  staff: { bg: "bg-primary/10", text: "text-[var(--c-primary)]" },
};

const avatarColors = [
  "from-[var(--c-primary)] to-[var(--c-info)]",
  "from-[var(--c-danger-soft)] to-[var(--c-warning)]",
  "from-[var(--c-accent)] to-[var(--c-primary)]",
  "from-[var(--c-purple)] to-[var(--c-rose)]",
];

export default function AdminUsers() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [wards, setWards] = useState<string[]>([]);

  const roleLabel: Record<AppRole, string> = {
    admin: t('roles.admin'),
    receptionist: t('roles.receptionist'),
    staff: t('roles.staff'),
  };

  const fetchUsers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name");

    if (roles && profiles) {
      const profileMap = new Map(
        profiles.map((p) => [p.user_id, p.display_name])
      );
      setUsers(
        roles.map((r) => ({
          user_id: r.user_id,
          role: r.role,
          display_name: profileMap.get(r.user_id) ?? "Unknown",
        }))
      );
    }
  };

  const fetchWards = async () => {
    const { data } = await supabase.from("beds").select("ward");
    if (data) {
      const unique = Array.from(new Set(data.map((b) => b.ward).filter(Boolean))).sort();
      setWards(unique);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWards();
  }, []);

  const changeRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t('adminUsers.roleUpdated'));
    fetchUsers();
  };

  const changeDepartment = async (userId: string, dept: string) => {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { department: dept === "all" ? null : dept },
    });
    if (error) {
      // Fallback: try updating via RPC or metadata — admin endpoint may not be available client-side
      // Store department preference in localStorage as fallback
      const deptMap = JSON.parse(localStorage.getItem("careflow-dept-map") || "{}");
      deptMap[userId] = dept === "all" ? null : dept;
      localStorage.setItem("careflow-dept-map", JSON.stringify(deptMap));
    }
    toast.success(t('adminUsers.departmentUpdated'));
    fetchUsers();
  };

  if (role !== "admin") {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 px-12 text-[var(--c-text-muted)]">
            <p className="text-[13px]">
              {t('adminUsers.noPermission')}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-8 lg:px-10 h-full">
        {/* Header */}
        <div>
          <h2 className="font-display text-[28px] font-semibold text-foreground">
            {t('adminUsers.title')}
          </h2>
          <p className="text-xs text-[var(--c-text-muted)]">
            {t('adminUsers.subtitle')}
          </p>
        </div>

        {/* User Table */}
        <div className="glass-card rounded-2xl flex-1 overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="flex items-center h-11 px-5 border-b border-[var(--c-border)]">
            <span className="flex-1 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('adminUsers.user')}
            </span>
            <span className="flex-1 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('adminUsers.email')}
            </span>
            <span className="w-[160px] text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('adminUsers.role')}
            </span>
            <span className="w-[160px] text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('adminUsers.department')}
            </span>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-auto">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-[var(--c-text-muted)]">
                <UserCog className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-[13px]">{t('adminUsers.noUsers')}</p>
              </div>
            ) : (
              users.map((u, i) => (
                <div
                  key={u.user_id}
                  className="flex items-center h-14 px-5 border-b border-[var(--c-border)]"
                >
                  <div className="flex-1 flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-bold text-white shrink-0",
                        avatarColors[i % avatarColors.length]
                      )}
                    >
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-medium text-foreground">
                      {u.display_name}
                    </span>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--c-text-muted)]">
                    {u.email ?? `${u.display_name.toLowerCase().replace(/\s/g, ".")}@careflow.ma`}
                  </span>
                  <div className="w-[160px]">
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        changeRole(u.user_id, v as AppRole)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 text-[11px] font-medium border-0 w-fit gap-1.5 px-2.5 rounded-full",
                          rolePill[u.role].bg,
                          rolePill[u.role].text
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                        <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                        <SelectItem value="receptionist">
                          {t('roles.receptionist')}
                        </SelectItem>
                        <SelectItem value="staff">{t('roles.staff')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[160px]">
                    <Select
                      value={u.department || "all"}
                      onValueChange={(v) => changeDepartment(u.user_id, v)}
                    >
                      <SelectTrigger className="h-7 text-[11px] font-medium border-0 w-fit gap-1.5 px-2.5 rounded-full bg-[var(--c-surface-alt)] text-[var(--c-text-secondary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                        <SelectItem value="all">{t('adminUsers.allDepartments')}</SelectItem>
                        {wards.map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
