"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  ImagePlus,
  FileSpreadsheet,
  ScanSearch,
  FilePlus2,
  Bug,
  FileCode2,
  Type,
  FolderOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Shield,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Add Text to Single Image", icon: ImagePlus, href: "/add-text-to-image" },
  { label: "Generate Certificates from CSV", icon: FileSpreadsheet, href: "/generate-from-csv" },
  { label: "Analyze PNG File", icon: ScanSearch, href: "/analyze-png" },
  { label: "Create Sample CSV", icon: FilePlus2, href: "/create-sample-csv" },
  { label: "Debug CSV File", icon: Bug, href: "/debug-csv" },
  { label: "Debug Template File", icon: FileCode2, href: "/debug-template" },
  { label: "Debug Font Files", icon: Type, href: "/debug-fonts" },
  { label: "File Organization Tips", icon: FolderOpen, href: "/file-organization-tips" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        const link = (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )

        if (collapsed) {
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        }

        return link
      })}
    </nav>
  )
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        <div className={cn(
          "flex items-center h-16 px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-sidebar-primary">
                <Shield className="size-4 text-sidebar-primary-foreground" />
              </div>
              <span className="text-base font-semibold text-sidebar-foreground tracking-tight">CertiForge</span>
            </div>
          )}
          {collapsed && (
            <div className="flex items-center justify-center size-8 rounded-lg bg-sidebar-primary">
              <Shield className="size-4 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-2">
          <SidebarNav collapsed={collapsed} />
        </ScrollArea>

        <div className="border-t border-sidebar-border p-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              collapsed ? "justify-center px-0" : "justify-start"
            )}
          >
            {collapsed ? (
              <PanelLeft className="size-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="size-[18px]" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-[280px] bg-sidebar p-0 border-sidebar-border">
          <SheetHeader className="h-16 px-4 justify-center border-b border-sidebar-border">
            <SheetTitle>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-8 rounded-lg bg-sidebar-primary">
                  <Shield className="size-4 text-sidebar-primary-foreground" />
                </div>
                <span className="text-base font-semibold text-sidebar-foreground tracking-tight">CertiForge</span>
              </div>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 py-2">
            <SidebarNav collapsed={false} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
