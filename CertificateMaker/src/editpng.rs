// src/editpng.rs
use anyhow::{Context, Result};
use image::{Rgba, open, ImageFormat};
use imageproc::drawing::draw_text_mut;
use rusttype::{Font, Scale};

// Define font data as a constant
const FONT_DATA: &[u8] = include_bytes!("../assets/DejaVuSans.ttf");

pub fn add_text_to_png(
    input_path: &str,
    output_path: &str,
    text: &str,
    x: i32,
    y: i32,
) -> Result<()> {
    let mut img = open(input_path)
        .with_context(|| format!("Failed to open image: {}", input_path))?
        .to_rgba8();

    let font = Font::try_from_bytes(FONT_DATA)
        .ok_or_else(|| anyhow::anyhow!("Failed to load font"))?;

    let scale = Scale::uniform(40.0);
    let color = Rgba([255u8, 255u8, 255u8, 255u8]);

    draw_text_mut(&mut img, color, x, y, scale, &font, text);

    img.save_with_format(output_path, ImageFormat::Png)
        .with_context(|| format!("Failed to save image: {}", output_path))?;

    println!("Text added successfully! Saved to: {}", output_path);
    Ok(())
}

pub fn add_text_with_custom_options(
    input_path: &str,
    output_path: &str,
    text: &str,
    x: i32,
    y: i32,
    font_size: f32,
    color: (u8, u8, u8, u8),
) -> Result<()> {
    let mut img = open(input_path)
        .with_context(|| format!("Failed to open image: {}", input_path))?
        .to_rgba8();

    let font = Font::try_from_bytes(FONT_DATA)
        .ok_or_else(|| anyhow::anyhow!("Failed to load font"))?;

    let scale = Scale::uniform(font_size);
    let text_color = Rgba([color.0, color.1, color.2, color.3]);

    draw_text_mut(&mut img, text_color, x, y, scale, &font, text);

    img.save_with_format(output_path, ImageFormat::Png)
        .with_context(|| format!("Failed to save image: {}", output_path))?;

    println!("Custom text added successfully! Saved to: {}", output_path);
    Ok(())
}
