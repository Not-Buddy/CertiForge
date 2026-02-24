"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DashboardShellProps {
  children: React.ReactNode
  title: string
  description: string
}

export function DashboardShell({ children, title, description }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          title={title}
          description={description}
        />

        <ScrollArea className="flex-1">
          <main className="p-4 lg:p-6">
            <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
              {children}
            </div>
          </main>
        </ScrollArea>
      </div>
    </div>
  )
}
