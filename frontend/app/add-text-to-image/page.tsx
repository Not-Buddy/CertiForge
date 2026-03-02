"use client"

import { useState, useCallback, useRef } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { ImageUpload } from "@/components/image-upload"
import { TextControls, type TextSettings } from "@/components/text-controls"
import { PreviewCanvas, getCanvasElement } from "@/components/preview-canvas"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sparkles, Download, RotateCcw, CheckCircle2, Loader2 } from "lucide-react"
import { generateSingle, type GenerateSingleConfig } from "@/lib/api-client"

const DEFAULT_SETTINGS: TextSettings = {
  text: "",
  fontFamily: "Inter",
  fontSize: 48,
  posX: 100,
  posY: 100,
  color: "#000000",
}

type GenerationStatus = "idle" | "generating" | "success" | "error"

export default function AddTextToImagePage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<TextSettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<GenerationStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null)

  const imageWidth = image?.naturalWidth ?? 0
  const imageHeight = image?.naturalHeight ?? 0

  const handleImageLoad = useCallback((img: HTMLImageElement, f: File) => {
    setImage(img)
    setFile(f)
    setStatus("idle")
    setGeneratedBlob(null)
    // Center text on the image by default
    setSettings((prev) => ({
      ...prev,
      posX: Math.round(img.naturalWidth / 2),
      posY: Math.round(img.naturalHeight / 2),
    }))
  }, [])

  const handleClear = useCallback(() => {
    setImage(null)
    setFile(null)
    setSettings(DEFAULT_SETTINGS)
    setStatus("idle")
    setGeneratedBlob(null)
  }, [])

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setStatus("idle")
    setGeneratedBlob(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!file || !settings.text.trim()) return
    setStatus("generating")
    setErrorMsg("")
    setGeneratedBlob(null)

    try {
      const config: GenerateSingleConfig = {
        text: settings.text,
        x: settings.posX,
        y: settings.posY,
        font: settings.fontFamily,
        font_size: settings.fontSize,
        color: settings.color,
        center_text: true,
      }

      const blob = await generateSingle(file, config)
      setGeneratedBlob(blob)
      setStatus("success")
    } catch (err: any) {
      setErrorMsg(err.message || "Generation failed")
      setStatus("error")
    }
  }, [file, settings])

  const handleDownload = useCallback(() => {
    // If we have a server-generated blob, download that (better quality with real fonts)
    if (generatedBlob) {
      const url = URL.createObjectURL(generatedBlob)
      const a = document.createElement("a")
      a.href = url
      const baseName = file?.name?.replace(/\.png$/i, "") ?? "certificate"
      a.download = `${baseName}-generated.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return
    }

    // Fallback: download from canvas preview
    const canvas = getCanvasElement()
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const baseName = file?.name?.replace(/\.png$/i, "") ?? "certificate"
      a.download = `${baseName}-generated.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [file, generatedBlob])

  const canGenerate = !!image && settings.text.trim().length > 0

  return (
    <DashboardShell
      title="Add Text to Single Image"
      description="Upload a PNG template and add custom text"
    >
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Left column - Controls */}
        <div className="flex flex-col gap-4">
          {/* Upload card */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Template Image</CardTitle>
              <CardDescription>Upload a PNG certificate template</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                onImageLoad={handleImageLoad}
                currentFile={file}
                onClear={handleClear}
              />
              {imageWidth > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {imageWidth} x {imageHeight}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text controls card */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">Text Settings</CardTitle>
                  <CardDescription>Configure text overlay properties</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset settings</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TextControls
                settings={settings}
                onChange={(s) => {
                  setSettings(s)
                  if (status === "success") setStatus("idle")
                }}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate || status === "generating"}
              className="w-full"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="size-4" />
                  Generated Successfully
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Image
                </>
              )}
            </Button>

            {status === "error" && (
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
            )}

            {status === "success" && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleDownload}
                className="w-full"
              >
                <Download className="size-4" />
                Download Result
              </Button>
            )}
          </div>
        </div>

        {/* Right column - Preview */}
        <Card className="min-h-[400px] xl:min-h-0">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <CardDescription>
                  {image ? "Real-time preview of your certificate" : "Upload an image to begin"}
                </CardDescription>
              </div>
              {image && (
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <PreviewCanvas
              image={image}
              settings={settings}
              className="w-full h-[350px] xl:h-[calc(100vh-320px)]"
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tips section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Positioning</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use the X and Y sliders to precisely place text on your template. Text is centered at the coordinates you set.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Server-Side Fonts</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The backend renders text using actual TTF/OTF fonts from the assets/ directory, providing high-quality output.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Best Practices</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use high-resolution PNG templates for best results. Ensure text contrast with the background color.
          </p>
        </div>
      </div>
    </DashboardShell>
  )
}
