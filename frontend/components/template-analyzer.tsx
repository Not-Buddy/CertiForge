"use client"

import { useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface TemplateAnalysis {
  fileName: string
  fileSize: number
  width: number
  height: number
  dpiX: number
  dpiY: number
  hasTransparency: boolean
  previewUrl: string
  // Template-specific checks
  checks: {
    resolution: {
      status: "ok" | "warning" | "error"
      message: string
      details: string
    }
    textSafeArea: {
      status: "ok" | "warning"
      message: string
      details: string
      marginPercent: number
    }
    transparency: {
      status: "ok" | "warning"
      message: string
      details: string
    }
    fontSizing: {
      status: "ok" | "warning"
      message: string
      recommendedMin: number
      recommendedMax: number
    }
  }
  recommendations: string[]
}

function parseDpiFromBuffer(buffer: ArrayBuffer): { x: number; y: number } {
  const view = new DataView(buffer)
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < sig.length; i++) {
    if (view.getUint8(i) !== sig[i]) return { x: 72, y: 72 }
  }

  let offset = 8
  while (offset < view.byteLength - 12) {
    const length = view.getUint32(offset)
    const typeCode =
      String.fromCharCode(view.getUint8(offset + 4)) +
      String.fromCharCode(view.getUint8(offset + 5)) +
      String.fromCharCode(view.getUint8(offset + 6)) +
      String.fromCharCode(view.getUint8(offset + 7))

    if (typeCode === "pHYs" && length === 9) {
      const pxPerUnitX = view.getUint32(offset + 8)
      const pxPerUnitY = view.getUint32(offset + 12)
      const unit = view.getUint8(offset + 16)
      if (unit === 1) {
        return {
          x: Math.round(pxPerUnitX / 39.3701),
          y: Math.round(pxPerUnitY / 39.3701),
        }
      }
      return { x: 72, y: 72 }
    }

    offset += 12 + length
    if (typeCode === "IEND") break
  }

  return { x: 72, y: 72 }
}

export async function analyzeTemplate(file: File): Promise<TemplateAnalysis> {
  const buffer = await file.arrayBuffer()
  const dpi = parseDpiFromBuffer(buffer)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }
      ctx.drawImage(img, 0, 0)

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const totalPixels = canvas.width * canvas.height

      let transparentPixels = 0
      const sampleStep = totalPixels > 500_000 ? 4 : 1

      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        const a = data[i + 3]
        if (a < 255) transparentPixels++
      }

      const hasTransparency = transparentPixels > 0

      // Template-specific analysis
      const minResolution = 600
      const recommendedResolution = 1000
      let resolutionStatus: "ok" | "warning" | "error" = "ok"
      let resolutionMessage = "Resolution is suitable for high-quality certificates"

      if (Math.min(width, height) < minResolution) {
        resolutionStatus = "error"
        resolutionMessage = "Resolution is too low for quality certificate printing"
      } else if (Math.min(width, height) < recommendedResolution) {
        resolutionStatus = "warning"
        resolutionMessage = "Resolution is acceptable but could be higher for better quality"
      }

      const textSafeMarginPercent = 5
      const textSafeWidth = width * (1 - textSafeMarginPercent / 50)
      const textSafeHeight = height * (1 - textSafeMarginPercent / 50)
      const textSafeArea = Math.round((textSafeWidth * textSafeHeight) / 1000000)

      let recommendations: string[] = []

      // Font sizing recommendations
      const pixelsPerInch = dpi.x
      const recommendedFontSizeMin = Math.max(8, Math.floor((width / 100) * 72) / pixelsPerInch)
      const recommendedFontSizeMax = Math.floor((width / 20) * 72 / pixelsPerInch)

      if (resolutionStatus === "error") {
        recommendations.push("Resolution too low - consider using a higher resolution template (1000x600px minimum)")
      }

      if (!hasTransparency && recommendations.length < 3) {
        recommendations.push("Template has no transparency - this may limit design flexibility")
      }

      if (dpi.x < 150) {
        recommendations.push("DPI is below 150 - consider creating template at higher DPI for print quality")
      }

      if (recommendations.length === 0) {
        recommendations.push("Template is well-suited for batch certificate generation")
      }

      const analysis: TemplateAnalysis = {
        fileName: file.name,
        fileSize: file.size,
        width,
        height,
        dpiX: dpi.x,
        dpiY: dpi.y,
        hasTransparency,
        previewUrl: URL.createObjectURL(file),
        checks: {
          resolution: {
            status: resolutionStatus,
            message: resolutionMessage,
            details: `${width}×${height} pixels (${Math.min(width, height)} px on shortest side)`,
          },
          textSafeArea: {
            status: "ok",
            message: "Safe area for text placement calculated",
            details: `${textSafeArea} million pixels available in safe zone with 5% margin`,
            marginPercent: textSafeMarginPercent,
          },
          transparency: {
            status: hasTransparency ? "ok" : "warning",
            message: hasTransparency ? "Transparency supported" : "No transparency detected",
            details: hasTransparency
              ? "Template uses transparency for flexible text placement"
              : "Template is fully opaque - text will overwrite background",
          },
          fontSizing: {
            status: "ok",
            message: "Recommended font size range calculated",
            recommendedMin: Math.max(8, Math.round(recommendedFontSizeMin * 10) / 10),
            recommendedMax: Math.round(recommendedFontSizeMax * 10) / 10,
          },
        },
        recommendations,
      }

      resolve(analysis)
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

interface TemplateUploadProps {
  onFile: (file: File) => void
  currentFile: File | null
  onClear: () => void
  analyzing?: boolean
}

export function TemplateUpload({ onFile, currentFile, onClear, analyzing }: TemplateUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/png")) return
      onFile(file)
    },
    [onFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  if (currentFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
          <ImageIcon className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{currentFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {currentFile.size < 1024 * 1024
              ? `${(currentFile.size / 1024).toFixed(1)} KB`
              : `${(currentFile.size / (1024 * 1024)).toFixed(2)} MB`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={analyzing}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="size-4" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragging(false)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center size-12 rounded-full transition-colors",
          isDragging ? "bg-primary/10" : "bg-secondary"
        )}
      >
        <Upload
          className={cn("size-5 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Drop a PNG template here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
