"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Menu, Moon, Sun, Bell } from "lucide-react"

interface AppHeaderProps {
  onMobileMenuOpen: () => void
  title?: string
  description?: string
}

export function AppHeader({ onMobileMenuOpen, title = "Dashboard", description = "Certificate automation overview" }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex items-center justify-between h-16 px-4 lg:px-6 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground"
          onClick={onMobileMenuOpen}
        >
          <Menu className="size-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="size-[18px]" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground"
        >
          <Sun className="size-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <div className="ml-2 flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          CF
        </div>
      </div>
    </header>
  )
}
