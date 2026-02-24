"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { CsvUpload, type CsvParseResult } from "@/components/csv-upload"
import { TemplatePicker, type TemplateOption } from "@/components/template-picker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  FileSpreadsheet,
  ImageIcon,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Download,
  RotateCcw,
  Loader2,
  PackageCheck,
  FileCheck,
} from "lucide-react"

type Step = 1 | 2 | 3

const STEPS = [
  { step: 1 as Step, label: "Upload CSV", icon: FileSpreadsheet },
  { step: 2 as Step, label: "Select Template", icon: ImageIcon },
  { step: 3 as Step, label: "Generate", icon: Sparkles },
]

type GenerationPhase = "idle" | "generating" | "success"

export default function GenerateCertificatesPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [template, setTemplate] = useState<TemplateOption | null>(null)
  const [phase, setPhase] = useState<GenerationPhase>("idle")
  const [progress, setProgress] = useState(0)
  const [generated, setGenerated] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalRecords = csvResult?.rowCount ?? 0

  const handleCsvLoad = useCallback((result: CsvParseResult, file: File) => {
    setCsvFile(file)
    setCsvResult(result)

    if (result.rowCount === 0) {
      setCsvError("CSV file contains no data rows. Please upload a file with at least one record.")
    } else if (result.headers.length === 0) {
      setCsvError("Could not detect column headers in the CSV file.")
    } else {
      setCsvError(null)
    }
  }, [])

  const handleCsvClear = useCallback(() => {
    setCsvFile(null)
    setCsvResult(null)
    setCsvError(null)
  }, [])

  const handleTemplateSelect = useCallback((tpl: TemplateOption) => {
    setTemplate(tpl)
  }, [])

  const handleTemplateClear = useCallback(() => {
    setTemplate(null)
  }, [])

  const canAdvanceFromStep1 = !!csvFile && !!csvResult && !csvError && csvResult.rowCount > 0
  const canAdvanceFromStep2 = !!template

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, 3) as Step)
  }, [])

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1) as Step)
  }, [])

  const handleGenerate = useCallback(() => {
    if (!csvResult || !template) return
    setPhase("generating")
    setProgress(0)
    setGenerated(0)

    const total = csvResult.rowCount
    let current = 0
    const perTick = Math.max(1, Math.ceil(total / 30))

    intervalRef.current = setInterval(() => {
      current = Math.min(current + perTick, total)
      const pct = Math.round((current / total) * 100)
      setProgress(pct)
      setGenerated(current)

      if (current >= total) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setTimeout(() => {
          setPhase("success")
          setProgress(100)
          setGenerated(total)
        }, 300)
      }
    }, 80)
  }, [csvResult, template])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleReset = useCallback(() => {
    setCurrentStep(1)
    setCsvFile(null)
    setCsvResult(null)
    setCsvError(null)
    setTemplate(null)
    setPhase("idle")
    setProgress(0)
    setGenerated(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return (
    <DashboardShell
      title="Generate Certificates from CSV"
      description="Batch generate certificates using a CSV file and PNG template"
    >
      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => {
              const Icon = s.icon
              const isComplete = currentStep > s.step || phase === "success"
              const isCurrent = currentStep === s.step && phase !== "success"

              return (
                <div key={s.step} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center size-10 rounded-full border-2 transition-colors shrink-0",
                        isComplete
                          ? "bg-primary border-primary"
                          : isCurrent
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2
                          className="size-5 text-primary-foreground"
                        />
                      ) : (
                        <Icon
                          className={cn(
                            "size-5",
                            isCurrent ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        Step {s.step}
                      </p>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isCurrent || isComplete
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </p>
                    </div>
                  </div>

                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-4">
                      <div
                        className={cn(
                          "h-0.5 rounded-full transition-colors",
                          currentStep > s.step ? "bg-primary" : "bg-border"
                        )}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main area */}
        <Card className="min-h-[420px]">
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-base">Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file containing the data for your certificates. The first row should contain column headers.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <CsvUpload
                  onFileLoad={handleCsvLoad}
                  currentFile={csvFile}
                  parseResult={csvResult}
                  onClear={handleCsvClear}
                  error={csvError}
                />

                {csvResult && !csvError && csvResult.rowCount > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-2.5 border-b border-border">
                      <p className="text-xs font-medium text-foreground">Data Preview</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-secondary/30">
                            {csvResult.headers.map((h) => (
                              <th
                                key={h}
                                className="text-left font-medium text-muted-foreground px-4 py-2"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvResult.rows.slice(0, 5).map((row, ri) => (
                            <tr
                              key={ri}
                              className="border-b border-border last:border-b-0"
                            >
                              {row.map((cell, ci) => (
                                <td
                                  key={ci}
                                  className="px-4 py-2 text-foreground truncate max-w-[200px]"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {csvResult.rowCount > 5 && (
                      <div className="px-4 py-2 border-t border-border bg-secondary/20">
                        <p className="text-[11px] text-muted-foreground">
                          Showing 5 of {csvResult.rowCount} records
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-base">Select Template</CardTitle>
                <CardDescription>
                  Choose a built-in template or upload your own PNG certificate background.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatePicker
                  selected={template}
                  onSelect={handleTemplateSelect}
                  onClear={handleTemplateClear}
                />
              </CardContent>
            </>
          )}

          {currentStep === 3 && phase === "idle" && (
            <>
              <CardHeader>
                <CardTitle className="text-base">Ready to Generate</CardTitle>
                <CardDescription>
                  Review the configuration below and click Generate to create your certificates.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                      <FileSpreadsheet className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CSV File</p>
                      <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                        {csvFile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totalRecords} records
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
                      <ImageIcon className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Template</p>
                      <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                        {template?.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {template?.width}x{template?.height}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full mt-2"
                  onClick={handleGenerate}
                >
                  <Sparkles className="size-4" />
                  Generate {totalRecords} Certificate{totalRecords !== 1 ? "s" : ""}
                </Button>
              </CardContent>
            </>
          )}

          {currentStep === 3 && phase === "generating" && (
            <>
              <CardHeader>
                <CardTitle className="text-base">Generating Certificates</CardTitle>
                <CardDescription>
                  Please wait while your certificates are being generated...
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-6 py-8">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary/10">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
                <div className="w-full max-w-md flex flex-col gap-3">
                  <Progress value={progress} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Processing {generated} of {totalRecords}
                    </span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 3 && phase === "success" && (
            <>
              <CardHeader>
                <CardTitle className="text-base">Generation Complete</CardTitle>
                <CardDescription>
                  All certificates have been generated successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-6 py-8">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary/10">
                  <PackageCheck className="size-8 text-primary" />
                </div>
                <div className="text-center flex flex-col gap-1">
                  <p className="text-3xl font-bold text-foreground">{totalRecords}</p>
                  <p className="text-sm text-muted-foreground">
                    certificate{totalRecords !== 1 ? "s" : ""} generated successfully
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button size="lg" className="flex-1">
                    <Download className="size-4" />
                    Download ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    <RotateCcw className="size-4" />
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Sidebar info */}
        <div className="flex flex-col gap-4">
          {/* Progress summary card */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              <SummaryRow
                label="CSV Data"
                done={!!csvFile && !!csvResult && !csvError}
                value={
                  csvFile && csvResult && !csvError
                    ? `${csvResult.rowCount} records`
                    : "Not uploaded"
                }
              />
              <Separator />
              <SummaryRow
                label="Template"
                done={!!template}
                value={template ? template.name : "Not selected"}
              />
              <Separator />
              <SummaryRow
                label="Status"
                done={phase === "success"}
                value={
                  phase === "success"
                    ? "Complete"
                    : phase === "generating"
                      ? "In progress..."
                      : "Ready"
                }
              />
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          {phase !== "success" && (
            <div className="flex flex-col gap-2">
              {currentStep < 3 && (
                <Button
                  onClick={goNext}
                  disabled={
                    (currentStep === 1 && !canAdvanceFromStep1) ||
                    (currentStep === 2 && !canAdvanceFromStep2)
                  }
                  className="w-full"
                >
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              )}
              {currentStep > 1 && phase === "idle" && (
                <Button
                  variant="outline"
                  onClick={goPrev}
                  className="w-full"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              )}
            </div>
          )}

          {/* CSV format help */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">CSV Format</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="rounded-lg bg-secondary/50 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                name,email,course
                <br />
                John Doe,john@example.com,React
                <br />
                Jane Smith,jane@example.com,Node.js
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                First row must contain column headers. Each subsequent row represents one certificate.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

function SummaryRow({
  label,
  done,
  value,
}: {
  label: string
  done: boolean
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center justify-center size-5 rounded-full",
            done ? "bg-primary/10" : "bg-secondary"
          )}
        >
          {done ? (
            <FileCheck className="size-3 text-primary" />
          ) : (
            <div className="size-2 rounded-full bg-muted-foreground/30" />
          )}
        </div>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <Badge
        variant={done ? "default" : "secondary"}
        className="text-[10px] font-normal"
      >
        {value}
      </Badge>
    </div>
  )
}
