// src/api.rs
use actix_multipart::Multipart;
use actix_web::{HttpResponse, Responder, web};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::analysis::analyze_png_file;
use crate::editpng::{TextConfigOwned, add_text_to_image_bytes};

// ---------------------------------------------------------------------------
//  Shared state
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct JobStatus {
    pub id: String,
    pub status: String, // "running" | "done" | "error"
    pub completed: usize,
    pub total: usize,
    pub error: Option<String>,
}

pub type Jobs = Arc<Mutex<HashMap<String, JobStatus>>>;

// ---------------------------------------------------------------------------
//  Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FontInfo {
    pub name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
pub struct TemplateInfo {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
}

#[derive(Debug, Deserialize)]
pub struct GenerateSingleConfig {
    pub text: String,
    pub x: i32,
    pub y: i32,
    pub font: String,
    pub font_size: f32,
    pub color: String,
    pub center_text: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateBatchConfig {
    pub x: i32,
    pub y: i32,
    pub font: String,
    pub font_size: f32,
    pub color: String,
}

// ---------------------------------------------------------------------------
//  Helper: extract field name and filename from multipart field
// ---------------------------------------------------------------------------

fn get_field_name(field: &actix_multipart::Field) -> String {
    field
        .content_disposition()
        .and_then(|cd| cd.get_name().map(|s| s.to_string()))
        .unwrap_or_default()
}

fn get_field_filename(field: &actix_multipart::Field) -> Option<String> {
    field
        .content_disposition()
        .and_then(|cd| cd.get_filename().map(|s| s.to_string()))
}

// ---------------------------------------------------------------------------
//  Helper: extract bytes from a multipart field
// ---------------------------------------------------------------------------

async fn read_field_bytes(field: &mut actix_multipart::Field) -> Vec<u8> {
    let mut bytes = Vec::new();
    while let Some(chunk) = field.next().await {
        if let Ok(data) = chunk {
            bytes.extend_from_slice(&data);
        }
    }
    bytes
}

// ---------------------------------------------------------------------------
//  GET /api/fonts — list available fonts in assets/
// ---------------------------------------------------------------------------

pub async fn list_fonts() -> impl Responder {
    let assets_dir = "assets";
    let mut fonts: Vec<FontInfo> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(assets_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if ext == "ttf" || ext == "otf" || ext == "woff" || ext == "woff2" {
                    if let (Some(name), Ok(meta)) = (path.file_name(), std::fs::metadata(&path)) {
                        fonts.push(FontInfo {
                            name: name.to_string_lossy().to_string(),
                            size_bytes: meta.len(),
                        });
                    }
                }
            }
        }
    }

    fonts.sort_by(|a, b| a.name.cmp(&b.name));
    HttpResponse::Ok().json(fonts)
}

// ---------------------------------------------------------------------------
//  GET /api/templates — list available templates in Template/
// ---------------------------------------------------------------------------

pub async fn list_templates() -> impl Responder {
    let template_dir = "Template";
    let mut templates: Vec<TemplateInfo> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(template_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if ext == "png" || ext == "jpg" || ext == "jpeg" {
                    if let Some(name) = path.file_name() {
                        let name_str = name.to_string_lossy().to_string();
                        let size_bytes = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);

                        let (width, height) =
                            if let Ok(analysis) = analyze_png_file(&path.to_string_lossy()) {
                                (analysis.width, analysis.height)
                            } else {
                                (0, 0)
                            };

                        templates.push(TemplateInfo {
                            name: name_str,
                            width,
                            height,
                            size_bytes,
                        });
                    }
                }
            }
        }
    }

    templates.sort_by(|a, b| a.name.cmp(&b.name));
    HttpResponse::Ok().json(templates)
}

// ---------------------------------------------------------------------------
//  GET /api/templates/{name} — serve a template image file
// ---------------------------------------------------------------------------

pub async fn serve_template(path: web::Path<String>) -> impl Responder {
    let name = path.into_inner();
    let file_path = format!("Template/{}", name);

    if !Path::new(&file_path).exists() {
        return HttpResponse::NotFound().json(serde_json::json!({"error": "Template not found"}));
    }

    match std::fs::read(&file_path) {
        Ok(bytes) => {
            let content_type = if file_path.ends_with(".png") {
                "image/png"
            } else {
                "image/jpeg"
            };
            HttpResponse::Ok().content_type(content_type).body(bytes)
        }
        Err(_) => HttpResponse::InternalServerError()
            .json(serde_json::json!({"error": "Failed to read template file"})),
    }
}

// ---------------------------------------------------------------------------
//  POST /api/analyze — analyze an uploaded PNG file
// ---------------------------------------------------------------------------

pub async fn analyze_image(mut payload: Multipart) -> impl Responder {
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut filename = String::from("uploaded.png");

    while let Some(Ok(mut field)) = payload.next().await {
        let field_name = get_field_name(&field);

        if field_name == "file" {
            if let Some(fname) = get_field_filename(&field) {
                filename = fname;
            }
            image_bytes = Some(read_field_bytes(&mut field).await);
        }
    }

    let bytes = match image_bytes {
        Some(b) if !b.is_empty() => b,
        _ => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": "No file uploaded"}));
        }
    };

    // Write to temp file for analysis (png crate needs a file reader)
    let tmp = match tempfile::NamedTempFile::new() {
        Ok(mut f) => {
            if f.write_all(&bytes).is_err() {
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "Failed to write temp file"}));
            }
            f
        }
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Failed to create temp file"}));
        }
    };

    let tmp_path = tmp.path().to_string_lossy().to_string();
    match analyze_png_file(&tmp_path) {
        Ok(mut analysis) => {
            analysis.filename = filename;
            HttpResponse::Ok().json(analysis)
        }
        Err(e) => HttpResponse::BadRequest()
            .json(serde_json::json!({"error": format!("Analysis failed: {}", e)})),
    }
}

// ---------------------------------------------------------------------------
//  POST /api/generate-single — add text to a single image and return PNG
// ---------------------------------------------------------------------------

pub async fn generate_single(mut payload: Multipart) -> impl Responder {
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut config_json: Option<String> = None;

    while let Some(Ok(mut field)) = payload.next().await {
        let field_name = get_field_name(&field);

        match field_name.as_str() {
            "template" => {
                image_bytes = Some(read_field_bytes(&mut field).await);
            }
            "config" => {
                let bytes = read_field_bytes(&mut field).await;
                config_json = Some(String::from_utf8_lossy(&bytes).to_string());
            }
            _ => {}
        }
    }

    let bytes = match image_bytes {
        Some(b) if !b.is_empty() => b,
        _ => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": "No template image uploaded"}));
        }
    };

    let config_str = match config_json {
        Some(c) => c,
        None => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": "No config provided"}));
        }
    };

    let config: GenerateSingleConfig = match serde_json::from_str(&config_str) {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": format!("Invalid config JSON: {}", e)}));
        }
    };

    let text_config = TextConfigOwned {
        x: config.x,
        y: config.y,
        font_filename: config.font.clone(),
        font_size: config.font_size,
        hex_color: config.color.clone(),
    };

    let center = config.center_text.unwrap_or(false);

    match add_text_to_image_bytes(&bytes, &config.text, &text_config, center) {
        Ok(output_bytes) => HttpResponse::Ok()
            .content_type("image/png")
            .body(output_bytes),
        Err(e) => HttpResponse::InternalServerError()
            .json(serde_json::json!({"error": format!("Generation failed: {}", e)})),
    }
}

// ---------------------------------------------------------------------------
//  POST /api/generate-batch — batch generate certificates, returns job ID
// ---------------------------------------------------------------------------

pub async fn generate_batch(mut payload: Multipart, jobs: web::Data<Jobs>) -> impl Responder {
    let mut template_bytes: Option<Vec<u8>> = None;
    let mut csv_bytes: Option<Vec<u8>> = None;
    let mut config_json: Option<String> = None;

    while let Some(Ok(mut field)) = payload.next().await {
        let field_name = get_field_name(&field);

        match field_name.as_str() {
            "template" => {
                template_bytes = Some(read_field_bytes(&mut field).await);
            }
            "csv" => {
                csv_bytes = Some(read_field_bytes(&mut field).await);
            }
            "config" => {
                let bytes = read_field_bytes(&mut field).await;
                config_json = Some(String::from_utf8_lossy(&bytes).to_string());
            }
            _ => {}
        }
    }

    let template = match template_bytes {
        Some(b) if !b.is_empty() => b,
        _ => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": "No template image uploaded"}));
        }
    };

    let csv_data = match csv_bytes {
        Some(b) if !b.is_empty() => b,
        _ => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": "No CSV file uploaded"}));
        }
    };

    let config_str = match config_json {
        Some(c) => c,
        None => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": "No config provided"}));
        }
    };

    let config: GenerateBatchConfig = match serde_json::from_str(&config_str) {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": format!("Invalid config JSON: {}", e)}));
        }
    };

    // Parse CSV to extract names
    let csv_text = String::from_utf8_lossy(&csv_data).to_string();
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(csv_text.as_bytes());

    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            return HttpResponse::BadRequest()
                .json(serde_json::json!({"error": format!("Failed to read CSV headers: {}", e)}));
        }
    };

    let name_col = headers
        .iter()
        .position(|h| h.trim().to_lowercase() == "name");

    let name_col_index = match name_col {
        Some(i) => i,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "No 'Name' column found in CSV. Make sure your CSV has a column named 'Name'."
            }));
        }
    };

    let mut names: Vec<String> = Vec::new();
    for result in reader.records() {
        if let Ok(record) = result {
            if let Some(name) = record.get(name_col_index) {
                let name = name.trim().to_string();
                if !name.is_empty() {
                    names.push(name);
                }
            }
        }
    }

    if names.is_empty() {
        return HttpResponse::BadRequest()
            .json(serde_json::json!({"error": "No valid names found in CSV"}));
    }

    // Create a job
    let job_id = uuid::Uuid::new_v4().to_string();
    let total = names.len();

    let job = JobStatus {
        id: job_id.clone(),
        status: "running".to_string(),
        completed: 0,
        total,
        error: None,
    };

    {
        let mut job_map = jobs.lock().unwrap();
        job_map.insert(job_id.clone(), job);
    }

    // Create output directory for this job
    let output_dir = format!("certificates/{}", job_id);
    if let Err(e) = std::fs::create_dir_all(&output_dir) {
        let mut job_map = jobs.lock().unwrap();
        if let Some(j) = job_map.get_mut(&job_id) {
            j.status = "error".to_string();
            j.error = Some(format!("Failed to create output dir: {}", e));
        }
        return HttpResponse::InternalServerError()
            .json(serde_json::json!({"error": format!("Failed to create output dir: {}", e)}));
    }

    // Spawn background task
    let jobs_clone = jobs.clone();
    let job_id_clone = job_id.clone();

    std::thread::spawn(move || {
        let text_config = TextConfigOwned {
            x: config.x,
            y: config.y,
            font_filename: config.font.clone(),
            font_size: config.font_size,
            hex_color: config.color.clone(),
        };

        for (i, name) in names.iter().enumerate() {
            match add_text_to_image_bytes(&template, name, &text_config, true) {
                Ok(output_bytes) => {
                    let safe_name = name.replace(' ', "_").replace('/', "_").replace('\\', "_");
                    let output_path = format!("{}/certificate_{}.png", output_dir, safe_name);
                    if let Err(e) = std::fs::write(&output_path, &output_bytes) {
                        eprintln!("Failed to write certificate for {}: {}", name, e);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to generate certificate for {}: {}", name, e);
                }
            }

            // Update job progress
            let mut job_map = jobs_clone.lock().unwrap();
            if let Some(j) = job_map.get_mut(&job_id_clone) {
                j.completed = i + 1;
            }
        }

        // Mark job as done
        let mut job_map = jobs_clone.lock().unwrap();
        if let Some(j) = job_map.get_mut(&job_id_clone) {
            j.status = "done".to_string();
            j.completed = total;
        }
    });

    HttpResponse::Ok().json(serde_json::json!({
        "job_id": job_id,
        "total": total,
    }))
}

// ---------------------------------------------------------------------------
//  GET /api/jobs/{id}/status — check batch job progress
// ---------------------------------------------------------------------------

pub async fn job_status(path: web::Path<String>, jobs: web::Data<Jobs>) -> impl Responder {
    let job_id = path.into_inner();
    let job_map = jobs.lock().unwrap();

    match job_map.get(&job_id) {
        Some(job) => HttpResponse::Ok().json(job),
        None => HttpResponse::NotFound().json(serde_json::json!({"error": "Job not found"})),
    }
}

// ---------------------------------------------------------------------------
//  GET /api/jobs/{id}/download — download batch results as ZIP
// ---------------------------------------------------------------------------

pub async fn job_download(path: web::Path<String>, jobs: web::Data<Jobs>) -> impl Responder {
    let job_id = path.into_inner();

    // Check job exists and is done
    {
        let job_map = jobs.lock().unwrap();
        match job_map.get(&job_id) {
            Some(job) if job.status == "done" => {}
            Some(_) => {
                return HttpResponse::BadRequest()
                    .json(serde_json::json!({"error": "Job is not yet complete"}));
            }
            None => {
                return HttpResponse::NotFound()
                    .json(serde_json::json!({"error": "Job not found"}));
            }
        }
    }

    let output_dir = format!("certificates/{}", job_id);
    if !Path::new(&output_dir).exists() {
        return HttpResponse::NotFound()
            .json(serde_json::json!({"error": "Output directory not found"}));
    }

    // Create ZIP archive
    let zip_buffer = Vec::new();
    let cursor = std::io::Cursor::new(zip_buffer);
    let mut zip_writer = zip::ZipWriter::new(cursor);

    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    if let Ok(entries) = std::fs::read_dir(&output_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let (Some(name), Ok(bytes)) = (path.file_name(), std::fs::read(&path)) {
                    let name_str = name.to_string_lossy().to_string();
                    if zip_writer.start_file(&name_str, options).is_ok() {
                        let _ = zip_writer.write_all(&bytes);
                    }
                }
            }
        }
    }

    let cursor = match zip_writer.finish() {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": format!("Failed to create ZIP: {}", e)}));
        }
    };

    let zip_bytes = cursor.into_inner();

    HttpResponse::Ok()
        .content_type("application/zip")
        .insert_header((
            "Content-Disposition",
            format!("attachment; filename=\"certificates-{}.zip\"", &job_id[..8]),
        ))
        .body(zip_bytes)
}

// ---------------------------------------------------------------------------
//  POST /api/upload-template — upload a custom template PNG
// ---------------------------------------------------------------------------

pub async fn upload_template(mut payload: Multipart) -> impl Responder {
    while let Some(Ok(mut field)) = payload.next().await {
        let field_name = get_field_name(&field);

        if field_name == "file" {
            let filename = get_field_filename(&field).unwrap_or_else(|| "upload.png".to_string());
            let bytes = read_field_bytes(&mut field).await;
            let dest = format!("Template/{}", filename);

            if let Err(e) = std::fs::write(&dest, &bytes) {
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": format!("Failed to save: {}", e)}));
            }

            let (width, height) = match analyze_png_file(&dest) {
                Ok(a) => (a.width, a.height),
                Err(_) => (0, 0),
            };

            return HttpResponse::Ok().json(serde_json::json!({
                "name": filename,
                "width": width,
                "height": height,
            }));
        }
    }

    HttpResponse::BadRequest().json(serde_json::json!({"error": "No file uploaded"}))
}

// ---------------------------------------------------------------------------
//  POST /api/upload-font — upload a custom font file
// ---------------------------------------------------------------------------

pub async fn upload_font(mut payload: Multipart) -> impl Responder {
    while let Some(Ok(mut field)) = payload.next().await {
        let field_name = get_field_name(&field);

        if field_name == "file" {
            let filename = get_field_filename(&field).unwrap_or_else(|| "upload.ttf".to_string());
            let bytes = read_field_bytes(&mut field).await;
            let dest = format!("assets/{}", filename);

            if let Err(e) = std::fs::write(&dest, &bytes) {
                return HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": format!("Failed to save: {}", e)}));
            }

            return HttpResponse::Ok().json(serde_json::json!({
                "name": filename,
            }));
        }
    }

    HttpResponse::BadRequest().json(serde_json::json!({"error": "No file uploaded"}))
}

// ---------------------------------------------------------------------------
//  GET /api/health — simple health check
// ---------------------------------------------------------------------------

pub async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "CertiForge API",
    }))
}
