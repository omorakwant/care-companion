import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Users,
  BedDouble,
  ClipboardList,
  LogOut,
  Mic,
  UserCog,
  Activity,
  Sun,
  Moon,
  Globe,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  titleKey: string;
  icon: typeof LayoutDashboard;
  path: string;
};
type NavGroup = { labelKey: string; items: NavItem[] };

const navGroups: Record<string, NavGroup[]> = {
  admin: [
    {
      labelKey: "nav.clinical",
      items: [
        { titleKey: "nav.dashboard", icon: LayoutDashboard, path: "/" },
        { titleKey: "nav.patients", icon: Users, path: "/patients" },
        { titleKey: "nav.beds", icon: BedDouble, path: "/beds" },
      ],
    },
    {
      labelKey: "nav.shiftHandoff",
      items: [
        { titleKey: "nav.handoffReports", icon: ClipboardList, path: "/handoff" },
        { titleKey: "nav.recordHandoff", icon: Mic, path: "/recordings" },
      ],
    },
    {
      labelKey: "nav.admin",
      items: [
        { titleKey: "nav.userManagement", icon: UserCog, path: "/admin/users" },
        { titleKey: "nav.bulkImport", icon: FileSpreadsheet, path: "/admin/import" },
      ],
    },
  ],
  receptionist: [
    {
      labelKey: "nav.clinical",
      items: [
        { titleKey: "nav.dashboard", icon: LayoutDashboard, path: "/" },
        { titleKey: "nav.patients", icon: Users, path: "/patients" },
        { titleKey: "nav.beds", icon: BedDouble, path: "/beds" },
      ],
    },
    {
      labelKey: "nav.shiftHandoff",
      items: [
        { titleKey: "nav.handoffReports", icon: ClipboardList, path: "/handoff" },
      ],
    },
  ],
  staff: [
    {
      labelKey: "nav.clinical",
      items: [
        { titleKey: "nav.dashboard", icon: LayoutDashboard, path: "/" },
        { titleKey: "nav.patients", icon: Users, path: "/patients" },
        { titleKey: "nav.beds", icon: BedDouble, path: "/beds" },
      ],
    },
    {
      labelKey: "nav.shiftHandoff",
      items: [
        { titleKey: "nav.handoffReports", icon: ClipboardList, path: "/handoff" },
        { titleKey: "nav.recordHandoff", icon: Mic, path: "/recordings" },
      ],
    },
  ],
};

const roleKeys: Record<string, string> = {
  admin: "roles.admin",
  receptionist: "roles.receptionist",
  staff: "roles.staff",
};

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const groups = navGroups[role ?? "staff"];

  return (
    <aside className="w-[260px] shrink-0 h-screen bg-[var(--c-surface)] border-r border-white/[0.04] flex flex-col justify-between py-6 px-5 shadow-[4px_0_24px_rgba(0,0,0,0.25)]">
      {/* Top section */}
      <div className="flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] gradient-primary flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display text-[22px] font-semibold text-[var(--c-text)]">
            CareFlow
          </span>
        </div>

        {/* Nav groups */}
        {groups.map((group) => (
          <div key={group.labelKey} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium tracking-[1.5px] text-[var(--c-text-dim)] mb-2 uppercase">
              {t(group.labelKey)}
            </span>
            {group.items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/" &&
                  location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-2.5 h-[42px] px-3 rounded-[10px] transition-all text-left w-full",
                    isActive
                      ? "bg-gradient-to-b from-[var(--c-border)] to-[var(--c-border)] border border-primary/20 text-[var(--c-text)]"
                      : "text-[var(--c-text-secondary)] hover:text-[var(--c-text)] hover:bg-white/[0.03] border border-transparent"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="text-[13px] font-normal">{t(item.titleKey)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-3">
        {/* Theme & Language toggles */}
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-border)]">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-8 px-3 rounded-full bg-white/[0.06] text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-white/[0.1] transition-colors"
            title={theme === "dark" ? t("settings.lightMode") : t("settings.darkMode")}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "fr" : "en")
            }
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/[0.06] text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-white/[0.1] transition-colors"
            title={t("settings.language")}
          >
            <Globe className="w-4 h-4" />
            <span className="text-[11px] font-medium uppercase">
              {i18n.language === "en" ? "FR" : "EN"}
            </span>
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[var(--c-primary)] to-[var(--c-purple)] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--c-text)] truncate">
              {profile?.display_name ?? "User"}
            </p>
            <p className="text-[11px] text-[var(--c-text-muted)]">
              {t(roleKeys[role ?? "staff"])}
            </p>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-white/[0.05] transition-colors"
            title={t("auth.signOut")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
