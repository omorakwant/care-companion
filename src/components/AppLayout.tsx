import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-5">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          {title && (
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          )}
        </header>
        <main className="flex-1 p-5 md:p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
