"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import type { TextSettings } from "@/components/text-controls"

interface PreviewCanvasProps {
  image: HTMLImageElement | null
  settings: TextSettings
  className?: string
}

export function PreviewCanvas({ image, settings, className }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Track container size for responsive scaling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0)

    if (settings.text.trim()) {
      ctx.font = `${settings.fontSize}px "${settings.fontFamily}"`
      ctx.fillStyle = settings.color
      ctx.textBaseline = "top"
      ctx.fillText(settings.text, settings.posX, settings.posY)
    }
  }, [image, settings])

  useEffect(() => {
    draw()
  }, [draw])

  // Calculate display dimensions that fit within the container
  const getDisplayStyle = () => {
    if (!image || containerSize.width === 0) return {}
    const imgAspect = image.naturalWidth / image.naturalHeight
    const containerAspect = containerSize.width / containerSize.height

    if (imgAspect > containerAspect) {
      return { width: "100%", height: "auto" }
    }
    return { width: "auto", height: "100%" }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center justify-center bg-secondary/30 rounded-lg overflow-hidden",
        className
      )}
    >
      {image ? (
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={getDisplayStyle()}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
          <div className="flex items-center justify-center size-16 rounded-full bg-muted">
            <svg
              className="size-8 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No image loaded</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Upload a PNG template to preview</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function getCanvasElement(): HTMLCanvasElement | null {
  return document.querySelector("canvas")
}
