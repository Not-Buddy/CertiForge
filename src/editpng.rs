// src/editpng.rs
use anyhow::{Context, Result};
use image::{Rgba, open, ImageFormat};
use imageproc::drawing::draw_text_mut;
use rusttype::{Font, Scale};
use std::fs;
use std::io::{self, Write};
use std::path::Path;

// Function to list all font files in assets directory
pub fn list_available_fonts() -> Result<Vec<String>> {
    let assets_dir = "assets";
    let mut font_files = Vec::new();
    
    if Path::new(assets_dir).exists() {
        let entries = fs::read_dir(assets_dir)
            .with_context(|| "Failed to read assets directory")?;
        
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            if let Some(extension) = path.extension() {
                let ext = extension.to_string_lossy().to_lowercase();
                if ext == "ttf" || ext == "otf" {
                    if let Some(filename) = path.file_name() {
                        font_files.push(filename.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    if font_files.is_empty() {
        return Err(anyhow::anyhow!("No font files found in assets directory"));
    }
    
    font_files.sort();
    Ok(font_files)
}

// Function to load font data from filename
fn load_font_data(font_filename: &str) -> Result<Vec<u8>> {
    let font_path = format!("assets/{}", font_filename);
    fs::read(&font_path)
        .with_context(|| format!("Failed to read font file: {}", font_path))
}

// Function to convert hex color to RGBA
pub fn hex_to_rgba(hex: &str) -> Result<Rgba<u8>> {
    let hex = hex.trim_start_matches('#');
    
    if hex.len() != 6 && hex.len() != 8 {
        return Err(anyhow::anyhow!("Invalid hex color format. Use #RRGGBB or #RRGGBBAA"));
    }
    
    let r = u8::from_str_radix(&hex[0..2], 16)
        .with_context(|| "Invalid red component in hex color")?;
    let g = u8::from_str_radix(&hex[2..4], 16)
        .with_context(|| "Invalid green component in hex color")?;
    let b = u8::from_str_radix(&hex[4..6], 16)
        .with_context(|| "Invalid blue component in hex color")?;
    
    let a = if hex.len() == 8 {
        u8::from_str_radix(&hex[6..8], 16)
            .with_context(|| "Invalid alpha component in hex color")?
    } else {
        255 // Default to full opacity
    };
    
    Ok(Rgba([r, g, b, a]))
}

// Function to get user input
fn get_user_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

// Function to select font interactively
pub fn select_font() -> Result<String> {
    println!("\n🔤 Available Fonts:");
    let fonts = list_available_fonts()?;
    
    for (i, font) in fonts.iter().enumerate() {
        println!("  {}. {}", i + 1, font);
    }
    
    loop {
        let input = get_user_input("\nEnter font name or number: ");
        
        // Try to parse as number first
        if let Ok(num) = input.parse::<usize>() {
            if num > 0 && num <= fonts.len() {
                return Ok(fonts[num - 1].clone());
            }
        }
        
        // Try to find by name (case insensitive)
        for font in &fonts {
            if font.to_lowercase() == input.to_lowercase() {
                return Ok(font.clone());
            }
        }
        
        println!("❌ Invalid selection. Please try again.");
    }
}

// Function to get color from user
pub fn get_color_from_user() -> Result<Rgba<u8>> {
    println!("\n🎨 Color Options:");
    println!("  • Enter hex color code only (e.g., #FF0000 for red, #00FF00 for green)");
    
    loop {
        let input = get_user_input("Enter color: ");
        
        // Check for common color names
        let color = match input.to_lowercase().as_str() {
            "white" => Rgba([255, 255, 255, 255]),
            "black" => Rgba([0, 0, 0, 255]),
            "red" => Rgba([255, 0, 0, 255]),
            "green" => Rgba([0, 255, 0, 255]),
            "blue" => Rgba([0, 0, 255, 255]),
            "yellow" => Rgba([255, 255, 0, 255]),
            "orange" => Rgba([255, 165, 0, 255]),
            "purple" => Rgba([128, 0, 128, 255]),
            _ => {
                // Try to parse as hex
                match hex_to_rgba(&input) {
                    Ok(color) => color,
                    Err(_) => {
                        println!("❌ Invalid color. Try a hex code like #FF0000 or a color name like 'red'");
                        continue;
                    }
                }
            }
        };
        
        return Ok(color);
    }
}

pub fn add_text_to_png_interactive(
    input_path: &str,
    output_path: &str,
    text: &str,
    x: i32,
    y: i32,
) -> Result<()> {
    let mut img = open(input_path)
        .with_context(|| format!("Failed to open image: {}", input_path))?
        .to_rgba8();

    // Select font
    let font_filename = select_font()?;
    let font_data = load_font_data(&font_filename)?;
    let font = Font::try_from_bytes(&font_data)
        .ok_or_else(|| anyhow::anyhow!("Failed to load font: {}", font_filename))?;

    // Get font size
    let font_size_input = get_user_input("Enter font size (default 40): ");
    let font_size = if font_size_input.is_empty() {
        40.0
    } else {
        font_size_input.parse().unwrap_or(40.0)
    };

    // Get color
    let color = get_color_from_user()?;

    let scale = Scale::uniform(font_size);
    draw_text_mut(&mut img, color, x, y, scale, &font, text);

    img.save_with_format(output_path, ImageFormat::Png)
        .with_context(|| format!("Failed to save image: {}", output_path))?;

    println!("✅ Text added successfully with font '{}' and size {}!", font_filename, font_size);
    println!("📁 Saved to: {}", output_path);
    Ok(())
}

pub fn add_text_with_custom_options(
    input_path: &str,
    output_path: &str,
    text: &str,
    x: i32,
    y: i32,
    font_filename: &str,
    font_size: f32,
    hex_color: &str,
) -> Result<()> {
    let mut img = open(input_path)
        .with_context(|| format!("Failed to open image: {}", input_path))?
        .to_rgba8();

    // Load selected font
    let font_data = load_font_data(font_filename)?;
    let font = Font::try_from_bytes(&font_data)
        .ok_or_else(|| anyhow::anyhow!("Failed to load font: {}", font_filename))?;

    // Convert hex color to RGBA
    let text_color = hex_to_rgba(hex_color)?;

    let scale = Scale::uniform(font_size);
    draw_text_mut(&mut img, text_color, x, y, scale, &font, text);

    img.save_with_format(output_path, ImageFormat::Png)
        .with_context(|| format!("Failed to save image: {}", output_path))?;

    println!("✅ Custom text added successfully!");
    println!("📁 Saved to: {}", output_path);
    Ok(())
}

// Legacy function for backward compatibility
pub fn add_text_to_png(
    input_path: &str,
    output_path: &str,
    text: &str,
    x: i32,
    y: i32,
) -> Result<()> {
    add_text_to_png_interactive(input_path, output_path, text, x, y)
}
