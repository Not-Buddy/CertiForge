"use client"

import { useCallback, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Upload, ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement, file: File) => void
  currentFile: File | null
  onClear: () => void
}

export function ImageUpload({ onImageLoad, currentFile, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/png")) return
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => onImageLoad(img, file)
      img.src = URL.createObjectURL(file)
    },
    [onImageLoad]
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
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
            {(currentFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="size-4" />
          <span className="sr-only">Remove image</span>
        </Button>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30"
      )}
    >
      <div className={cn(
        "flex items-center justify-center size-12 rounded-full transition-colors",
        isDragging ? "bg-primary/10" : "bg-secondary"
      )}>
        <Upload className={cn(
          "size-5 transition-colors",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          Drop your PNG template here
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse files
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  )
}
