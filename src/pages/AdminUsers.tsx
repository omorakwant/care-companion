import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, type Column } from "@/components/DataTable";
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
}

const rolePill: Record<AppRole, { bg: string; text: string }> = {
  admin: { bg: "bg-red-50", text: "text-red-700" },
  receptionist: { bg: "bg-amber-50", text: "text-amber-700" },
  staff: { bg: "bg-blue-50", text: "text-blue-700" },
};

const roleLabel: Record<AppRole, string> = {
  admin: "Admin",
  receptionist: "Receptionist",
  staff: "Staff",
};

export default function AdminUsers() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);

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

  useEffect(() => {
    fetchUsers();
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
    toast.success("Role updated");
    fetchUsers();
  };

  if (role !== "admin") {
    return (
      <AppLayout title="User Management">
        <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">You don't have permission to access this page.</p>
        </div>
      </AppLayout>
    );
  }

  const columns: Column<UserWithRole>[] = [
    {
      key: "avatar",
      header: "",
      className: "w-12",
      render: (u) => (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
          {u.display_name.charAt(0).toUpperCase()}
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (u) => (
        <span className="text-sm font-medium">{u.display_name}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => {
        const p = rolePill[u.role];
        return (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              p.bg,
              p.text
            )}
          >
            {roleLabel[u.role]}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Change Role",
      className: "w-[180px]",
      render: (u) => (
        <Select
          value={u.role}
          onValueChange={(v) => changeRole(u.user_id, v as AppRole)}
        >
          <SelectTrigger className="h-8 text-xs w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <AppLayout title="User Management">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.length} user(s) registered
          </p>
        </div>
        <DataTable
          columns={columns}
          data={users}
          emptyIcon={<UserCog className="w-10 h-10 opacity-40" />}
          emptyMessage="No users found"
        />
      </div>
    </AppLayout>
  );
}
