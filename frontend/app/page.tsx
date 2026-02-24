"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { WelcomeCard } from "@/components/welcome-card"
import { StatsCards } from "@/components/stats-cards"
import { RecentActivity } from "@/components/recent-activity"

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard" description="Certificate automation overview">
      <WelcomeCard />
      <StatsCards />
      <RecentActivity />
    </DashboardShell>
  )
}
