"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Check, Trash2, Copy, Download } from "lucide-react"

const STORAGE_KEY = "certiforge-settings"

const FONTS = [
  "Inter",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
]

interface Settings {
  appName: string
  outputFolder: string
  enableNotifications: boolean
  autoDownload: boolean
  defaultFont: string
  defaultFontSize: number
  defaultColor: string
  defaultPosX: number
  defaultPosY: number
  maxFileSize: string
  csvDelimiter: string
  strictValidation: boolean
  theme: string
  density: string
  enableAnimations: boolean
  debugMode: boolean
  logLevel: string
}

const DEFAULT_SETTINGS: Settings = {
  appName: "CertiForge",
  outputFolder: "/certificates/output",
  enableNotifications: true,
  autoDownload: false,
  defaultFont: "Inter",
  defaultFontSize: 48,
  defaultColor: "#000000",
  defaultPosX: 100,
  defaultPosY: 200,
  maxFileSize: "50",
  csvDelimiter: "comma",
  strictValidation: true,
  theme: "system",
  density: "comfortable",
  enableAnimations: true,
  debugMode: false,
  logLevel: "warning",
}

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle new settings added in future versions
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors (e.g. quota exceeded)
  }
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // All settings in one state object
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings())
    setLoaded(true)
  }, [])

  const update = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    // Small delay for UX feedback
    await new Promise((resolve) => setTimeout(resolve, 300))
    saveSettings(settings)
    setSaveSuccess(true)
    setIsSaving(false)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure? This will reset all settings to default values."
      )
    ) {
      setSettings(DEFAULT_SETTINGS)
      saveSettings(DEFAULT_SETTINGS)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const handleClearCache = () => {
    if (window.confirm("Clear all cached files? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY)
      setSettings(DEFAULT_SETTINGS)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const handleExportSettings = () => {
    const json = JSON.stringify(settings, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `certiforge-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Don't render until settings are loaded from localStorage to avoid flash
  if (!loaded) return null

  return (
    <DashboardShell
      title="Settings"
      description="Configure system preferences and application behavior"
    >
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 mb-6 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b px-4 py-4 lg:-mx-6 lg:px-6">
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <>
              <Check className="size-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Settings saved to localStorage
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
          >
            {isSaving ? "Saving..." : saveSuccess ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* 1. General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure basic application preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="app-name">Application Name</Label>
              <Input
                id="app-name"
                value={settings.appName}
                onChange={(e) => update({ appName: e.target.value })}
                placeholder="Enter application name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="output-folder">Default Output Folder</Label>
              <Input
                id="output-folder"
                value={settings.outputFolder}
                onChange={(e) => update({ outputFolder: e.target.value })}
                placeholder="/path/to/output"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="grid gap-2">
                <Label>Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Show alerts for important events
                </p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(v) => update({ enableNotifications: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="grid gap-2">
                <Label>Auto-download Certificates</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically download after generation
                </p>
              </div>
              <Switch
                checked={settings.autoDownload}
                onCheckedChange={(v) => update({ autoDownload: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Certificate Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Certificate Defaults</CardTitle>
          <CardDescription>
            Set default values for certificate generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="default-font">Default Font</Label>
              <Select value={settings.defaultFont} onValueChange={(v) => update({ defaultFont: v })}>
                <SelectTrigger id="default-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Default Font Size</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {settings.defaultFontSize}px
                </span>
              </div>
              <Slider
                value={[settings.defaultFontSize]}
                onValueChange={([v]) => update({ defaultFontSize: v })}
                min={8}
                max={200}
                step={1}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="default-color">Default Text Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="default-color"
                  type="color"
                  value={settings.defaultColor}
                  onChange={(e) => update({ defaultColor: e.target.value })}
                  className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0"
                />
                <Input
                  value={settings.defaultColor}
                  onChange={(e) => update({ defaultColor: e.target.value })}
                  className="flex-1 font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Position X</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {settings.defaultPosX}px
                  </span>
                </div>
                <Slider
                  value={[settings.defaultPosX]}
                  onValueChange={([v]) => update({ defaultPosX: v })}
                  min={0}
                  max={2000}
                  step={1}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Position Y</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {settings.defaultPosY}px
                  </span>
                </div>
                <Slider
                  value={[settings.defaultPosY]}
                  onValueChange={([v]) => update({ defaultPosY: v })}
                  min={0}
                  max={2000}
                  step={1}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. File Handling Settings */}
      <Card>
        <CardHeader>
          <CardTitle>File Handling</CardTitle>
          <CardDescription>
            Control file processing and validation behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-2 pb-4 border-b">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Allowed File Types
              </Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">.png</Badge>
                <Badge variant="secondary">.jpg</Badge>
                <Badge variant="secondary">.csv</Badge>
                <Badge variant="secondary">.ttf</Badge>
                <Badge variant="secondary">.otf</Badge>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="max-file-size">
                Max File Size (MB)
              </Label>
              <Input
                id="max-file-size"
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => update({ maxFileSize: e.target.value })}
                min="1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="csv-delimiter">CSV Delimiter</Label>
              <Select value={settings.csvDelimiter} onValueChange={(v) => update({ csvDelimiter: v })}>
                <SelectTrigger id="csv-delimiter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comma">Comma (,)</SelectItem>
                  <SelectItem value="semicolon">Semicolon (;)</SelectItem>
                  <SelectItem value="tab">Tab (→)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="grid gap-2">
                <Label>Enable Strict CSV Validation</Label>
                <p className="text-xs text-muted-foreground">
                  Reject files with missing headers or empty rows
                </p>
              </div>
              <Switch
                checked={settings.strictValidation}
                onCheckedChange={(v) => update({ strictValidation: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={settings.theme} onValueChange={(v) => update({ theme: v })}>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="density">UI Density</Label>
              <Select value={settings.density} onValueChange={(v) => update({ density: v })}>
                <SelectTrigger id="density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="grid gap-2">
                <Label>Enable Animations</Label>
                <p className="text-xs text-muted-foreground">
                  Smooth transitions and visual effects
                </p>
              </div>
              <Switch
                checked={settings.enableAnimations}
                onCheckedChange={(v) => update({ enableAnimations: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Debug & Logging */}
      <Card>
        <CardHeader>
          <CardTitle>Debug & Logging</CardTitle>
          <CardDescription>
            Configure debugging and log output behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="grid gap-2">
                <Label>Enable Debug Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Show detailed diagnostic information
                </p>
              </div>
              <Switch checked={settings.debugMode} onCheckedChange={(v) => update({ debugMode: v })} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="log-level">Log Level</Label>
              <Select value={settings.logLevel} onValueChange={(v) => update({ logLevel: v })}>
                <SelectTrigger id="log-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleExportSettings}
              >
                <Download className="size-4" />
                Export Settings as JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that require caution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Alert */}
            <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive/90">
                These actions cannot be undone. Please proceed with caution.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearCache}
              >
                <Trash2 className="size-4" />
                Clear All Stored Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleReset}
              >
                <Trash2 className="size-4" />
                Reset All Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
