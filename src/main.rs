// src/main.rs
use anyhow::Result;
use std::io::{self, Write};

// Declare modules
mod analysis;
mod editpng;

// Import functions
use analysis::{analyze_png_file, print_analysis};
use editpng::add_text_to_png_interactive; // Changed from add_text_to_png

fn get_user_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

fn main() -> Result<()> {
    let input_file = "Template/Example.png";
    let output_file = "Template/Example_with_text.png";
    
    // Analyze original image
    println!("=== Original Image Analysis ===");
    if let Ok(analysis) = analyze_png_file(input_file) {
        print_analysis(&analysis);
    }

    println!("\n{}", "=".repeat(50));
    
    // Get user inputs
    let text = get_user_input("Enter text to add: ");
    if text.is_empty() {
        println!("No text entered. Exiting...");
        return Ok(());
    }

    let x_input = get_user_input("Enter X position Width starts from top left (or press Enter for default 50):  ");
    let x_pos = if x_input.is_empty() { 50 } else { x_input.parse().unwrap_or(50) };
    
    let y_input = get_user_input("Enter Y position Height starts from top left(or press Enter for default 50): ");
    let y_pos = if y_input.is_empty() { 50 } else { y_input.parse().unwrap_or(50) };

    println!("\n📝 Now you'll select font, font size, and color interactively...");

    // Add text with interactive font and color selection
    match add_text_to_png_interactive( // Changed function call
        input_file,
        output_file,
        &text,
        x_pos,
        y_pos,
        // Removed hardcoded font size and color - now handled interactively
    ) {
        Ok(()) => {
            println!("✅ Text successfully added!");
            
            // Analyze modified image
            println!("\n=== Modified Image Analysis ===");
            if let Ok(analysis) = analyze_png_file(output_file) {
                print_analysis(&analysis);
            }
        }
        Err(e) => eprintln!("❌ Error: {}", e),
    }

    Ok(())
}
