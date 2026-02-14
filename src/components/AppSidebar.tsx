import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  LayoutDashboard,
  Users,
  BedDouble,
  ListTodo,
  Settings,
  LogOut,
  Mic,
  Shield,
  UserCog,
} from "lucide-react";

const menuItems = {
  admin: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Patients", icon: Users, path: "/patients" },
    { title: "Beds", icon: BedDouble, path: "/beds" },
    { title: "Tasks", icon: ListTodo, path: "/tasks" },
    { title: "Recordings", icon: Mic, path: "/recordings" },
    { title: "User Management", icon: UserCog, path: "/admin/users" },
  ],
  receptionist: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Patients", icon: Users, path: "/patients" },
    { title: "Beds", icon: BedDouble, path: "/beds" },
    { title: "Tasks", icon: ListTodo, path: "/tasks" },
  ],
  staff: [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Patients", icon: Users, path: "/patients" },
    { title: "Tasks", icon: ListTodo, path: "/tasks" },
    { title: "Recordings", icon: Mic, path: "/recordings" },
  ],
};

const roleLabels = {
  admin: "Admin",
  receptionist: "Receptionist",
  staff: "Staff",
};

const roleColors = {
  admin: "bg-destructive/20 text-destructive border-destructive/30",
  receptionist: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
  staff: "bg-primary/20 text-primary border-primary/30",
};

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = menuItems[role ?? "staff"];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Heart className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">CareFlow</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground shrink-0">
            {profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.display_name ?? "User"}
            </p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColors[role ?? "staff"]}`}>
              {roleLabels[role ?? "staff"]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
