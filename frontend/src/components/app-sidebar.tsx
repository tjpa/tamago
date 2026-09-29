import { Egg, Package, Receipt, Truck } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
} from "@/components/ui/sidebar"

const NAV = [
  { to: "/jobs", label: "Jobs", icon: Package },
  { to: "/drivers", label: "Drivers & vehicles", icon: Truck },
  { to: "/invoices", label: "Invoices", icon: Receipt },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  return (
    <Sidebar collapsible="none" className="h-svh">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent">
            <Egg className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Tamago</span>
            <span className="text-xs text-muted-foreground">Dispatch &amp; invoicing</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton render={<Link to={to} />} isActive={pathname.startsWith(to)}>
                    <Icon />
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 p-2">
          <Avatar>
            <AvatarFallback>DD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Dispatch desk</span>
            <span className="text-xs text-muted-foreground">ops@tamago.dev</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
