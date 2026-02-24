"use client"

import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface PngMetadata {
  fileName: string
  fileSize: number
  width: number
  height: number
  megapixels: number
  aspectRatio: string
  hasTransparency: boolean
  transparentPixelPercent: number
  colorMode: string
  uniqueColors: number
  dpiX: number
  dpiY: number
  bitDepth: number
  previewUrl: string
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function getAspectRatio(w: number, h: number): string {
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

/**
 * Parse pHYs chunk from raw PNG bytes to extract DPI.
 * The pHYs chunk stores pixels-per-unit for X and Y plus a unit specifier
 * (1 = metre). We convert px/m to DPI (px/inch).
 */
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

function parseBitDepthFromBuffer(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  // The IHDR chunk starts at byte 8 (after PNG signature).
  // chunk length (4) + "IHDR" (4) + width (4) + height (4) + bitDepth (1)
  if (view.byteLength < 25) return 8
  return view.getUint8(24)
}

export async function analyzePng(file: File): Promise<PngMetadata> {
  const buffer = await file.arrayBuffer()
  const dpi = parseDpiFromBuffer(buffer)
  const bitDepth = parseBitDepthFromBuffer(buffer)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }
      ctx.drawImage(img, 0, 0)

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const totalPixels = canvas.width * canvas.height

      let transparentPixels = 0
      const colorSet = new Set<string>()
      const sampleStep = totalPixels > 500_000 ? 4 : 1

      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        const a = data[i + 3]
        if (a < 255) transparentPixels++
        colorSet.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
      }

      const sampledPixels = Math.ceil(totalPixels / sampleStep)
      const transparentPercent = Math.round((transparentPixels / sampledPixels) * 100)
      const hasTransparency = transparentPixels > 0

      let colorMode = "RGB"
      if (hasTransparency) colorMode = "RGBA"
      if (colorSet.size === 1) colorMode = "Grayscale"
      else if (colorSet.size <= 256 && !hasTransparency) colorMode = "Indexed RGB"

      resolve({
        fileName: file.name,
        fileSize: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        megapixels: parseFloat(((img.naturalWidth * img.naturalHeight) / 1_000_000).toFixed(2)),
        aspectRatio: getAspectRatio(img.naturalWidth, img.naturalHeight),
        hasTransparency,
        transparentPixelPercent: transparentPercent,
        colorMode,
        uniqueColors: Math.min(colorSet.size, 99999),
        dpiX: dpi.x,
        dpiY: dpi.y,
        bitDepth,
        previewUrl: URL.createObjectURL(file),
      })
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

/* ------------------------------------------------------------------ */
/*  Reusable upload zone for the Analyze page                         */
/* ------------------------------------------------------------------ */

interface AnalyzeUploadProps {
  onFile: (file: File) => void
  currentFile: File | null
  onClear: () => void
  analyzing?: boolean
}

export function AnalyzeUpload({ onFile, currentFile, onClear, analyzing }: AnalyzeUploadProps) {
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
        <p className="text-sm font-medium text-foreground">Drop a PNG file here</p>
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
