"use client"

import { useCallback, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Upload, ImageIcon, X, Check } from "lucide-react"

export interface TemplateOption {
  id: string
  name: string
  src: string | null
  width: number
  height: number
}

interface TemplatePickerProps {
  selected: TemplateOption | null
  onSelect: (template: TemplateOption) => void
  onClear: () => void
}

const SAMPLE_TEMPLATES: Omit<TemplateOption, "src">[] = [
  { id: "classic", name: "Classic Certificate", width: 1200, height: 900 },
  { id: "modern", name: "Modern Award", width: 1200, height: 850 },
  { id: "elegant", name: "Elegant Diploma", width: 1400, height: 1000 },
  { id: "minimal", name: "Minimal Badge", width: 1000, height: 750 },
]

export function TemplatePicker({ selected, onSelect, onClear }: TemplatePickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/png")) return
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setCustomImage(img)
        onSelect({
          id: "custom",
          name: file.name,
          src: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.src = URL.createObjectURL(file)
    },
    [onSelect]
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

  const handleClear = useCallback(() => {
    setCustomImage(null)
    onClear()
  }, [onClear])

  return (
    <div className="flex flex-col gap-5">
      {/* Sample templates grid */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Sample Templates</p>
        <div className="grid grid-cols-2 gap-3">
          {SAMPLE_TEMPLATES.map((tpl) => {
            const isSelected = selected?.id === tpl.id
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() =>
                  onSelect({ ...tpl, src: null })
                }
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40 hover:bg-secondary/30"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 flex items-center justify-center size-5 rounded-full bg-primary">
                    <Check className="size-3 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-center justify-center w-full aspect-[4/3] rounded-md transition-colors",
                    isSelected ? "bg-primary/10" : "bg-secondary"
                  )}
                >
                  <ImageIcon
                    className={cn(
                      "size-8 transition-colors",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="w-full">
                  <p className="text-xs font-medium text-foreground truncate">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {tpl.width}x{tpl.height}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Or divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or upload your own</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Custom upload area */}
      {selected?.id === "custom" && customImage ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
            <ImageIcon className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {selected.width}x{selected.height}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground shrink-0 size-8 flex items-center justify-center rounded-md transition-colors"
          >
            <X className="size-4" />
            <span className="sr-only">Remove template</span>
          </button>
        </div>
      ) : (
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
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center size-10 rounded-full transition-colors",
              isDragging ? "bg-primary/10" : "bg-secondary"
            )}
          >
            <Upload
              className={cn(
                "size-4 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Drop a PNG template here</p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              if (inputRef.current) inputRef.current.value = ""
            }}
          />
        </div>
      )}
    </div>
  )
}
