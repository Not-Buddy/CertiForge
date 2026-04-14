"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, LayoutTemplate, Type, Activity, Loader2 } from "lucide-react"
import { fetchTemplates, fetchFonts } from "@/lib/api-client"

interface StatsData {
  templateCount: number | null
  fontCount: number | null
  serverStatus: "loading" | "online" | "offline"
}

export function StatsCards() {
  const [data, setData] = useState<StatsData>({
    templateCount: null,
    fontCount: null,
    serverStatus: "loading",
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      let templateCount: number | null = null
      let fontCount: number | null = null
      let serverStatus: "online" | "offline" = "offline"

      try {
        const [templates, fonts] = await Promise.all([
          fetchTemplates().catch(() => null),
          fetchFonts().catch(() => null),
        ])

        if (templates !== null) {
          templateCount = templates.length
          serverStatus = "online"
        }
        if (fonts !== null) {
          fontCount = fonts.length
          serverStatus = "online"
        }
      } catch {
        serverStatus = "offline"
      }

      if (!cancelled) {
        setData({ templateCount, fontCount, serverStatus })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = [
    {
      label: "Templates Available",
      value:
        data.templateCount !== null
          ? String(data.templateCount)
          : data.serverStatus === "loading"
            ? "—"
            : "N/A",
      change:
        data.templateCount !== null
          ? `${data.templateCount} on server`
          : "Connect backend to see",
      changeType: data.templateCount !== null ? ("positive" as const) : ("neutral" as const),
      icon: LayoutTemplate,
      loading: data.serverStatus === "loading",
    },
    {
      label: "Fonts Available",
      value:
        data.fontCount !== null
          ? String(data.fontCount)
          : data.serverStatus === "loading"
            ? "—"
            : "N/A",
      change:
        data.fontCount !== null
          ? `${data.fontCount} in assets/`
          : "Connect backend to see",
      changeType: data.fontCount !== null ? ("positive" as const) : ("neutral" as const),
      icon: Type,
      loading: data.serverStatus === "loading",
    },
    {
      label: "System Status",
      value:
        data.serverStatus === "loading"
          ? "Checking..."
          : data.serverStatus === "online"
            ? "Online"
            : "Offline",
      change:
        data.serverStatus === "online"
          ? "Rust backend connected"
          : data.serverStatus === "loading"
            ? "Connecting..."
            : "Start backend with cargo run",
      changeType:
        data.serverStatus === "online" ? ("positive" as const) : ("neutral" as const),
      icon: Activity,
      loading: data.serverStatus === "loading",
    },
    {
      label: "Certificate Engine",
      value: "CertiForge",
      change: "Rust + Actix-web powered",
      changeType: "neutral" as const,
      icon: Award,
      loading: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                  {stat.loading ? (
                    <Loader2 className="size-4 text-primary animate-spin" />
                  ) : (
                    <Icon className="size-4 text-primary" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground tracking-tight">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span
                  className={
                    stat.changeType === "positive"
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {stat.change}
                </span>
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
