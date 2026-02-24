import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Shield, FileSpreadsheet, Zap } from "lucide-react"

export function WelcomeCard() {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
            <Shield className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Welcome to CertiForge</CardTitle>
            <CardDescription>
              Your Rust-powered certificate automation platform
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 rounded-lg bg-card p-3 border border-border">
            <FileSpreadsheet className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Batch Generation</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate hundreds of certificates from CSV data in seconds
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-card p-3 border border-border">
            <Zap className="size-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Rust Engine</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Blazing fast image processing powered by a native Rust engine
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
