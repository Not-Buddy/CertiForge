'use client'

import { DashboardShell } from '@/components/dashboard-shell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Copy, CheckCircle2, AlertCircle, Lightbulb, FolderTree } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

const folderStructure = `certs-project/
├── templates/
│   ├── diploma.png
│   ├── certificate-of-completion.png
│   └── award.png
├── fonts/
│   ├── Roboto-Regular.ttf
│   ├── Roboto-Bold.ttf
│   └── OpenSans-Light.ttf
├── data/
│   ├── employees.csv
│   ├── courses.csv
│   └── archive/
│       └── 2024-q1.csv
├── output/
│   ├── certificates/
│   ├── archive/
│   └── failed/
└── README.txt`

export default function FileOrganizationTipsPage() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(folderStructure)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DashboardShell title="File Organization Tips" description="Best practices for organizing your CertiForge project files">
      <div className="grid gap-6">
        {/* Quick Start Alert */}
        <Alert className="border-primary/30 bg-primary/5">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertTitle>Pro Tip</AlertTitle>
          <AlertDescription>
            Start with the recommended folder structure below to avoid common errors and make batch processing seamless.
          </AlertDescription>
        </Alert>

        {/* Recommended Folder Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              Recommended Folder Structure
            </CardTitle>
            <CardDescription>Copy this structure to organize your CertiForge project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="rounded-lg bg-card border border-border p-4 overflow-x-auto text-sm font-mono text-foreground">
                {folderStructure}
              </pre>
              <Button
                onClick={copyToClipboard}
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="font-mono font-semibold text-primary min-w-fit">templates/</div>
                <div className="text-muted-foreground">Store all PNG certificate templates here. Keep them organized by type.</div>
              </div>
              <div className="flex gap-3">
                <div className="font-mono font-semibold text-primary min-w-fit">fonts/</div>
                <div className="text-muted-foreground">Keep all TTF and OTF font files in one place for easy reference and batch processing.</div>
              </div>
              <div className="flex gap-3">
                <div className="font-mono font-semibold text-primary min-w-fit">data/</div>
                <div className="text-muted-foreground">Store your CSV files here. Use a separate archive subdirectory for historical data.</div>
              </div>
              <div className="flex gap-3">
                <div className="font-mono font-semibold text-primary min-w-fit">output/</div>
                <div className="text-muted-foreground">Generated certificates go here, organized by batch. Keep a failed/ subdirectory for debugging.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Naming Conventions */}
        <Card>
          <CardHeader>
            <CardTitle>Naming Conventions</CardTitle>
            <CardDescription>Follow these patterns to avoid conflicts and stay organized</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Templates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">✓</Badge>
                    <div>
                      <span className="font-mono text-primary">diploma-2024.png</span>
                      <p className="text-muted-foreground text-xs mt-1">Include year or version number</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">✗</Badge>
                    <div>
                      <span className="font-mono text-destructive">template1.png</span>
                      <p className="text-muted-foreground text-xs mt-1">Vague names make tracking difficult</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div>
                <h4 className="font-semibold text-foreground mb-2">CSV Files</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">✓</Badge>
                    <div>
                      <span className="font-mono text-primary">employees-2024-01-15.csv</span>
                      <p className="text-muted-foreground text-xs mt-1">Include date and dataset type</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">✗</Badge>
                    <div>
                      <span className="font-mono text-destructive">data.csv</span>
                      <p className="text-muted-foreground text-xs mt-1">Too generic, hard to identify</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-2" />

              <div>
                <h4 className="font-semibold text-foreground mb-2">Fonts</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">✓</Badge>
                    <div>
                      <span className="font-mono text-primary">Roboto-Regular.ttf</span>
                      <p className="text-muted-foreground text-xs mt-1">Include weight and style</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">✗</Badge>
                    <div>
                      <span className="font-mono text-destructive">font.ttf</span>
                      <p className="text-muted-foreground text-xs mt-1">Difficult to distinguish font variants</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSV Formatting Tips */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Formatting Best Practices</CardTitle>
            <CardDescription>Proper CSV formatting prevents batch processing errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <h4 className="font-semibold text-foreground">Headers</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Always include headers in the first row</li>
                  <li>• Use lowercase with underscores (name, email_address, course_name)</li>
                  <li>• Avoid special characters and spaces</li>
                  <li>• Keep header names short and descriptive</li>
                </ul>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <h4 className="font-semibold text-foreground">Data Entries</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• No empty rows between data entries</li>
                  <li>• Consistent data types per column</li>
                  <li>• Remove leading/trailing whitespace</li>
                  <li>• Use UTF-8 encoding for special characters</li>
                </ul>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <h4 className="font-semibold text-foreground">Delimiters</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Use comma (,) as the delimiter</li>
                  <li>• If data contains commas, wrap fields in quotes</li>
                  <li>• Example: {"\"Smith, John\",john@example.com"}</li>
                </ul>
              </div>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Common Issue</AlertTitle>
              <AlertDescription>
                CSV files exported from Excel sometimes use semicolons (;) instead of commas. Convert to comma-separated before uploading.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Template Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Certificate Template Best Practices</CardTitle>
            <CardDescription>Design templates that work reliably with batch processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="font-semibold text-foreground">Resolution</h4>
                  <p className="text-sm text-muted-foreground">
                    Use at least <span className="font-mono text-primary">2400 × 1600 px</span> for high-quality printing. <span className="font-mono text-primary">300 DPI</span> recommended.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="font-semibold text-foreground">Color Space</h4>
                  <p className="text-sm text-muted-foreground">
                    Use <span className="font-mono text-primary">sRGB</span> for web, <span className="font-mono text-primary">CMYK</span> for print. Always include transparency when needed.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="font-semibold text-foreground">Text Areas</h4>
                  <p className="text-sm text-muted-foreground">
                    Leave clear spaces (at least <span className="font-mono text-primary">10%</span> margin) for text placement. Avoid text over complex backgrounds.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="font-semibold text-foreground">Fonts</h4>
                  <p className="text-sm text-muted-foreground">
                    Use standard fonts (Roboto, Arial, Open Sans). Ensure all font files are included in your fonts directory.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Mistakes */}
        <Card>
          <CardHeader>
            <CardTitle>Common Mistakes to Avoid</CardTitle>
            <CardDescription>Learn from others' pitfalls and prevent batch processing issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Inconsistent Column Order</h4>
                    <p className="text-sm text-muted-foreground">
                      If you reorder columns in your CSV, the batch processor may map data to wrong fields. Always maintain the same column order.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Missing Font Files</h4>
                    <p className="text-sm text-muted-foreground">
                      If a font file is referenced but not included in the fonts/ directory, batch generation will fail or use fallback fonts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Empty Rows in CSV</h4>
                    <p className="text-sm text-muted-foreground">
                      Blank rows confuse the parser. Remove all empty rows before processing. Use our Debug CSV tool to find them automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Template Path Mismatches</h4>
                    <p className="text-sm text-muted-foreground">
                      If your template is at templates/awards/diploma.png but you reference it as templates/diploma.png, processing will fail.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Duplicate Entries</h4>
                    <p className="text-sm text-muted-foreground">
                      Duplicate rows in your CSV will generate duplicate certificates, wasting time and storage. Check for duplicates before processing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/create-sample-csv">Create Sample CSV</Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/debug-csv">Debug Your CSV</Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/debug-template">Debug Your Template</Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/debug-fonts">Check Font Files</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
