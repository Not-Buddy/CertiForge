"use client"

import { useCallback, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { FileSpreadsheet, X, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CsvParseResult {
  headers: string[]
  rows: string[][]
  rowCount: number
}

interface CsvUploadProps {
  onFileLoad: (result: CsvParseResult, file: File) => void
  currentFile: File | null
  parseResult: CsvParseResult | null
  onClear: () => void
  error?: string | null
}

function parseCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 }

  const headers = lines[0].split(",").map((h) => h.trim())
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()))
  return { headers, rows, rowCount: rows.length }
}

export function CsvUpload({ onFileLoad, currentFile, parseResult, onClear, error }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") return
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const result = parseCsv(text)
        onFileLoad(result, file)
      }
      reader.readAsText(file)
    },
    [onFileLoad]
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
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleFile]
  )

  if (currentFile && parseResult) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
            <FileSpreadsheet className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(currentFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground shrink-0 size-8 p-0"
          >
            <X className="size-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        </div>

        {error ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <AlertCircle className="size-4 text-destructive-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-destructive-foreground leading-relaxed">{error}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
            <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-foreground leading-relaxed">
              <span className="font-medium">{parseResult.rowCount} records</span> found with{" "}
              <span className="font-medium">{parseResult.headers.length} columns</span>:
              <span className="text-muted-foreground ml-1">
                {parseResult.headers.join(", ")}
              </span>
            </div>
          </div>
        )}
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
          className={cn(
            "size-5 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Drop your CSV file here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  )
}
