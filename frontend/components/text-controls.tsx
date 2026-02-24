"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface TextSettings {
  text: string
  fontFamily: string
  fontSize: number
  posX: number
  posY: number
  color: string
}

const FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Impact", label: "Impact" },
]

interface TextControlsProps {
  settings: TextSettings
  onChange: (settings: TextSettings) => void
  imageWidth: number
  imageHeight: number
}

export function TextControls({ settings, onChange, imageWidth, imageHeight }: TextControlsProps) {
  const update = (partial: Partial<TextSettings>) =>
    onChange({ ...settings, ...partial })

  return (
    <div className="flex flex-col gap-5">
      {/* Text content */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="text-input">Text Content</Label>
        <Input
          id="text-input"
          placeholder="Enter name or text..."
          value={settings.text}
          onChange={(e) => update({ text: e.target.value })}
        />
      </div>

      <Separator />

      {/* Font controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Font Family</Label>
          <Select value={settings.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <span style={{ fontFamily: f.value }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Font Size</Label>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {settings.fontSize}px
            </span>
          </div>
          <Slider
            value={[settings.fontSize]}
            onValueChange={([v]) => update({ fontSize: v })}
            min={8}
            max={200}
            step={1}
          />
        </div>
      </div>

      <Separator />

      {/* Position controls */}
      <div className="flex flex-col gap-4">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Position</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pos-x" className="text-xs">X</Label>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">{settings.posX}px</span>
            </div>
            <Slider
              id="pos-x"
              value={[settings.posX]}
              onValueChange={([v]) => update({ posX: v })}
              min={0}
              max={imageWidth || 1000}
              step={1}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pos-y" className="text-xs">Y</Label>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">{settings.posY}px</span>
            </div>
            <Slider
              id="pos-y"
              value={[settings.posY]}
              onValueChange={([v]) => update({ posY: v })}
              min={0}
              max={imageHeight || 1000}
              step={1}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Color */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="text-color">Text Color</Label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              id="text-color"
              type="color"
              value={settings.color}
              onChange={(e) => update({ color: e.target.value })}
              className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0"
            />
          </div>
          <Input
            value={settings.color}
            onChange={(e) => update({ color: e.target.value })}
            className="flex-1 font-mono text-xs uppercase"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  )
}
