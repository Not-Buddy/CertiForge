"use client"

import { useCallback, useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { AnalyzeUpload, analyzePng, type PngMetadata } from "@/components/png-analyzer"
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
  Copy,
  Check,
  Ruler,
  Palette,
  Eye,
  Info,
  AlertTriangle,
  FileImage,
  Maximize2,
  Grid3X3,
  Scan,
  Server,
} from "lucide-react"
import { analyzePngServer, type PngAnalysis } from "@/lib/api-client"

type AnalysisState = "empty" | "analyzing" | "done" | "error"

export default function AnalyzePngPage() {
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<PngMetadata | null>(null)
  const [serverAnalysis, setServerAnalysis] = useState<PngAnalysis | null>(null)
  const [state, setState] = useState<AnalysisState>("empty")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setState("analyzing")
    setError("")
    setServerAnalysis(null)
    try {
      // Run both client-side and server-side analysis in parallel
      const [clientResult, serverResult] = await Promise.allSettled([
        analyzePng(f),
        analyzePngServer(f),
      ])

      if (clientResult.status === "fulfilled") {
        setMetadata(clientResult.value)
      } else {
        throw clientResult.reason
      }

      if (serverResult.status === "fulfilled") {
        setServerAnalysis(serverResult.value)
      }
      // Server failure is non-fatal — we still show client results

      setState("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
      setState("error")
    }
  }, [])

  const handleClear = useCallback(() => {
    if (metadata?.previewUrl) URL.revokeObjectURL(metadata.previewUrl)
    setFile(null)
    setMetadata(null)
    setServerAnalysis(null)
    setState("empty")
    setError("")
    setCopied(false)
  }, [metadata])

  const handleCopy = useCallback(() => {
    if (!metadata) return
    const lines = [
      `File: ${metadata.fileName}`,
      `Size: ${formatBytes(metadata.fileSize)}`,
      `Resolution: ${metadata.width} x ${metadata.height} px`,
      `Megapixels: ${metadata.megapixels} MP`,
      `Aspect Ratio: ${metadata.aspectRatio}`,
      `Color Mode: ${metadata.colorMode}`,
      `Bit Depth: ${metadata.bitDepth}-bit`,
      `Unique Colors: ${metadata.uniqueColors.toLocaleString()}${metadata.uniqueColors >= 99999 ? "+" : ""}`,
      `DPI: ${metadata.dpiX} x ${metadata.dpiY}`,
      `Transparency: ${metadata.hasTransparency ? `Yes (${metadata.transparentPixelPercent}% transparent pixels)` : "No"}`,
    ]
    if (serverAnalysis) {
      lines.push(``, `--- Server Analysis ---`)
      lines.push(`Color Type: ${serverAnalysis.color_type_str}`)
      lines.push(`Bit Depth (server): ${serverAnalysis.bit_depth_val}`)
      lines.push(`Pixel Count: ${serverAnalysis.pixel_count.toLocaleString()}`)
      lines.push(`Bytes/Pixel: ${serverAnalysis.bytes_per_pixel}`)
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [metadata, serverAnalysis])

  const warnings = getWarnings(metadata)

  return (
    <DashboardShell title="Analyze PNG File" description="Inspect certificate template metadata and quality">
      {/* Upload area - always visible at top */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Upload Template</CardTitle>
          <CardDescription>
            Drop a PNG certificate template to inspect its metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyzeUpload
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
              <p className="text-sm font-medium text-foreground">Analyzing image...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Reading pixel data and querying server
              </p>
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
      {state === "done" && metadata && (
        <>
          {/* Preview + Summary row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            {/* Image preview */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Preview</CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {metadata.width} x {metadata.height}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg border border-border overflow-hidden bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                  <img
                    src={metadata.previewUrl}
                    alt={`Preview of ${metadata.fileName}`}
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick summary */}
            <div className="flex flex-col gap-4">
              {/* Warnings */}
              {warnings.length > 0 && (
                <Card className="border-chart-3/30 bg-chart-3/5">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="size-4 text-chart-3" />
                      Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-2">
                      {warnings.map((w) => (
                        <li key={w.id} className="flex items-start gap-2.5">
                          <Badge
                            variant="outline"
                            className="shrink-0 mt-0.5 border-chart-3/40 text-chart-3 bg-chart-3/10"
                          >
                            {w.severity}
                          </Badge>
                          <span className="text-sm text-foreground leading-relaxed">{w.message}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* No-warnings card */}
              {warnings.length === 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex items-center justify-center size-9 rounded-full bg-primary/10">
                      <Check className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        No issues detected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This template looks good for certificate generation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* File info card */}
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileImage className="size-4 text-muted-foreground" />
                    File Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col gap-3">
                    <MetaRow label="File Name" value={metadata.fileName} mono />
                    <MetaRow label="File Size" value={formatBytes(metadata.fileSize)} />
                    <MetaRow label="Format" value="PNG (Portable Network Graphics)" />
                  </dl>
                </CardContent>
              </Card>

              {/* Server analysis card */}
              {serverAnalysis && (
                <Card className="border-primary/20 bg-primary/[0.02]">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="size-4 text-primary" />
                      Server Analysis
                    </CardTitle>
                    <CardDescription>Analyzed by the Rust backend engine</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="flex flex-col gap-3">
                      <MetaRow label="Color Type" value={serverAnalysis.color_type_str} />
                      <MetaRow label="Bit Depth" value={`${serverAnalysis.bit_depth_val}-bit`} />
                      <MetaRow label="Pixel Count" value={serverAnalysis.pixel_count.toLocaleString()} />
                      <MetaRow label="Bytes/Pixel" value={String(serverAnalysis.bytes_per_pixel)} />
                      <MetaRow label="Transparency" value={serverAnalysis.has_transparency ? "Yes" : "No"} />
                    </dl>
                  </CardContent>
                </Card>
              )}

              {!serverAnalysis && state === "done" && (
                <Card className="border-border bg-secondary/30">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex items-center justify-center size-9 rounded-full bg-secondary">
                      <Server className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Server analysis unavailable
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Start the Rust backend to enable server-side analysis.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Detailed metadata grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Dimensions */}
            <MetadataCard
              icon={Maximize2}
              title="Dimensions"
              entries={[
                { label: "Width", value: `${metadata.width.toLocaleString()} px` },
                { label: "Height", value: `${metadata.height.toLocaleString()} px` },
                { label: "Megapixels", value: `${metadata.megapixels} MP` },
                { label: "Aspect Ratio", value: metadata.aspectRatio },
              ]}
            />

            {/* Color */}
            <MetadataCard
              icon={Palette}
              title="Color"
              entries={[
                { label: "Color Mode", value: metadata.colorMode },
                { label: "Bit Depth", value: `${metadata.bitDepth}-bit` },
                {
                  label: "Unique Colors",
                  value: `${metadata.uniqueColors.toLocaleString()}${metadata.uniqueColors >= 99999 ? "+" : ""}`,
                },
              ]}
            />

            {/* Resolution */}
            <MetadataCard
              icon={Grid3X3}
              title="Resolution"
              entries={[
                { label: "DPI (X)", value: `${metadata.dpiX}` },
                { label: "DPI (Y)", value: `${metadata.dpiY}` },
                {
                  label: "Print Size",
                  value:
                    metadata.dpiX > 0
                      ? `${(metadata.width / metadata.dpiX).toFixed(1)}" x ${(metadata.height / metadata.dpiY).toFixed(1)}"`
                      : "N/A",
                },
              ]}
            />

            {/* Transparency */}
            <MetadataCard
              icon={Eye}
              title="Transparency"
              entries={[
                {
                  label: "Has Alpha",
                  value: metadata.hasTransparency ? "Yes" : "No",
                  badge: metadata.hasTransparency ? "RGBA" : "RGB",
                },
                {
                  label: "Transparent Pixels",
                  value: `${metadata.transparentPixelPercent}%`,
                },
              ]}
            />
          </div>

          <Separator />

          {/* Actions bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="size-3.5" />
              <span>
                DPI defaults to 72 if no pHYs chunk is present in the PNG file.
              </span>
            </div>
            <Button variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy Metadata
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Empty state - tips */}
      {state === "empty" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TipCard
            icon={Ruler}
            title="Resolution Check"
            description="Verify your template meets minimum resolution requirements for high-quality certificate printing."
          />
          <TipCard
            icon={Scan}
            title="Transparency Detection"
            description="Identify transparent regions in your template that may affect text rendering and background fill."
          />
          <TipCard
            icon={Palette}
            title="Color Analysis"
            description="Understand the color profile and bit depth of your template for consistent output across devices."
          />
        </div>
      )}
    </DashboardShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium text-foreground truncate max-w-[60%] text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  )
}

function MetadataCard({
  icon: Icon,
  title,
  entries,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  entries: { label: string; value: string; badge?: string }[]
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2.5">
          {entries.map((e) => (
            <div key={e.label} className="flex items-center justify-between gap-3">
              <dt className="text-xs text-muted-foreground">{e.label}</dt>
              <dd className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground font-mono">
                  {e.value}
                </span>
                {e.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {e.badge}
                  </Badge>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function TipCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface Warning {
  id: string
  severity: string
  message: string
}

function getWarnings(meta: PngMetadata | null): Warning[] {
  if (!meta) return []
  const w: Warning[] = []

  if (meta.width < 800 || meta.height < 600) {
    w.push({
      id: "low-res",
      severity: "Warning",
      message: `Resolution ${meta.width}x${meta.height} is below the recommended minimum of 800x600 for certificate printing.`,
    })
  }

  if (meta.dpiX < 150 && meta.dpiX !== 72) {
    w.push({
      id: "low-dpi",
      severity: "Warning",
      message: `DPI of ${meta.dpiX} is below the recommended 150 DPI for print-quality certificates.`,
    })
  }

  if (meta.fileSize > 10 * 1024 * 1024) {
    w.push({
      id: "large-file",
      severity: "Info",
      message: `File size of ${formatBytes(meta.fileSize)} is large and may slow down batch certificate generation.`,
    })
  }

  if (meta.hasTransparency && meta.transparentPixelPercent > 50) {
    w.push({
      id: "high-transparency",
      severity: "Info",
      message: `${meta.transparentPixelPercent}% of pixels are transparent. Ensure this is intentional for your template layout.`,
    })
  }

  if (meta.uniqueColors <= 2) {
    w.push({
      id: "low-color",
      severity: "Info",
      message: "Very few unique colors detected. This may be a placeholder or monochrome template.",
    })
  }

  return w
}
