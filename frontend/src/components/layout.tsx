import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex flex-1 flex-col gap-6 p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
