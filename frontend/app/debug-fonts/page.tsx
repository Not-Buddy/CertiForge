"use client"

import { useState, useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { FontUpload } from "@/components/font-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, AlertTriangle, Download, Copy, Check, Loader2, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchFonts, type FontInfo } from "@/lib/api-client"

interface FontFile {
  name: string
  size: number
  type: string
}

interface UploadedFont extends FontFile {
  previewText: string
}

const sampleText = "The quick brown fox jumps over the lazy dog"
const testCharsets = {
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  extended: "àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ",
  greek: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
  cyrillic: "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
}

export default function DebugFontsPage() {
  const [uploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([])
  const [serverFonts, setServerFonts] = useState<FontInfo[]>([])
  const [loadingServerFonts, setLoadingServerFonts] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("server")

  // Fetch real server fonts on mount
  useEffect(() => {
    fetchFonts()
      .then((fonts) => {
        setServerFonts(fonts)
      })
      .catch(() => {
        // Server unavailable
      })
      .finally(() => setLoadingServerFonts(false))
  }, [])

  // Refresh server fonts after upload
  const refreshServerFonts = () => {
    setLoadingServerFonts(true)
    fetchFonts()
      .then((fonts) => setServerFonts(fonts))
      .catch(() => {})
      .finally(() => setLoadingServerFonts(false))
  }

  const handleFontUpload = (files: FontFile[]) => {
    const newFonts: UploadedFont[] = files.map((file) => ({
      ...file,
      previewText: sampleText,
    }))
    setUploadedFonts((prev) => [...prev, ...newFonts])
    // Refresh server fonts after a brief delay to let upload complete
    setTimeout(refreshServerFonts, 1500)
  }

  const handleClearFont = (index: number) => {
    setUploadedFonts((prev) => prev.filter((_, i) => i !== index))
  }

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      serverFonts: serverFonts.map((f) => ({
        name: f.name,
        size_bytes: f.size_bytes,
      })),
      uploadedFonts: uploadedFonts.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      })),
    }
    return JSON.stringify(report, null, 2)
  }

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReport())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadReport = () => {
    const report = generateReport()
    const element = document.createElement("a")
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(report)}`)
    element.setAttribute("download", `font-report-${Date.now()}.json`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <DashboardShell title="Debug Font Files" description="Analyze font compatibility and availability">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Upload and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Font Files</CardTitle>
              <CardDescription>
                Add TTF, OTF, WOFF, or WOFF2 font files — they will be uploaded to the server&apos;s assets/ directory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FontUpload
                onFilesLoad={handleFontUpload}
                currentFiles={uploadedFonts}
                onClear={handleClearFont}
                maxFiles={5}
              />
            </CardContent>
          </Card>

          {/* Font Library Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Font Library</CardTitle>
              <CardDescription>
                View server-available fonts and uploaded fonts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="server">
                    Server Fonts
                    {serverFonts.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {serverFonts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="uploaded">
                    Uploaded
                    {uploadedFonts.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {uploadedFonts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="server" className="space-y-3 mt-4">
                  {loadingServerFonts ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 className="size-6 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading server fonts...</p>
                    </div>
                  ) : serverFonts.length === 0 ? (
                    <div className="text-center py-8 rounded-lg border border-dashed border-border">
                      <Server className="size-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">No fonts found on server</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload TTF/OTF files above or add them to the backend&apos;s assets/ directory.
                        The backend may also be offline.
                      </p>
                    </div>
                  ) : (
                    serverFonts.map((font) => {
                      const ext = font.name.split(".").pop()?.toUpperCase() || "TTF"
                      return (
                        <div key={font.name} className="rounded-lg border border-border p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{font.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {ext} • {formatBytes(font.size_bytes)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Server className="size-3" />
                                Available
                              </Badge>
                              <Badge>{ext}</Badge>
                            </div>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1 font-mono">Preview (system fallback):</p>
                            <p className="text-sm text-foreground">{sampleText}</p>
                          </div>
                        </div>
                      )
                    })
                  )}

                  {!loadingServerFonts && serverFonts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshServerFonts}
                      className="w-full"
                    >
                      Refresh Font List
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="uploaded" className="space-y-3 mt-4">
                  {uploadedFonts.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No fonts uploaded in this session</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload fonts above — they will be sent to the server automatically
                      </p>
                    </div>
                  ) : (
                    uploadedFonts.map((font, idx) => (
                      <div key={`${font.name}-${idx}`} className="rounded-lg border border-border p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground">{font.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {font.type} • {(font.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
                            {font.type}
                          </Badge>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg bg-secondary/50 p-3 border border-border/50">
                          <p className="text-xs text-muted-foreground mb-2 font-mono">Preview:</p>
                          <p className="text-sm text-foreground">
                            {font.previewText}
                          </p>
                        </div>

                        {/* Character set test */}
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2">Character Sets:</p>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Latin: </span>
                              <span className="font-mono text-foreground break-all">{testCharsets.latin}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Extended: </span>
                              <span className="font-mono text-foreground break-all">{testCharsets.extended}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info and Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Server Fonts</p>
                <p className="text-2xl font-bold text-foreground">
                  {loadingServerFonts ? "..." : serverFonts.length}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Uploaded This Session</p>
                <p className="text-2xl font-bold text-foreground">{uploadedFonts.length}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Total Server Storage</p>
                <p className="text-2xl font-bold text-foreground">
                  {loadingServerFonts
                    ? "..."
                    : formatBytes(serverFonts.reduce((sum, f) => sum + f.size_bytes, 0))}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Font Format Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Font Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground">TTF</p>
                <p className="text-xs text-muted-foreground mt-1">
                  TrueType format. Universal compatibility, larger file size.
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-foreground">OTF</p>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenType format. Advanced features, better for print.
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-foreground">WOFF/WOFF2</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Web-optimized formats. Smaller size, modern browsers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Download Report */}
          {(serverFonts.length > 0 || uploadedFonts.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Font Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleCopyReport}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy Report
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownloadReport}
                  variant="default"
                  size="sm"
                  className="w-full justify-center gap-2"
                >
                  <Download className="size-4" />
                  Download JSON
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About Font Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                <li>Server fonts in assets/ are used for certificate generation</li>
                <li>Uploaded fonts are automatically sent to the server</li>
                <li>Use TTF or OTF fonts for best rendering quality</li>
                <li>Check character coverage before batch generation</li>
                <li>The Rust backend renders text using actual font files</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
