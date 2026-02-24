import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, LayoutTemplate, FileSpreadsheet, Activity } from "lucide-react"

const stats = [
  {
    label: "Total Certificates Generated",
    value: "12,847",
    change: "+14.2%",
    changeType: "positive" as const,
    icon: Award,
  },
  {
    label: "Templates Available",
    value: "24",
    change: "+3 new",
    changeType: "positive" as const,
    icon: LayoutTemplate,
  },
  {
    label: "CSV Files Processed",
    value: "1,293",
    change: "+8.1%",
    changeType: "positive" as const,
    icon: FileSpreadsheet,
  },
  {
    label: "System Status",
    value: "Operational",
    change: "99.9% uptime",
    changeType: "neutral" as const,
    icon: Activity,
  },
]

export function StatsCards() {
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
                  <Icon className="size-4 text-primary" />
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
                {stat.changeType === "positive" && " from last month"}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
