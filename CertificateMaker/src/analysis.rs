// src/analysis.rs
use anyhow::{Context, Result};
use image::{open, GenericImageView};
use png::{Decoder, ColorType, BitDepth};
use std::fs::File;
use std::path::Path;

#[derive(Debug)]
pub struct PngAnalysis {
    pub filename: String,
    pub file_size_bytes: u64,
    pub width: u32,
    pub height: u32,
    pub color_type: ColorType,
    pub bit_depth: BitDepth,
    pub has_transparency: bool,
    pub pixel_count: u64,
    pub bytes_per_pixel: u8,
}

pub fn analyze_png_file(file_path: &str) -> Result<PngAnalysis> {
    let path = Path::new(file_path);
    
    // Get file size
    let file_size_bytes = std::fs::metadata(path)
        .with_context(|| format!("Failed to read file metadata for {}", file_path))?
        .len();

    // Basic image analysis using image crate
    let img = open(path)
        .with_context(|| format!("Failed to open image file {}", file_path))?;

    let (width, height) = img.dimensions();

    // Detailed PNG analysis using png crate
    let file = File::open(path)
        .with_context(|| format!("Failed to open file {}", file_path))?;
    
    let decoder = Decoder::new(file);
    let reader = decoder.read_info()
        .with_context(|| "Failed to read PNG info")?;

    let info = reader.info();
    let color_type = info.color_type;
    let bit_depth = info.bit_depth;
    
    // Calculate additional metrics
    let pixel_count = (width as u64) * (height as u64);
    let bytes_per_pixel = match color_type {
        ColorType::Grayscale => 1,
        ColorType::Rgb => 3,
        ColorType::Indexed => 1,
        ColorType::GrayscaleAlpha => 2,
        ColorType::Rgba => 4,
    };

    let has_transparency = matches!(color_type, ColorType::GrayscaleAlpha | ColorType::Rgba) 
        || info.trns.is_some();

    Ok(PngAnalysis {
        filename: file_path.to_string(),
        file_size_bytes,
        width,
        height,
        color_type,
        bit_depth,
        has_transparency,
        pixel_count,
        bytes_per_pixel,
    })
}

pub fn print_analysis(analysis: &PngAnalysis) {
    println!("=== PNG File Analysis ===");
    println!("File: {}", analysis.filename);
    println!("File size: {} bytes ({:.2} KB)", 
             analysis.file_size_bytes, 
             analysis.file_size_bytes as f64 / 1024.0);
    
    println!("\n--- Image Properties ---");
    println!("Dimensions: {}x{} pixels", analysis.width, analysis.height);
    println!("Total pixels: {}", analysis.pixel_count);
    println!("Aspect ratio: {:.3}", analysis.width as f64 / analysis.height as f64);
    
    println!("\n--- Color Information ---");
    println!("Color type: {:?}", analysis.color_type);
    println!("Bit depth: {:?}", analysis.bit_depth);
    println!("Bytes per pixel: {}", analysis.bytes_per_pixel);
    println!("Has transparency: {}", analysis.has_transparency);
    
    println!("\n--- Technical Details ---");
    let theoretical_size = analysis.pixel_count * analysis.bytes_per_pixel as u64;
    let compression_ratio = theoretical_size as f64 / analysis.file_size_bytes as f64;
    println!("Theoretical uncompressed size: {} bytes ({:.2} KB)", 
             theoretical_size, 
             theoretical_size as f64 / 1024.0);
    println!("Compression ratio: {:.2}:1", compression_ratio);
    
    // Classify image size
    let size_category = match (analysis.width, analysis.height) {
        (w, h) if w <= 128 && h <= 128 => "Thumbnail",
        (w, h) if w <= 512 && h <= 512 => "Small",
        (w, h) if w <= 1920 && h <= 1080 => "Medium (HD)",
        (w, h) if w <= 3840 && h <= 2160 => "Large (4K)",
        _ => "Very Large",
    };
    println!("Size category: {}", size_category);
}
