import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const activities = [
  {
    id: "1",
    action: "Batch certificate generation",
    file: "spring_2026_grads.csv",
    count: "342 certificates",
    status: "Completed",
    timestamp: "2 minutes ago",
  },
  {
    id: "2",
    action: "Template analysis",
    file: "award_template_v3.png",
    count: "1 file",
    status: "Completed",
    timestamp: "18 minutes ago",
  },
  {
    id: "3",
    action: "CSV validation",
    file: "employee_data.csv",
    count: "1,024 rows",
    status: "Warning",
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    action: "Font debug",
    file: "Montserrat-Bold.ttf",
    count: "1 file",
    status: "Completed",
    timestamp: "3 hours ago",
  },
  {
    id: "5",
    action: "Single image text overlay",
    file: "certificate_base.png",
    count: "1 certificate",
    status: "Completed",
    timestamp: "5 hours ago",
  },
  {
    id: "6",
    action: "Batch certificate generation",
    file: "workshop_attendees.csv",
    count: "89 certificates",
    status: "Failed",
    timestamp: "Yesterday",
  },
]

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Completed"
      ? "default"
      : status === "Warning"
        ? "secondary"
        : "destructive"

  return (
    <Badge
      variant={variant}
      className={
        status === "Completed"
          ? "bg-primary/15 text-primary border-primary/20 hover:bg-primary/20"
          : status === "Warning"
            ? "bg-chart-3/15 text-chart-3 border-chart-3/20 hover:bg-chart-3/20"
            : ""
      }
    >
      {status}
    </Badge>
  )
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest operations across all tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Action</TableHead>
              <TableHead className="hidden sm:table-cell">File</TableHead>
              <TableHead className="hidden md:table-cell">Output</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="font-medium text-foreground">
                  {activity.action}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-xs">
                  {activity.file}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {activity.count}
                </TableCell>
                <TableCell>
                  <StatusBadge status={activity.status} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground hidden lg:table-cell">
                  {activity.timestamp}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
