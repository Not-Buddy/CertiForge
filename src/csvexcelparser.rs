// src/csvexcelparser.rs
use anyhow::{Context, Result};
use csv::ReaderBuilder;
use std::fs::File;
use std::path::Path;
use std::io::{self, Write};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use rayon::prelude::*;
use rusttype::{Font, Scale, point};

use crate::editpng::add_text_with_custom_options;
use crate::analysis::analyze_png_file;


// Function to get user input
fn get_user_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

// Parse CSV file and extract names with better error handling and debugging
pub fn parse_csv_names(file_path: &str) -> Result<Vec<String>> {
    let file = File::open(file_path)
        .with_context(|| format!("Failed to open CSV file: {}", file_path))?;
    
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);
    
    // First, let's check the headers
    let headers = reader.headers()
        .with_context(|| "Failed to read CSV headers")?;
    
    println!("📋 CSV Headers found: {:?}", headers);
    
    // Look for name column (case insensitive)
    let mut name_column_index = None;
    for (index, header) in headers.iter().enumerate() {
        if header.trim().to_lowercase() == "name" {
            name_column_index = Some(index);
            break;
        }
    }
    
    if name_column_index.is_none() {
        println!("❌ Available columns: {:?}", headers);
        return Err(anyhow::anyhow!("No 'Name' column found. Make sure your CSV has a column named 'Name'"));
    }
    
    let name_col_index = name_column_index.unwrap();
    println!("✅ Found 'Name' column at index {}", name_col_index);
    
    let mut names = Vec::new();
    
    // Parse records manually instead of using serde
    for (row_num, result) in reader.records().enumerate() {
        match result {
            Ok(record) => {
                if let Some(name_field) = record.get(name_col_index) {
                    let name = name_field.trim().to_string();
                    if !name.is_empty() {
                        names.push(name);
                        println!("  Row {}: '{}'", row_num + 2, names.last().unwrap()); // +2 because of header and 0-indexing
                    } else {
                        println!("  Row {}: Empty name, skipping", row_num + 2);
                    }
                } else {
                    println!("  Row {}: No data in name column", row_num + 2);
                }
            }
            Err(e) => {
                println!("❌ Error reading row {}: {}", row_num + 2, e);
                println!("💡 This might be due to formatting issues in your CSV");
            }
        }
    }
    
    if names.is_empty() {
        return Err(anyhow::anyhow!("No valid names found in CSV file"));
    }
    
    println!("✅ Successfully parsed {} names", names.len());
    Ok(names)
}

// Function to debug CSV file contents
pub fn debug_csv_file(file_path: &str) -> Result<()> {
    println!("\n🔍 === CSV File Debug Info ===");
    
    // Read raw file content first
    let content = std::fs::read_to_string(file_path)
        .with_context(|| format!("Failed to read file: {}", file_path))?;
    
    println!("📄 File size: {} bytes", content.len());
    println!("📄 First 200 characters:");
    println!("{}", content.chars().take(200).collect::<String>());
    
    if content.len() > 200 {
        println!("... (truncated)");
    }
    
    // Count lines
    let lines: Vec<&str> = content.lines().collect();
    println!("📄 Total lines: {}", lines.len());
    
    if !lines.is_empty() {
        println!("📄 First line (header): '{}'", lines[0]);
        if lines.len() > 1 {
            println!("📄 Second line (first data): '{}'", lines[1]);
        }
    }
    
    // Try to parse with CSV reader
    let file = File::open(file_path)?;
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);
    
    match reader.headers() {
        Ok(headers) => {
            println!("📋 Parsed headers: {:?}", headers);
            println!("📋 Number of columns: {}", headers.len());
        }
        Err(e) => {
            println!("❌ Failed to parse headers: {}", e);
        }
    }
    
    Ok(())
}

// Auto-detect file type and parse names (CSV only)
pub fn parse_names_from_file(file_path: &str) -> Result<Vec<String>> {
    let path = Path::new(file_path);
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    match extension.as_str() {
        "csv" => parse_csv_names(file_path),
        _ => Err(anyhow::anyhow!(
            "Unsupported file type. Please use .csv files only"
        )),
    }
}

// Function to list CSV files in excelcsvs directory
fn list_csv_files() -> Result<Vec<String>> {
    let csv_dir = "excelcsvs";
    let mut csv_files = Vec::new();
    
    if !Path::new(csv_dir).exists() {
        return Err(anyhow::anyhow!("Directory 'excelcsvs' not found. Please create it and add CSV files."));
    }
    
    let entries = std::fs::read_dir(csv_dir)
        .with_context(|| "Failed to read excelcsvs directory")?;
    
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if let Some(extension) = path.extension() {
            if extension.to_string_lossy().to_lowercase() == "csv" {
                if let Some(filename) = path.file_name() {
                    csv_files.push(filename.to_string_lossy().to_string());
                }
            }
        }
    }
    
    if csv_files.is_empty() {
        return Err(anyhow::anyhow!("No CSV files found in 'excelcsvs' directory. Please add CSV files first."));
    }
    
    csv_files.sort();
    Ok(csv_files)
}

// Function to select CSV file interactively
pub fn select_csv_file() -> Result<String> {
    println!("\n📄 Available CSV Files in 'excelcsvs' directory:");
    let csv_files = list_csv_files()?;
    
    for (i, file) in csv_files.iter().enumerate() {
        println!("  {}. {}", i + 1, file);
    }
    
    loop {
        let input = get_user_input("\nSelect CSV file (enter number or filename): ");
        
        // Try to parse as number first
        if let Ok(num) = input.parse::<usize>() {
            if num > 0 && num <= csv_files.len() {
                let selected_file = &csv_files[num - 1];
                let full_path = format!("excelcsvs/{}", selected_file);
                println!("✅ Selected: {}", selected_file);
                return Ok(full_path);
            }
        }
        
        // Try to find by filename (case insensitive)
        for file in &csv_files {
            if file.to_lowercase() == input.to_lowercase() {
                let full_path = format!("excelcsvs/{}", file);
                println!("✅ Selected: {}", file);
                return Ok(full_path);
            }
        }
        
        println!("❌ Invalid selection. Please try again.");
    }
}

// Function to list PNG files in Template directory
fn list_template_files() -> Result<Vec<String>> {
    let template_dir = "Template";
    let mut template_files = Vec::new();
    
    if !Path::new(template_dir).exists() {
        return Err(anyhow::anyhow!("Directory 'Template' not found. Please create it and add PNG template files."));
    }
    
    let entries = std::fs::read_dir(template_dir)
        .with_context(|| "Failed to read Template directory")?;
    
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if let Some(extension) = path.extension() {
            let ext = extension.to_string_lossy().to_lowercase();
            if ext == "png" || ext == "jpg" || ext == "jpeg" {
                if let Some(filename) = path.file_name() {
                    template_files.push(filename.to_string_lossy().to_string());
                }
            }
        }
    }
    
    if template_files.is_empty() {
        return Err(anyhow::anyhow!("No PNG/JPG template files found in 'Template' directory. Please add template files first."));
    }
    
    template_files.sort();
    Ok(template_files)
}

// Function to select template file interactively
pub fn select_template_file() -> Result<String> {
    println!("\n🖼️ Available Template Files in 'Template' directory:");
    let template_files = list_template_files()?;
    
    for (i, file) in template_files.iter().enumerate() {
        println!("  {}. {}", i + 1, file);
    }
    
    loop {
        let input = get_user_input("\nSelect template file (enter number or filename): ");
        
        // Try to parse as number first
        if let Ok(num) = input.parse::<usize>() {
            if num > 0 && num <= template_files.len() {
                let selected_file = &template_files[num - 1];
                let full_path = format!("Template/{}", selected_file);
                println!("✅ Selected template: {}", selected_file);
                return Ok(full_path);
            }
        }
        
        // Try to find by filename (case insensitive)
        for file in &template_files {
            if file.to_lowercase() == input.to_lowercase() {
                let full_path = format!("Template/{}", file);
                println!("✅ Selected template: {}", file);
                return Ok(full_path);
            }
        }
        
        println!("❌ Invalid selection. Please try again.");
    }
}

// Function to debug template file
pub fn debug_template_file(file_path: &str) -> Result<()> {
    println!("\n🔍 === Template File Debug Info ===");
    
    let path = Path::new(file_path);
    
    if !path.exists() {
        return Err(anyhow::anyhow!("Template file not found: {}", file_path));
    }
    
    // Get file size
    let metadata = std::fs::metadata(path)?;
    println!("📄 File size: {} bytes ({:.2} KB)", metadata.len(), metadata.len() as f64 / 1024.0);
    
    // Try to analyze with our existing PNG analysis
    match analyze_png_file(file_path) {
        Ok(analysis) => {
            println!("✅ Template analysis:");
            println!("  📐 Dimensions: {}x{} pixels", analysis.width, analysis.height);
            println!("  🎨 Color type: {:?}", analysis.color_type);
            println!("  📊 Suggested center coordinates: ({}, {})", 
                    analysis.width / 2, analysis.height / 2);
        }
        Err(e) => {
            println!("❌ Failed to analyze template: {}", e);
        }
    }
    
    Ok(())
}

// Function to list font files in assets directory
fn list_font_files() -> Result<Vec<String>, String> {
    let assets_dir = "assets";
    let mut font_files = Vec::new();
    
    if !Path::new(assets_dir).exists() {
        return Err("Directory 'assets' not found. Please create it and add font files.".to_string());
    }
    
    let entries = std::fs::read_dir(assets_dir)
        .map_err(|_| "Failed to read assets directory".to_string())?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if let Some(extension) = path.extension() {
                let ext = extension.to_string_lossy().to_lowercase();
                if ext == "ttf" || ext == "otf" || ext == "woff" || ext == "woff2" {
                    if let Some(filename) = path.file_name() {
                        font_files.push(filename.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    if font_files.is_empty() {
        return Err("No font files found in 'assets' directory. Please add .ttf, .otf, .woff, or .woff2 files.".to_string());
    }
    
    font_files.sort();
    Ok(font_files)
}

// Function to select font file interactively
pub fn select_font_file() -> Result<String, String> {
    println!("\n🔤 Available Font Files in 'assets' directory:");
    let font_files = list_font_files()?;
    
    for (i, file) in font_files.iter().enumerate() {
        println!("  {}. {}", i + 1, file);
    }
    
    loop {
        let input = get_user_input("\nSelect font file (enter number or filename): ");
        
        // Try to parse as number first
        if let Ok(num) = input.parse::<usize>() {
            if num > 0 && num <= font_files.len() {
                let selected_file = &font_files[num - 1];
                println!("✅ Selected font: {}", selected_file);
                return Ok(selected_file.clone());
            }
        }
        
        // Try to find by filename (case insensitive)
        for file in &font_files {
            if file.to_lowercase() == input.to_lowercase() {
                println!("✅ Selected font: {}", file);
                return Ok(file.clone());
            }
        }
        
        println!("❌ Invalid selection. Please try again.");
    }
}

// Helper function to calculate text size
fn calculate_text_size(font: &Font, scale: Scale, text: &str) -> (i32, i32) {
    let v_metrics = font.v_metrics(scale);
    let glyphs: Vec<_> = font.layout(text, scale, point(0.0, 0.0 + v_metrics.ascent)).collect();

    if glyphs.is_empty() {
        return (0, 0);
    }

    let min_x = glyphs
        .iter()
        .filter_map(|g| g.pixel_bounding_box().map(|b| b.min.x))
        .min()
        .unwrap_or(0);
    
    let max_x = glyphs
        .iter()
        .filter_map(|g| g.pixel_bounding_box().map(|b| b.max.x))
        .max()
        .unwrap_or(0);

    let width = max_x - min_x;
    let height = (v_metrics.ascent - v_metrics.descent).ceil() as i32;

    (width, height)
}

// Helper function to load font data
fn load_font_data(font_filename: &str) -> Result<Vec<u8>> {
    let font_path = format!("assets/{}", font_filename);
    std::fs::read(&font_path)
        .with_context(|| format!("Failed to read font file: {}", font_path))
}

pub fn generate_certificates_batch(
    template_path: &str,
    output_dir: &str,
    names: &[String],
    x_pos: i32,
    y_pos: i32,
    font_filename: &str,
    font_size: f32,
    hex_color: &str,
) -> Result<()> {
    std::fs::create_dir_all(output_dir)
        .with_context(|| format!("Failed to create output directory: {}", output_dir))?;
    
    // Load font once for text size calculations
    let font_data = load_font_data(font_filename)?;
    let font = Font::try_from_bytes(&font_data)
        .ok_or_else(|| anyhow::anyhow!("Failed to load font: {}", font_filename))?;
    
    let scale = Scale::uniform(font_size);
    let total = names.len();
    let completed = Arc::new(AtomicUsize::new(0));
    
    println!("\n🎓 Generating {} certificates in parallel using {} cores...", 
             total, 
             rayon::current_num_threads());
    println!("🎯 Text will be centered around coordinates ({}, {})", x_pos, y_pos);
    
    let results: Vec<Result<(), anyhow::Error>> = names
        .par_iter()
        .map(|name| {
            let completed_clone = Arc::clone(&completed);
            
            let output_filename = format!("{}/certificate_{}.png", output_dir, 
                                        name.replace(" ", "_").replace("/", "_").replace("\\", "_"));
            
            // Calculate text size for centering
            let (text_width, text_height) = calculate_text_size(&font, scale, name);
            
            // Calculate centered position
            let centered_x = x_pos - text_width / 2;
            let centered_y = y_pos - text_height / 2;
            
            let result = add_text_with_custom_options(
                template_path,
                &output_filename,
                name,
                centered_x,  // Use centered coordinates
                centered_y,  // Use centered coordinates
                font_filename,
                font_size,
                hex_color,
            );
            
            let current_completed = completed_clone.fetch_add(1, Ordering::Relaxed) + 1;
            let progress = (current_completed as f64 / total as f64) * 100.0;
            
            match result {
                Ok(()) => {
                    println!("✅ [{:6.2}%] Generated: {} (centered at {}, {})", 
                            progress, name, centered_x, centered_y);
                    Ok(())
                }
                Err(e) => {
                    println!("❌ [{:6.2}%] Failed: {} - {}", progress, name, e);
                    Err(e)
                }
            }
        })
        .collect();
    
    // Summary
    let success_count = results.iter().filter(|r| r.is_ok()).count();
    let error_count = results.len() - success_count;
    
    println!("\n🎉 Parallel certificate generation complete!");
    println!("⚡ Used {} CPU cores", rayon::current_num_threads());
    println!("🎯 All text was centered around ({}, {})", x_pos, y_pos);
    println!("✅ Successfully generated: {} certificates", success_count);
    if error_count > 0 {
        println!("❌ Failed to generate: {} certificates", error_count);
    }
    println!("📁 Certificates saved in: {}", output_dir);
    
    Ok(())
}


// Interactive certificate generation with template and font selection
pub fn generate_certificates_interactive() -> Result<()> {
    println!("🎓 === Certificate Generator (CSV Files Only) ===");
    
    // Automatically look in excelcsvs directory and let user select
    let input_file = match select_csv_file() {
        Ok(file) => file,
        Err(e) => {
            println!("❌ {}", e);
            println!("\n💡 Tips:");
            println!("  • Create an 'excelcsvs' directory in your project root");
            println!("  • Add CSV files with a 'Name' column");
            println!("  • Example CSV format:");
            println!("    Name");
            println!("    Alice Johnson");
            println!("    Bob Smith");
            return Err(e);
        }
    };
    
    // Parse names
    println!("\n📄 Parsing names from CSV file...");
    let names = parse_names_from_file(&input_file)?;
    
    println!("✅ Found {} names:", names.len());
    for (i, name) in names.iter().enumerate() {
        println!("  {}. {}", i + 1, name);
    }
    
    // Automatically look in Template directory and let user select
    let template_file = match select_template_file() {
        Ok(file) => file,
        Err(e) => {
            println!("❌ {}", e);
            println!("\n💡 Tips:");
            println!("  • Create a 'Template' directory in your project root");
            println!("  • Add PNG/JPG template files for certificates");
            println!("  • Supported formats: .png, .jpg, .jpeg");
            return Err(e);
        }
    };
    
    // Analyze template
    println!("\n📊 Analyzing template...");
    if let Ok(analysis) = analyze_png_file(&template_file) {
        println!("Template dimensions: {}x{} pixels", analysis.width, analysis.height);
        println!("Suggested coordinates for centering: ({}, {})", 
                analysis.width / 2, analysis.height / 2);
    }
    
    // Get positioning
    let x_input = get_user_input("\nEnter X position for name (or press Enter for center): ");
    let y_input = get_user_input("Enter Y position for name (or press Enter for center): ");
    
    // Default to center if no input
    let (default_x, default_y) = if let Ok(analysis) = analyze_png_file(&template_file) {
        (analysis.width as i32 / 2, analysis.height as i32 / 2)
    } else {
        (400, 300)
    };
    
    let x_pos = if x_input.is_empty() { default_x } else { x_input.parse().unwrap_or(default_x) };
    let y_pos = if y_input.is_empty() { default_y } else { y_input.parse().unwrap_or(default_y) };
    
    // Font selection from assets directory
    let font_input = match select_font_file() {
        Ok(font) => font,
        Err(e) => {
            println!("❌ {}", e);
            println!("\n💡 Tips:");
            println!("  • Create an 'assets' directory in your project root");
            println!("  • Add font files (.ttf, .otf, .woff, .woff2)");
            println!("  • You can download fonts from Google Fonts");
            
            // Fallback to manual input
            let manual_font = get_user_input("\nOr enter font filename manually (e.g., DejaVuSans.ttf): ");
            if manual_font.is_empty() {
                return Err(anyhow::anyhow!("No font selected"));
            }
            manual_font
        }
    };
    
    let font_size_input = get_user_input("Enter font size (default 40): ");
    let font_size = if font_size_input.is_empty() { 40.0 } else { font_size_input.parse().unwrap_or(40.0) };
    
    let color_input = get_user_input("Enter text color (only hex like #000000 : ");
    let hex_color = if color_input.is_empty() { "#000000".to_string() } else { color_input };
    
    // Get output directory
    let output_dir = get_user_input("\nEnter output directory (default 'certificates'): ");
    let output_dir = if output_dir.is_empty() { "certificates" } else { &output_dir };
    
    // Generate certificates
    generate_certificates_batch(
        &template_file,
        output_dir,
        &names,
        x_pos,
        y_pos,
        &font_input,
        font_size,
        &hex_color,
    )?;
    
    Ok(())
}

// Function to create sample CSV files for testing
pub fn create_sample_csv(filename: &str) -> Result<()> {
    // Create parent directory if it doesn't exist
    if let Some(parent) = Path::new(filename).parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }
    
    let csv_content = "Name\nAlice Johnson\nBob Smith\nCharlie Brown\nDiana Prince\nEva Martinez";
    
    std::fs::write(filename, csv_content)
        .with_context(|| format!("Failed to create sample CSV: {}", filename))?;
    
    println!("✅ Sample CSV created: {}", filename);
    Ok(())
}
