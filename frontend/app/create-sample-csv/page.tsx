"use client"

import { useState, useCallback, useMemo } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Download,
  Copy,
  CheckCircle2,
  Plus,
  X,
  FileSpreadsheet,
  Info,
  BookOpen,
  Lightbulb,
  ArrowRight,
} from "lucide-react"

// --- Preset data ---

type Preset = {
  id: string
  label: string
  description: string
  headers: string[]
  rows: string[][]
}

const PRESETS: Preset[] = [
  {
    id: "name-only",
    label: "Name Only",
    description: "Simple list of names for basic certificates",
    headers: ["name"],
    rows: [
      ["Alice Johnson"],
      ["Bob Williams"],
      ["Carol Martinez"],
      ["David Lee"],
      ["Eva Chen"],
      ["Frank Robinson"],
      ["Grace Patel"],
      ["Henry Nakamura"],
    ],
  },
  {
    id: "name-course",
    label: "Name + Course",
    description: "Names paired with course titles for training certificates",
    headers: ["name", "course"],
    rows: [
      ["Alice Johnson", "Advanced React Patterns"],
      ["Bob Williams", "Cloud Architecture Fundamentals"],
      ["Carol Martinez", "Data Science with Python"],
      ["David Lee", "Cybersecurity Essentials"],
      ["Eva Chen", "Machine Learning Engineering"],
      ["Frank Robinson", "DevOps & CI/CD Pipelines"],
      ["Grace Patel", "UI/UX Design Principles"],
      ["Henry Nakamura", "Agile Project Management"],
    ],
  },
  {
    id: "name-course-date",
    label: "Name + Course + Date",
    description: "Full certificate data with completion dates",
    headers: ["name", "course", "date"],
    rows: [
      ["Alice Johnson", "Advanced React Patterns", "2026-01-15"],
      ["Bob Williams", "Cloud Architecture Fundamentals", "2026-01-20"],
      ["Carol Martinez", "Data Science with Python", "2026-02-01"],
      ["David Lee", "Cybersecurity Essentials", "2026-02-10"],
      ["Eva Chen", "Machine Learning Engineering", "2026-02-14"],
      ["Frank Robinson", "DevOps & CI/CD Pipelines", "2026-02-18"],
      ["Grace Patel", "UI/UX Design Principles", "2026-02-22"],
      ["Henry Nakamura", "Agile Project Management", "2026-02-24"],
    ],
  },
  {
    id: "custom",
    label: "Custom Fields",
    description: "Define your own columns and sample data",
    headers: ["name"],
    rows: [["Alice Johnson"]],
  },
]

// --- Helpers ---

function toCsvString(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const lines = [headers.map(escape).join(",")]
  for (const row of rows) {
    lines.push(row.map(escape).join(","))
  }
  return lines.join("\n")
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// --- Page ---

export default function CreateSampleCsvPage() {
  const [selectedPreset, setSelectedPreset] = useState("name-only")
  const [customHeaders, setCustomHeaders] = useState<string[]>(["name"])
  const [customRows, setCustomRows] = useState<string[][]>([["Alice Johnson"]])
  const [newColumnName, setNewColumnName] = useState("")
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const preset = PRESETS.find((p) => p.id === selectedPreset)!
  const isCustom = selectedPreset === "custom"

  const activeHeaders = isCustom ? customHeaders : preset.headers
  const activeRows = isCustom ? customRows : preset.rows

  const csvContent = useMemo(
    () => toCsvString(activeHeaders, activeRows),
    [activeHeaders, activeRows]
  )

  // Custom field management
  const addColumn = useCallback(() => {
    const name = newColumnName.trim().toLowerCase().replace(/\s+/g, "_")
    if (!name || customHeaders.includes(name)) return
    setCustomHeaders((prev) => [...prev, name])
    setCustomRows((prev) => prev.map((row) => [...row, ""]))
    setNewColumnName("")
  }, [newColumnName, customHeaders])

  const removeColumn = useCallback(
    (index: number) => {
      if (customHeaders.length <= 1) return
      setCustomHeaders((prev) => prev.filter((_, i) => i !== index))
      setCustomRows((prev) => prev.map((row) => row.filter((_, i) => i !== index)))
    },
    [customHeaders.length]
  )

  const addRow = useCallback(() => {
    setCustomRows((prev) => [...prev, new Array(customHeaders.length).fill("")])
  }, [customHeaders.length])

  const removeRow = useCallback(
    (index: number) => {
      if (customRows.length <= 1) return
      setCustomRows((prev) => prev.filter((_, i) => i !== index))
    },
    [customRows.length]
  )

  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      setCustomRows((prev) => {
        const next = prev.map((r) => [...r])
        next[rowIndex][colIndex] = value
        return next
      })
    },
    []
  )

  // Actions
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(csvContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement("textarea")
      textarea.value = csvContent
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [csvContent])

  const handleDownload = useCallback(() => {
    const filename = isCustom
      ? "certiforge-custom.csv"
      : `certiforge-${selectedPreset}.csv`
    downloadCsv(csvContent, filename)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2500)
  }, [csvContent, isCustom, selectedPreset])

  return (
    <DashboardShell
      title="Create Sample CSV"
      description="Generate example CSV files for certificate batch processing"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Format selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CSV Format</CardTitle>
              <CardDescription>
                Choose a preset format or define custom fields for your certificate data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p.id)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all",
                      selectedPreset === p.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:border-muted-foreground/30 hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          selectedPreset === p.id
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {p.label}
                      </span>
                      {selectedPreset === p.id && (
                        <CheckCircle2 className="size-3.5 text-primary ml-auto shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {p.description}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(p.id === "custom" ? ["your", "fields"] : p.headers).map(
                        (h) => (
                          <Badge
                            key={h}
                            variant="secondary"
                            className="text-[10px] font-mono"
                          >
                            {h}
                          </Badge>
                        )
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom field editor */}
          {isCustom && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Columns</CardTitle>
                <CardDescription>
                  Add or remove columns, then fill in sample data in the preview below.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {customHeaders.map((h, i) => (
                    <div
                      key={`${h}-${i}`}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 pl-3 pr-1.5 py-1.5"
                    >
                      <span className="text-xs font-mono text-foreground">{h}</span>
                      <button
                        onClick={() => removeColumn(i)}
                        disabled={customHeaders.length <= 1}
                        className="flex items-center justify-center size-5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label={`Remove column ${h}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="new-col" className="sr-only">
                      New column name
                    </Label>
                    <Input
                      id="new-col"
                      placeholder="Column name (e.g. email)"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addColumn()
                        }
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addColumn}
                    disabled={
                      !newColumnName.trim() ||
                      customHeaders.includes(
                        newColumnName.trim().toLowerCase().replace(/\s+/g, "_")
                      )
                    }
                    className="h-9"
                  >
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data preview table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">Data Preview</CardTitle>
                  <CardDescription>
                    {isCustom
                      ? "Edit cells directly to customize your sample data."
                      : `${activeRows.length} sample records with ${activeHeaders.length} field${activeHeaders.length !== 1 ? "s" : ""}.`}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                  {activeRows.length} rows
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                      <TableHead className="w-10 text-center text-xs text-muted-foreground font-normal">
                        #
                      </TableHead>
                      {activeHeaders.map((h) => (
                        <TableHead
                          key={h}
                          className="text-xs font-mono font-medium text-foreground"
                        >
                          {h}
                        </TableHead>
                      ))}
                      {isCustom && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRows.map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                          {ri + 1}
                        </TableCell>
                        {row.map((cell, ci) => (
                          <TableCell key={ci}>
                            {isCustom ? (
                              <Input
                                value={cell}
                                onChange={(e) =>
                                  updateCell(ri, ci, e.target.value)
                                }
                                className="h-7 text-xs border-transparent bg-transparent hover:bg-secondary/50 focus:bg-background focus:border-input px-2"
                              />
                            ) : (
                              <span className="text-sm text-foreground">
                                {cell}
                              </span>
                            )}
                          </TableCell>
                        ))}
                        {isCustom && (
                          <TableCell className="text-center">
                            <button
                              onClick={() => removeRow(ri)}
                              disabled={customRows.length <= 1}
                              className="flex items-center justify-center size-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Remove row ${ri + 1}`}
                            >
                              <X className="size-3" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addRow}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  Add Row
                </Button>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6">
              <Button onClick={handleDownload} className="flex-1 sm:flex-none">
                {downloaded ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Download CSV
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="flex-1 sm:flex-none"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Raw CSV preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw CSV Output</CardTitle>
              <CardDescription>
                This is the exact text content that will be saved to the file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="rounded-lg bg-secondary/50 border border-border p-4 text-xs font-mono leading-relaxed text-foreground overflow-x-auto whitespace-pre">
                {csvContent}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">File Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Format</span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {preset.label}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Columns</span>
                <span className="text-xs font-medium text-foreground font-mono">
                  {activeHeaders.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Rows</span>
                <span className="text-xs font-medium text-foreground font-mono">
                  {activeRows.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">File size</span>
                <span className="text-xs font-medium text-foreground font-mono">
                  ~{new Blob([csvContent]).size} B
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Encoding</span>
                <span className="text-xs font-medium text-foreground font-mono">
                  UTF-8
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Column reference */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">Column Reference</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-4">
              {activeHeaders.map((h, i) => (
                <div
                  key={`${h}-${i}`}
                  className="flex items-center gap-2 rounded-md bg-secondary/40 px-3 py-2"
                >
                  <span className="flex items-center justify-center size-5 rounded bg-primary/10 text-[10px] font-mono text-primary font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-mono text-foreground">{h}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <CardTitle className="text-sm">CSV Format Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex flex-col gap-2.5">
                <GuideItem
                  title="Header row"
                  text="The first row must contain column names. These become the placeholder variables in your template."
                />
                <GuideItem
                  title="Delimiter"
                  text={'Use commas to separate fields. Wrap values containing commas in double quotes.'}
                />
                <GuideItem
                  title="Encoding"
                  text="Save your CSV file as UTF-8 to support international characters and special symbols."
                />
                <GuideItem
                  title="Template mapping"
                  text={'Column headers like "name" map to {name} placeholders in your PNG template text.'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pro tip */}
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="flex gap-3 pt-6">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
                <Lightbulb className="size-4 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground">
                  Quick Start
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download a sample CSV, then use it with the Generate Certificates tool to batch-create certificates instantly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

function GuideItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex items-center justify-center size-5 rounded-full bg-secondary shrink-0 mt-0.5">
        <Info className="size-3 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground leading-relaxed">
          {text}
        </span>
      </div>
    </div>
  )
}
