"use client"

import { useCallback, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Upload, X, FileText, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { uploadFont } from "@/lib/api-client"

interface FontFile {
  name: string
  size: number
  type: string
}

interface FontUploadProps {
  onFilesLoad: (files: FontFile[]) => void
  currentFiles: FontFile[]
  onClear: (index: number) => void
  maxFiles?: number
}

export function FontUpload({ onFilesLoad, currentFiles, onClear, maxFiles = 5 }: FontUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<Record<string, "uploading" | "done" | "error">>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const validExtensions = [".ttf", ".otf", ".woff", ".woff2"]

  const handleFiles = useCallback(
    async (files: FileList) => {
      const validFiles: FontFile[] = []
      const filesToUpload: File[] = []

      for (let i = 0; i < files.length && currentFiles.length + validFiles.length < maxFiles; i++) {
        const file = files[i]
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()

        if (validExtensions.includes(ext)) {
          validFiles.push({
            name: file.name,
            size: file.size,
            type: ext.slice(1).toUpperCase(),
          })
          filesToUpload.push(file)
        }
      }

      if (validFiles.length > 0) {
        onFilesLoad(validFiles)

        // Upload each font to the server
        setUploading(true)
        for (const file of filesToUpload) {
          setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }))
          try {
            await uploadFont(file)
            setUploadStatus((prev) => ({ ...prev, [file.name]: "done" }))
          } catch {
            setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))
          }
        }
        setUploading(false)
      }
    },
    [onFilesLoad, currentFiles.length, maxFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
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
      if (e.target.files) {
        handleFiles(e.target.files)
        e.target.value = ""
      }
    },
    [handleFiles]
  )

  return (
    <div className="space-y-3">
      {currentFiles.length > 0 && (
        <div className="space-y-2">
          {currentFiles.map((file, idx) => {
            const status = uploadStatus[file.name]
            return (
              <div key={`${file.name}-${idx}`} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                  {status === "uploading" ? (
                    <Loader2 className="size-5 text-primary animate-spin" />
                  ) : status === "done" ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <FileText className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.type} • {(file.size / 1024).toFixed(1)} KB
                    {status === "done" && (
                      <span className="text-primary ml-1">• Uploaded to server</span>
                    )}
                    {status === "error" && (
                      <span className="text-destructive ml-1">• Upload failed (server may be offline)</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onClear(idx)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove font</span>
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {currentFiles.length < maxFiles && (
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
              Drop font files here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              TTF, OTF, WOFF, WOFF2 supported ({currentFiles.length}/{maxFiles})
              {uploading && " • Uploading..."}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            multiple
            className="sr-only"
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  )
}
