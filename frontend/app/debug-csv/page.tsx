"use client"

import { useState, useCallback, useMemo } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { CsvUpload, type CsvParseResult } from "@/components/csv-upload"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  RotateCcw,
  FileSearch,
  ShieldCheck,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Hash,
  Columns3,
  Rows3,
  Bug,
} from "lucide-react"

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type IssueSeverity = "error" | "warning" | "info"

interface Issue {
  id: string
  severity: IssueSeverity
  title: string
  description: string
  rows?: number[] // affected row numbers (1-indexed)
  fix?: string
}

interface ValidationResult {
  issues: Issue[]
  stats: {
    totalRows: number
    totalColumns: number
    emptyRows: number
    duplicateRows: number
    emptyHeaderCells: number
    inconsistentColumns: number
  }
}

// ---------------------------------------------------------------------------
//  Validator
// ---------------------------------------------------------------------------

function validateCsv(parsed: CsvParseResult): ValidationResult {
  const issues: Issue[] = []
  const { headers, rows } = parsed

  let emptyRows = 0
  let duplicateRows = 0
  let emptyHeaderCells = 0
  let inconsistentColumns = 0

  // 1. Empty or missing headers
  const emptyHeaders: number[] = []
  headers.forEach((h, i) => {
    if (!h.trim()) {
      emptyHeaders.push(i + 1)
      emptyHeaderCells++
    }
  })
  if (emptyHeaders.length > 0) {
    issues.push({
      id: "empty-headers",
      severity: "error",
      title: "Empty header cells",
      description: `Column${emptyHeaders.length > 1 ? "s" : ""} ${emptyHeaders.join(", ")} ha${emptyHeaders.length > 1 ? "ve" : "s"} empty header names. Every column must have a header for CertiForge to map fields correctly.`,
      fix: "Add meaningful header names to every column in the first row of your CSV.",
    })
  }

  // 2. Duplicate headers
  const headerCounts = new Map<string, number[]>()
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase()
    if (!key) return
    if (!headerCounts.has(key)) headerCounts.set(key, [])
    headerCounts.get(key)!.push(i + 1)
  })
  const dupHeaders = [...headerCounts.entries()].filter(([, cols]) => cols.length > 1)
  if (dupHeaders.length > 0) {
    const list = dupHeaders.map(([name, cols]) => `"${name}" (columns ${cols.join(", ")})`).join("; ")
    issues.push({
      id: "duplicate-headers",
      severity: "error",
      title: "Duplicate header names",
      description: `Found duplicate headers: ${list}. Each column must have a unique name.`,
      fix: "Rename duplicate headers so each column has a distinct name.",
    })
  }

  // 3. Commonly expected headers
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase())
  if (!lowerHeaders.includes("name") && !lowerHeaders.includes("full_name") && !lowerHeaders.includes("fullname") && !lowerHeaders.includes("recipient")) {
    issues.push({
      id: "missing-name-header",
      severity: "warning",
      title: "No \"name\" column detected",
      description: "CertiForge typically expects a column named \"name\" (or \"full_name\", \"recipient\") to identify certificate recipients.",
      fix: "Add or rename a column to \"name\" containing the recipient names.",
    })
  }

  // 4. Empty rows
  const emptyRowNumbers: number[] = []
  rows.forEach((row, i) => {
    if (row.every((cell) => !cell.trim())) {
      emptyRowNumbers.push(i + 2) // +2 because row 1 is headers
      emptyRows++
    }
  })
  if (emptyRowNumbers.length > 0) {
    issues.push({
      id: "empty-rows",
      severity: "error",
      title: `${emptyRowNumbers.length} empty row${emptyRowNumbers.length > 1 ? "s" : ""} found`,
      description: `Row${emptyRowNumbers.length > 1 ? "s" : ""} ${emptyRowNumbers.slice(0, 10).join(", ")}${emptyRowNumbers.length > 10 ? ` and ${emptyRowNumbers.length - 10} more` : ""} contain no data. Empty rows can cause blank certificates to be generated.`,
      rows: emptyRowNumbers,
      fix: "Remove all empty rows from your CSV file before processing.",
    })
  }

  // 5. Rows with missing cells (inconsistent column count)
  const inconsistentRowNumbers: number[] = []
  rows.forEach((row, i) => {
    if (row.length !== headers.length) {
      inconsistentRowNumbers.push(i + 2)
      inconsistentColumns++
    }
  })
  if (inconsistentRowNumbers.length > 0) {
    issues.push({
      id: "inconsistent-columns",
      severity: "error",
      title: `${inconsistentRowNumbers.length} row${inconsistentRowNumbers.length > 1 ? "s" : ""} with inconsistent columns`,
      description: `Expected ${headers.length} columns per row, but row${inconsistentRowNumbers.length > 1 ? "s" : ""} ${inconsistentRowNumbers.slice(0, 10).join(", ")}${inconsistentRowNumbers.length > 10 ? ` and ${inconsistentRowNumbers.length - 10} more` : ""} have a different count.`,
      rows: inconsistentRowNumbers,
      fix: "Ensure every row has exactly the same number of comma-separated values as the header row.",
    })
  }

  // 6. Rows with partially empty cells
  const partiallyEmptyRows: number[] = []
  rows.forEach((row, i) => {
    if (row.some((cell) => !cell.trim()) && !row.every((cell) => !cell.trim())) {
      partiallyEmptyRows.push(i + 2)
    }
  })
  if (partiallyEmptyRows.length > 0) {
    issues.push({
      id: "partial-empty-cells",
      severity: "warning",
      title: `${partiallyEmptyRows.length} row${partiallyEmptyRows.length > 1 ? "s" : ""} with empty cells`,
      description: `Row${partiallyEmptyRows.length > 1 ? "s" : ""} ${partiallyEmptyRows.slice(0, 10).join(", ")}${partiallyEmptyRows.length > 10 ? ` and ${partiallyEmptyRows.length - 10} more` : ""} have some empty cells. This may produce certificates with missing information.`,
      rows: partiallyEmptyRows,
      fix: "Fill in all cell values or intentionally leave them blank if the template supports optional fields.",
    })
  }

  // 7. Duplicate data rows
  const rowStrings = rows.map((r) => r.map((c) => c.trim().toLowerCase()).join("|"))
  const seenRows = new Map<string, number[]>()
  rowStrings.forEach((rs, i) => {
    if (!seenRows.has(rs)) seenRows.set(rs, [])
    seenRows.get(rs)!.push(i + 2)
  })
  const dupDataRows = [...seenRows.entries()].filter(([key, indices]) => indices.length > 1 && key.replace(/\|/g, "").trim() !== "")
  if (dupDataRows.length > 0) {
    const totalDups = dupDataRows.reduce((sum, [, indices]) => sum + indices.length - 1, 0)
    const firstFew = dupDataRows.slice(0, 3).map(([, indices]) => `rows ${indices.join(", ")}`).join("; ")
    duplicateRows = totalDups
    issues.push({
      id: "duplicate-rows",
      severity: "warning",
      title: `${totalDups} duplicate row${totalDups > 1 ? "s" : ""} detected`,
      description: `Found identical data in ${firstFew}${dupDataRows.length > 3 ? ` and ${dupDataRows.length - 3} more group${dupDataRows.length - 3 > 1 ? "s" : ""}` : ""}. Duplicate rows generate identical certificates.`,
      rows: dupDataRows.flatMap(([, indices]) => indices.slice(1)),
      fix: "Remove duplicate rows if each recipient should only receive one certificate.",
    })
  }

  // 8. Leading/trailing whitespace in cells
  let whitespaceCount = 0
  const whitespaceRows: number[] = []
  rows.forEach((row, i) => {
    for (const cell of row) {
      if (cell !== cell.trim() && cell.trim() !== "") {
        whitespaceCount++
        if (!whitespaceRows.includes(i + 2)) whitespaceRows.push(i + 2)
      }
    }
  })
  if (whitespaceCount > 0) {
    issues.push({
      id: "whitespace",
      severity: "info",
      title: `${whitespaceCount} cell${whitespaceCount > 1 ? "s" : ""} with extra whitespace`,
      description: `Found leading or trailing spaces in ${whitespaceRows.length} row${whitespaceRows.length > 1 ? "s" : ""}. While usually harmless, this may cause alignment issues on certificates.`,
      rows: whitespaceRows,
      fix: "Trim whitespace from cell values for cleaner output.",
    })
  }

  // 9. Very long cell values
  const longCellRows: number[] = []
  rows.forEach((row, i) => {
    for (const cell of row) {
      if (cell.trim().length > 100) {
        if (!longCellRows.includes(i + 2)) longCellRows.push(i + 2)
      }
    }
  })
  if (longCellRows.length > 0) {
    issues.push({
      id: "long-values",
      severity: "info",
      title: `${longCellRows.length} row${longCellRows.length > 1 ? "s" : ""} with very long values`,
      description: `Some cells exceed 100 characters. Long text may overflow on the certificate template.`,
      rows: longCellRows,
      fix: "Shorten long values or ensure your template has enough space for longer text.",
    })
  }

  // Sort: errors first, then warnings, then info
  const severityOrder: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    issues,
    stats: {
      totalRows: rows.length,
      totalColumns: headers.length,
      emptyRows,
      duplicateRows,
      emptyHeaderCells,
      inconsistentColumns,
    },
  }
}

// ---------------------------------------------------------------------------
//  Page
// ---------------------------------------------------------------------------

export default function DebugCsvPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const handleFileLoad = useCallback((result: CsvParseResult, f: File) => {
    setFile(f)
    setParseResult(result)
    const v = validateCsv(result)
    setValidation(v)
    // Auto-expand all error issues
    setExpandedIssues(new Set(v.issues.filter((i) => i.severity === "error").map((i) => i.id)))
  }, [])

  const handleClear = useCallback(() => {
    setFile(null)
    setParseResult(null)
    setValidation(null)
    setExpandedIssues(new Set())
    setCopied(false)
  }, [])

  const toggleIssue = useCallback((id: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Collect all flagged rows for highlighting
  const flaggedRows = useMemo(() => {
    if (!validation) return new Map<number, IssueSeverity>()
    const map = new Map<number, IssueSeverity>()
    const order: IssueSeverity[] = ["error", "warning", "info"]
    for (const issue of validation.issues) {
      if (!issue.rows) continue
      for (const row of issue.rows) {
        const current = map.get(row)
        if (!current || order.indexOf(issue.severity) < order.indexOf(current)) {
          map.set(row, issue.severity)
        }
      }
    }
    return map
  }, [validation])

  const errorCount = validation?.issues.filter((i) => i.severity === "error").length ?? 0
  const warningCount = validation?.issues.filter((i) => i.severity === "warning").length ?? 0
  const infoCount = validation?.issues.filter((i) => i.severity === "info").length ?? 0

  const handleCopyReport = useCallback(() => {
    if (!validation || !parseResult || !file) return
    const lines = [
      `CertiForge CSV Debug Report`,
      `File: ${file.name}`,
      `Rows: ${validation.stats.totalRows} | Columns: ${validation.stats.totalColumns}`,
      `Errors: ${errorCount} | Warnings: ${warningCount} | Info: ${infoCount}`,
      ``,
      ...validation.issues.map(
        (i) => `[${i.severity.toUpperCase()}] ${i.title}\n  ${i.description}${i.fix ? `\n  Fix: ${i.fix}` : ""}${i.rows ? `\n  Affected rows: ${i.rows.slice(0, 20).join(", ")}${i.rows.length > 20 ? "..." : ""}` : ""}`
      ),
    ]
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [validation, parseResult, file, errorCount, warningCount, infoCount])

  return (
    <DashboardShell
      title="Debug CSV File"
      description="Validate and troubleshoot CSV formatting issues"
    >
      {/* Upload card */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Upload CSV</CardTitle>
          <CardDescription>
            Drop a CSV file to run a full diagnostic analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CsvUpload
            onFileLoad={handleFileLoad}
            currentFile={file}
            parseResult={parseResult}
            onClear={handleClear}
          />
        </CardContent>
      </Card>

      {/* Results */}
      {validation && parseResult && file && (
        <>
          {/* Summary banner */}
          <SummaryBanner
            errorCount={errorCount}
            warningCount={warningCount}
            infoCount={infoCount}
            fileName={file.name}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Main column */}
            <div className="flex flex-col gap-6">
              {/* Issues list */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base">Validation Results</CardTitle>
                      <CardDescription>
                        {validation.issues.length === 0
                          ? "No issues found in your CSV file."
                          : `${validation.issues.length} issue${validation.issues.length > 1 ? "s" : ""} detected`}
                      </CardDescription>
                    </div>
                    {validation.issues.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyReport}
                        className="shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="size-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            Copy Report
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {validation.issues.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 shrink-0">
                        <ShieldCheck className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          All checks passed
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Your CSV file is well-formatted and ready for certificate generation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {validation.issues.map((issue) => (
                        <IssueCard
                          key={issue.id}
                          issue={issue}
                          expanded={expandedIssues.has(issue.id)}
                          onToggle={() => toggleIssue(issue.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data preview table with row highlighting */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base">Data Preview</CardTitle>
                      <CardDescription>
                        Problematic rows are highlighted. Showing up to 50 rows.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="size-2.5 rounded-full bg-destructive/60" />
                        Error
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="size-2.5 rounded-full bg-chart-3/60" />
                        Warning
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="size-2.5 rounded-full bg-chart-2/60" />
                        Info
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                          <TableHead className="w-12 text-center text-xs text-muted-foreground font-normal">
                            Row
                          </TableHead>
                          <TableHead className="w-10 text-center text-xs text-muted-foreground font-normal">
                            <span className="sr-only">Status</span>
                          </TableHead>
                          {parseResult.headers.map((h, i) => (
                            <TableHead
                              key={i}
                              className="text-xs font-mono font-medium text-foreground"
                            >
                              {h || (
                                <span className="text-destructive italic">
                                  {"(empty)"}
                                </span>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseResult.rows.slice(0, 50).map((row, ri) => {
                          const rowNum = ri + 2
                          const severity = flaggedRows.get(rowNum)
                          return (
                            <TableRow
                              key={ri}
                              className={cn(
                                severity === "error" &&
                                  "bg-destructive/5 hover:bg-destructive/10",
                                severity === "warning" &&
                                  "bg-chart-3/5 hover:bg-chart-3/10",
                                severity === "info" &&
                                  "bg-chart-2/5 hover:bg-chart-2/10"
                              )}
                            >
                              <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                                {rowNum}
                              </TableCell>
                              <TableCell className="text-center">
                                {severity && (
                                  <SeverityDot severity={severity} />
                                )}
                              </TableCell>
                              {row.map((cell, ci) => {
                                const isEmpty = !cell.trim()
                                const hasWhitespace = cell !== cell.trim() && cell.trim() !== ""
                                return (
                                  <TableCell
                                    key={ci}
                                    className={cn(
                                      "text-sm",
                                      isEmpty && "text-muted-foreground/40 italic"
                                    )}
                                  >
                                    {isEmpty ? (
                                      <span className="text-xs">{"(empty)"}</span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        {cell}
                                        {hasWhitespace && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 border-chart-2/40 text-chart-2"
                                          >
                                            ws
                                          </Badge>
                                        )}
                                      </span>
                                    )}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {parseResult.rows.length > 50 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Showing 50 of {parseResult.rows.length} rows.{" "}
                      {flaggedRows.size > 0 &&
                        `${flaggedRows.size} total row${flaggedRows.size > 1 ? "s" : ""} flagged.`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
              {/* Stats card */}
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-muted-foreground" />
                    File Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <StatRow icon={Rows3} label="Data rows" value={String(validation.stats.totalRows)} />
                  <Separator />
                  <StatRow icon={Columns3} label="Columns" value={String(validation.stats.totalColumns)} />
                  <Separator />
                  <StatRow
                    icon={Hash}
                    label="File size"
                    value={`${(file.size / 1024).toFixed(1)} KB`}
                  />
                  <Separator />
                  <StatRow
                    icon={Bug}
                    label="Issues"
                    value={String(validation.issues.length)}
                    valueClass={
                      errorCount > 0
                        ? "text-destructive"
                        : warningCount > 0
                          ? "text-chart-3"
                          : "text-primary"
                    }
                  />
                </CardContent>
              </Card>

              {/* Column reference */}
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Detected Columns</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {parseResult.headers.map((h, i) => (
                      <Badge
                        key={i}
                        variant={h.trim() ? "secondary" : "destructive"}
                        className="text-[10px] font-mono"
                      >
                        {h.trim() || `(col ${i + 1})`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Suggested fixes */}
              {validation.issues.some((i) => i.fix) && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="size-4 text-primary" />
                      Quick Fixes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ol className="flex flex-col gap-3">
                      {validation.issues
                        .filter((i) => i.fix)
                        .slice(0, 5)
                        .map((issue, idx) => (
                          <li key={issue.id} className="flex gap-2.5">
                            <span className="flex items-center justify-center size-5 shrink-0 rounded-full bg-secondary text-[10px] font-mono font-medium text-muted-foreground mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {issue.fix}
                            </p>
                          </li>
                        ))}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="w-full"
                >
                  <RotateCcw className="size-3.5" />
                  Analyze Another File
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state tips */}
      {!validation && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TipCard
            icon={FileSearch}
            title="Format Validation"
            description="Checks header integrity, column consistency, and proper CSV formatting to ensure compatibility with CertiForge."
          />
          <TipCard
            icon={AlertTriangle}
            title="Data Quality"
            description="Detects empty rows, missing cells, duplicate entries, and excessively long values that could affect output."
          />
          <TipCard
            icon={Lightbulb}
            title="Actionable Fixes"
            description="Every issue comes with a clear explanation and suggested fix so you can resolve problems quickly."
          />
        </div>
      )}
    </DashboardShell>
  )
}

// ---------------------------------------------------------------------------
//  Sub-components
// ---------------------------------------------------------------------------

function SummaryBanner({
  errorCount,
  warningCount,
  infoCount,
  fileName,
}: {
  errorCount: number
  warningCount: number
  infoCount: number
  fileName: string
}) {
  const hasErrors = errorCount > 0
  const hasWarnings = warningCount > 0
  const isClean = !hasErrors && !hasWarnings && infoCount === 0

  return (
    <Card
      className={cn(
        "border",
        hasErrors
          ? "border-destructive/30 bg-destructive/5"
          : hasWarnings
            ? "border-chart-3/30 bg-chart-3/5"
            : "border-primary/30 bg-primary/5"
      )}
    >
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
        <div
          className={cn(
            "flex items-center justify-center size-11 rounded-full shrink-0",
            hasErrors
              ? "bg-destructive/10"
              : hasWarnings
                ? "bg-chart-3/10"
                : "bg-primary/10"
          )}
        >
          {hasErrors ? (
            <AlertCircle className="size-5 text-destructive" />
          ) : hasWarnings ? (
            <AlertTriangle className="size-5 text-chart-3" />
          ) : (
            <ShieldCheck className="size-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isClean
              ? "CSV file is valid"
              : hasErrors
                ? "Issues found that need attention"
                : "Minor issues detected"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {fileName}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {errorCount > 0 && (
            <Badge
              variant="outline"
              className="border-destructive/40 text-destructive bg-destructive/10 gap-1"
            >
              <AlertCircle className="size-3" />
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge
              variant="outline"
              className="border-chart-3/40 text-chart-3 bg-chart-3/10 gap-1"
            >
              <AlertTriangle className="size-3" />
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {infoCount > 0 && (
            <Badge
              variant="outline"
              className="border-chart-2/40 text-chart-2 bg-chart-2/10 gap-1"
            >
              <Info className="size-3" />
              {infoCount} info
            </Badge>
          )}
          {isClean && (
            <Badge
              variant="outline"
              className="border-primary/40 text-primary bg-primary/10 gap-1"
            >
              <CheckCircle2 className="size-3" />
              All clear
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function IssueCard({
  issue,
  expanded,
  onToggle,
}: {
  issue: Issue
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        issue.severity === "error"
          ? "border-destructive/30 bg-destructive/[0.03]"
          : issue.severity === "warning"
            ? "border-chart-3/30 bg-chart-3/[0.03]"
            : "border-chart-2/30 bg-chart-2/[0.03]"
      )}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full text-left px-4 py-3"
      >
        <SeverityIcon severity={issue.severity} />
        <span className="flex-1 text-sm font-medium text-foreground">
          {issue.title}
        </span>
        <SeverityBadge severity={issue.severity} />
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border/50 pt-3 ml-9">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {issue.description}
          </p>
          {issue.rows && issue.rows.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-muted-foreground mt-0.5 shrink-0 uppercase tracking-wider font-medium">
                Rows
              </span>
              <div className="flex flex-wrap gap-1">
                {issue.rows.slice(0, 20).map((r) => (
                  <Badge
                    key={r}
                    variant="secondary"
                    className="text-[10px] font-mono px-1.5 py-0"
                  >
                    {r}
                  </Badge>
                ))}
                {issue.rows.length > 20 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    +{issue.rows.length - 20} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          {issue.fix && (
            <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <Lightbulb className="size-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground leading-relaxed">
                {issue.fix}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  if (severity === "error")
    return <AlertCircle className="size-4 text-destructive shrink-0" />
  if (severity === "warning")
    return <AlertTriangle className="size-4 text-chart-3 shrink-0" />
  return <Info className="size-4 text-chart-2 shrink-0" />
}

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const styles = {
    error: "border-destructive/40 text-destructive bg-destructive/10",
    warning: "border-chart-3/40 text-chart-3 bg-chart-3/10",
    info: "border-chart-2/40 text-chart-2 bg-chart-2/10",
  }
  return (
    <Badge variant="outline" className={cn("text-[10px] shrink-0", styles[severity])}>
      {severity}
    </Badge>
  )
}

function SeverityDot({ severity }: { severity: IssueSeverity }) {
  const colors = {
    error: "bg-destructive",
    warning: "bg-chart-3",
    info: "bg-chart-2",
  }
  return <span className={cn("block size-2 rounded-full mx-auto", colors[severity])} />
}

function StatRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-medium text-foreground font-mono",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  )
}

function TipCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}
