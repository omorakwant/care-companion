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
import { Button } from "@/components/ui/button";
import {
  Activity,
  LayoutDashboard,
  Users,
  BedDouble,
  ClipboardList,
  LogOut,
  Mic,
  UserCog,
} from "lucide-react";

type NavGroup = {
  label: string;
  items: { title: string; icon: typeof LayoutDashboard; path: string }[];
};

const navGroups: Record<string, NavGroup[]> = {
  admin: [
    {
      label: "Clinical",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        { title: "Patients", icon: Users, path: "/patients" },
        { title: "Beds", icon: BedDouble, path: "/beds" },
      ],
    },
    {
      label: "Shift Handoff",
      items: [
        { title: "Handoff Reports", icon: ClipboardList, path: "/handoff" },
        { title: "Record Handoff", icon: Mic, path: "/recordings" },
      ],
    },
    {
      label: "Admin",
      items: [
        { title: "User Management", icon: UserCog, path: "/admin/users" },
      ],
    },
  ],
  receptionist: [
    {
      label: "Clinical",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        { title: "Patients", icon: Users, path: "/patients" },
        { title: "Beds", icon: BedDouble, path: "/beds" },
      ],
    },
    {
      label: "Shift Handoff",
      items: [
        { title: "Handoff Reports", icon: ClipboardList, path: "/handoff" },
      ],
    },
  ],
  staff: [
    {
      label: "Clinical",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, path: "/" },
        { title: "Patients", icon: Users, path: "/patients" },
        { title: "Beds", icon: BedDouble, path: "/beds" },
      ],
    },
    {
      label: "Shift Handoff",
      items: [
        { title: "Handoff Reports", icon: ClipboardList, path: "/handoff" },
        { title: "Record Handoff", icon: Mic, path: "/recordings" },
      ],
    },
  ],
};

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  receptionist: "Receptionist",
  staff: "Staff",
};

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const groups = navGroups[role ?? "staff"];

  return (
    <Sidebar className="w-[256px]">
      <SidebarHeader className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">
              CareFlow
            </span>
            <p className="text-[10px] text-sidebar-foreground/50 -mt-0.5">
              Hospital Management
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(item.path)}
                        tooltip={item.title}
                        className={
                          isActive
                            ? "border-l-2 border-sidebar-primary bg-sidebar-accent rounded-none rounded-r-md"
                            : "border-l-2 border-transparent"
                        }
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sm font-semibold text-sidebar-primary shrink-0">
            {profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.display_name ?? "User"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50">
              {roleLabels[role ?? "staff"]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
