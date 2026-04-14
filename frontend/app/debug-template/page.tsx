"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { TemplateUpload, analyzeTemplate, type TemplateAnalysis } from "@/components/template-analyzer"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  Check,
  AlertTriangle,
  AlertCircle,
  Zap,
  Maximize,
  Eye,
  Info,
  FileImage,
  Server,
} from "lucide-react"
import { analyzePngServer, type PngAnalysis } from "@/lib/api-client"

type AnalysisState = "empty" | "analyzing" | "done" | "error"

function getStatusBadgeVariant(status: "ok" | "warning" | "error") {
  if (status === "error") return "destructive"
  if (status === "warning") return "secondary"
  return "default"
}

function getStatusIcon(status: "ok" | "warning" | "error") {
  if (status === "error") return <AlertCircle className="size-4" />
  if (status === "warning") return <AlertTriangle className="size-4" />
  return <Check className="size-4" />
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DebugTemplatePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null)
  const [serverAnalysis, setServerAnalysis] = useState<PngAnalysis | null>(null)
  const [state, setState] = useState<AnalysisState>("empty")
  const [error, setError] = useState("")

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setState("analyzing")
    setError("")
    setServerAnalysis(null)
    try {
      const [clientResult, serverResult] = await Promise.allSettled([
        analyzeTemplate(f),
        analyzePngServer(f),
      ])

      if (clientResult.status === "fulfilled") {
        setAnalysis(clientResult.value)
      } else {
        throw clientResult.reason
      }

      if (serverResult.status === "fulfilled") {
        setServerAnalysis(serverResult.value)
      }

      setState("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
      setState("error")
    }
  }, [])

  const handleClear = useCallback(() => {
    if (analysis?.previewUrl) URL.revokeObjectURL(analysis.previewUrl)
    setFile(null)
    setAnalysis(null)
    setServerAnalysis(null)
    setState("empty")
    setError("")
  }, [analysis])

  return (
    <DashboardShell title="Debug Template File" description="Analyze certificate template compatibility and quality">
      {/* Upload area */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Upload Template</CardTitle>
          <CardDescription>Drop a PNG certificate template to check compatibility</CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateUpload
            onFile={handleFile}
            currentFile={file}
            onClear={handleClear}
            analyzing={state === "analyzing"}
          />
        </CardContent>
      </Card>

      {/* Analyzing state */}
      {state === "analyzing" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center size-14 rounded-full bg-primary/10">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Analyzing template...</p>
              <p className="text-xs text-muted-foreground mt-1">Checking compatibility and extracting metadata</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {state === "error" && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground">Analysis Failed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {state === "done" && analysis && (
        <>
          {/* Preview + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            {/* Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjJmNGY3Ii8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2YyZjRmNyIvPjwvc3ZnPgo=')] rounded-lg border border-border overflow-auto flex items-center justify-center max-h-96">
                  <img
                    src={analysis.previewUrl}
                    alt={analysis.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="flex flex-col gap-4">
              {/* File info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">File Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-mono text-foreground">{analysis.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-mono text-foreground">{formatBytes(analysis.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="font-mono text-foreground">
                      {analysis.width} × {analysis.height} px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DPI</span>
                    <span className="font-mono text-foreground">
                      {analysis.dpiX} × {analysis.dpiY}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Server analysis */}
              {serverAnalysis && (
                <Card className="border-primary/20 bg-primary/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="size-4 text-primary" />
                      Server Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Color Type</span>
                      <span className="font-mono text-foreground">{serverAnalysis.color_type_str}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bit Depth</span>
                      <span className="font-mono text-foreground">{serverAnalysis.bit_depth_val}-bit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pixels</span>
                      <span className="font-mono text-foreground">{serverAnalysis.pixel_count.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Overall Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-center size-8 rounded-full bg-primary/10">
                      <Zap className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Template Ready</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.checks.resolution.status === "ok"
                          ? "All checks passed"
                          : "Review warnings below"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Checks grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resolution check */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Resolution</CardTitle>
                  <Badge variant={getStatusBadgeVariant(analysis.checks.resolution.status)} className="gap-1">
                    {getStatusIcon(analysis.checks.resolution.status)}
                    {analysis.checks.resolution.status.charAt(0).toUpperCase() +
                      analysis.checks.resolution.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-foreground font-medium">{analysis.checks.resolution.message}</p>
                <p className="text-muted-foreground text-xs">{analysis.checks.resolution.details}</p>
              </CardContent>
            </Card>

            {/* Text-safe area */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Text Safe Area</CardTitle>
                  <Badge variant={getStatusBadgeVariant(analysis.checks.textSafeArea.status)} className="gap-1">
                    {getStatusIcon(analysis.checks.textSafeArea.status)}
                    {analysis.checks.textSafeArea.status.charAt(0).toUpperCase() +
                      analysis.checks.textSafeArea.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-foreground font-medium">{analysis.checks.textSafeArea.message}</p>
                <p className="text-muted-foreground text-xs">{analysis.checks.textSafeArea.details}</p>
              </CardContent>
            </Card>

            {/* Transparency */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Transparency</CardTitle>
                  <Badge variant={getStatusBadgeVariant(analysis.checks.transparency.status)} className="gap-1">
                    {getStatusIcon(analysis.checks.transparency.status)}
                    {analysis.checks.transparency.status.charAt(0).toUpperCase() +
                      analysis.checks.transparency.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-foreground font-medium">{analysis.checks.transparency.message}</p>
                <p className="text-muted-foreground text-xs">{analysis.checks.transparency.details}</p>
              </CardContent>
            </Card>

            {/* Font sizing */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Font Sizing</CardTitle>
                  <Badge variant={getStatusBadgeVariant(analysis.checks.fontSizing.status)} className="gap-1">
                    {getStatusIcon(analysis.checks.fontSizing.status)}
                    {analysis.checks.fontSizing.status.charAt(0).toUpperCase() +
                      analysis.checks.fontSizing.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-foreground font-medium">{analysis.checks.fontSizing.message}</p>
                <p className="text-muted-foreground text-xs">
                  Recommended: {analysis.checks.fontSizing.recommendedMin}pt to{" "}
                  {analysis.checks.fontSizing.recommendedMax}pt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recommendations</CardTitle>
                <AlertCircle className="size-5 text-primary" />
              </div>
              <CardDescription>Suggestions to optimize this template for batch generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0 mt-0.5">
                      <Info className="size-3 text-primary" />
                    </div>
                    <p className="text-sm text-foreground">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Helpful tip */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileImage className="size-4" />
                Ready to Generate?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground mb-4">
                This template is ready to use with the batch certificate generation tool.
              </p>
              <Button className="w-full" onClick={() => router.push("/generate-from-csv")}>
                Go to Batch Generation
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  )
}
