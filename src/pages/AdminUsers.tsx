import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  role: AppRole;
  display_name: string;
}

const roleColors: Record<AppRole, string> = {
  admin: "bg-destructive/15 text-destructive",
  receptionist: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  staff: "bg-primary/15 text-primary",
};

export default function AdminUsers() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);

  const fetchUsers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");

    if (roles && profiles) {
      const profileMap = new Map(profiles.map((p) => [p.user_id, p.display_name]));
      setUsers(
        roles.map((r) => ({
          user_id: r.user_id,
          role: r.role,
          display_name: profileMap.get(r.user_id) ?? "Unknown",
        }))
      );
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
    fetchUsers();
  };

  if (role !== "admin") {
    return (
      <AppLayout title="User Management">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="User Management">
      <div className="space-y-2">
        {users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UserCog className="w-10 h-10 mb-2" />
              <p>No users found</p>
            </CardContent>
          </Card>
        ) : (
          users.map((u) => (
            <Card key={u.user_id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {u.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.display_name}</p>
                </div>
                <Select value={u.role} onValueChange={(v) => changeRole(u.user_id, v as AppRole)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
