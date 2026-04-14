const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://alpha.innosolve.in/certiforge";
const API_BASE = `${baseUrl}/api`;

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface FontInfo {
    name: string;
    size_bytes: number;
}

export interface TemplateInfo {
    name: string;
    width: number;
    height: number;
    size_bytes: number;
}

export interface PngAnalysis {
    filename: string;
    file_size_bytes: number;
    width: number;
    height: number;
    color_type_str: string;
    bit_depth_val: number;
    has_transparency: boolean;
    pixel_count: number;
    bytes_per_pixel: number;
}

export interface GenerateSingleConfig {
    text: string;
    x: number;
    y: number;
    font: string;
    font_size: number;
    color: string;
    center_text?: boolean;
}

export interface GenerateBatchConfig {
    x: number;
    y: number;
    font: string;
    font_size: number;
    color: string;
}

export interface JobStatus {
    id: string;
    status: "running" | "done" | "error";
    completed: number;
    total: number;
    error: string | null;
}

export interface BatchJobResponse {
    job_id: string;
    total: number;
}

// ---------------------------------------------------------------------------
//  API Functions
// ---------------------------------------------------------------------------

export async function fetchFonts(): Promise<FontInfo[]> {
    const res = await fetch(`${API_BASE}/fonts`);
    if (!res.ok) throw new Error("Failed to fetch fonts");
    return res.json();
}

export async function fetchTemplates(): Promise<TemplateInfo[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error("Failed to fetch templates");
    return res.json();
}

export function getTemplateUrl(name: string): string {
    return `${API_BASE}/templates/${encodeURIComponent(name)}`;
}

export async function analyzePngServer(file: File): Promise<PngAnalysis> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: form });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
    }
    return res.json();
}

export async function generateSingle(
    templateFile: File,
    config: GenerateSingleConfig
): Promise<Blob> {
    const form = new FormData();
    form.append("template", templateFile);
    form.append("config", JSON.stringify(config));
    const res = await fetch(`${API_BASE}/generate-single`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
    }
    return res.blob();
}

export async function generateBatch(
    templateFile: File,
    csvFile: File,
    config: GenerateBatchConfig
): Promise<BatchJobResponse> {
    const form = new FormData();
    form.append("template", templateFile);
    form.append("csv", csvFile);
    form.append("config", JSON.stringify(config));
    const res = await fetch(`${API_BASE}/generate-batch`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Batch generation failed" }));
        throw new Error(err.error || "Batch generation failed");
    }
    return res.json();
}

export async function checkJobStatus(jobId: string): Promise<JobStatus> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/status`);
    if (!res.ok) throw new Error("Failed to check job status");
    return res.json();
}

export async function downloadJob(jobId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/download`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error || "Download failed");
    }
    return res.blob();
}

export async function uploadTemplate(file: File): Promise<{ name: string; width: number; height: number }> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/upload-template`, { method: "POST", body: form });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
    }
    return res.json();
}

export async function uploadFont(file: File): Promise<{ name: string }> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/upload-font`, { method: "POST", body: form });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
    }
    return res.json();
}
