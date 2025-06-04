// src/main.rs
use anyhow::Result;
use std::io::{self, Write};
use std::path::Path;

// Declare modules
mod analysis;
mod editpng;
mod csvexcelparser;

// Import functions
use analysis::{analyze_png_file, print_analysis};
use editpng::add_text_to_png_interactive;
use csvexcelparser::{generate_certificates_interactive, create_sample_csv, select_csv_file, debug_csv_file};

fn get_user_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

// Helper function for better path handling
fn get_file_path(prompt: &str, must_exist: bool) -> String {
    loop {
        let input = get_user_input(prompt);
        
        if input.is_empty() {
            println!("❌ Please enter a file path.");
            continue;
        }
        
        // Convert to raw string-like format for Windows paths
        let path_str = if input.contains('\\') && !input.starts_with("r\"") {
            println!("💡 Tip: For Windows paths, use raw strings like r\"{}\"", input);
            input
        } else {
            input
        };
        
        let path = Path::new(&path_str);
        
        if must_exist {
            if path.exists() {
                println!("✅ File found: {}", path.display());
                return path_str;
            } else {
                println!("❌ File not found: {}", path.display());
                
                // Show current directory and nearby files
                if let Ok(current_dir) = std::env::current_dir() {
                    println!("📁 Current working directory: {}", current_dir.display());
                }
                
                if let Some(parent) = path.parent() {
                    if parent.exists() {
                        println!("📁 Directory exists, but file not found. Files in directory:");
                        if let Ok(entries) = std::fs::read_dir(parent) {
                            for entry in entries.take(10) { // Show max 10 files
                                if let Ok(entry) = entry {
                                    println!("  - {}", entry.file_name().to_string_lossy());
                                }
                            }
                        }
                    } else {
                        println!("📁 Directory doesn't exist: {}", parent.display());
                    }
                }
                
                let retry = get_user_input("Try again? (y/n): ");
                if retry.to_lowercase() != "y" {
                    return String::new(); // Return empty string to cancel
                }
            }
        } else {
            // For output files, just return the path
            return path_str;
        }
    }
}

// Helper function to show path tips
fn show_path_tips() {
    println!("\n💡 Path Tips:");
    println!("  • Windows: Use raw strings like r\"C:\\path\\to\\file.csv\"");
    println!("  • Or use forward slashes: \"C:/path/to/file.csv\"");
    println!("  • Relative paths: \"folder/file.csv\" (from project directory)");
    println!("  • Current directory files: just \"filename.csv\"");
}

fn show_menu() {
    println!("\n🎯 === Certificate Maker ===");
    println!("1. Add text to single image (interactive)");
    println!("2. Generate certificates from CSV files in 'excelcsvs' directory");
    println!("3. Analyze PNG file");
    println!("4. Create sample CSV file");
    println!("5. Debug CSV file");
    println!("6. Show path tips");
    println!("7. Exit");
}

fn main() -> Result<()> {
    // Show current working directory at startup
    if let Ok(current_dir) = std::env::current_dir() {
        println!("📁 Starting in directory: {}", current_dir.display());
    }
    
    loop {
        show_menu();
        let choice = get_user_input("\nSelect an option (1-7): "); // Fixed: Now shows 1-7
        
        match choice.as_str() {
            "1" => {
                // Single image text addition
                println!("\n📝 Single Image Text Addition");
                
                let input_file = get_file_path("Enter input PNG file path: ", true);
                if input_file.is_empty() {
                    println!("❌ Operation cancelled.");
                    continue;
                }
                
                let output_file = get_file_path("Enter output PNG file path: ", false);
                if output_file.is_empty() {
                    println!("❌ Operation cancelled.");
                    continue;
                }
                
                let text = get_user_input("Enter text to add: ");
                if text.is_empty() {
                    println!("No text entered. Returning to menu...");
                    continue;
                }
                
                let x_input = get_user_input("Enter X position (or press Enter for default 50): ");
                let x_pos = if x_input.is_empty() { 50 } else { x_input.parse().unwrap_or(50) };
                
                let y_input = get_user_input("Enter Y position (or press Enter for default 50): ");
                let y_pos = if y_input.is_empty() { 50 } else { y_input.parse().unwrap_or(50) };
                
                match add_text_to_png_interactive(&input_file, &output_file, &text, x_pos, y_pos) {
                    Ok(()) => println!("✅ Text added successfully!"),
                    Err(e) => {
                        println!("❌ Error: {}", e);
                        show_path_tips();
                    }
                }
            }
            
            "2" => {
                // Batch certificate generation
                println!("\n🎓 Certificate Generator");
                match generate_certificates_interactive() {
                    Ok(()) => println!("🎉 Batch certificate generation completed!"),
                    Err(e) => {
                        println!("❌ Error: {}", e);
                        show_path_tips();
                    }
                }
            }
            
            "3" => {
                // Analyze PNG file
                println!("\n📊 PNG File Analysis");
                
                let file_path = get_file_path("Enter PNG file path to analyze: ", true);
                if file_path.is_empty() {
                    println!("❌ Operation cancelled.");
                    continue;
                }
                
                match analyze_png_file(&file_path) {
                    Ok(analysis) => print_analysis(&analysis),
                    Err(e) => {
                        println!("❌ Error analyzing file: {}", e);
                        show_path_tips();
                    }
                }
            }
            
            "4" => {
                // Create sample CSV
                println!("\n📄 Create Sample CSV");
                
                let filename = get_user_input("Enter filename for sample CSV (default 'sample_names.csv'): ");
                let filename = if filename.is_empty() { "sample_names.csv" } else { &filename };
                
                match create_sample_csv(filename) {
                    Ok(()) => {
                        println!("✅ Sample CSV created successfully!");
                        if let Ok(current_dir) = std::env::current_dir() {
                            println!("📁 Full path: {}", current_dir.join(filename).display());
                        }
                    }
                    Err(e) => println!("❌ Error creating sample CSV: {}", e),
                }
            }
            
            "5" => {
                // Debug CSV file
                println!("\n🔍 CSV File Debugger");
                
                let csv_file = match select_csv_file() {
                    Ok(file) => file,
                    Err(e) => {
                        println!("❌ {}", e);
                        continue;
                    }
                };
                
                match debug_csv_file(&csv_file) { // Fixed: Removed csvexcelparser:: prefix
                    Ok(()) => println!("✅ CSV debug complete"),
                    Err(e) => println!("❌ Debug error: {}", e),
                }
            }
            
            "6" => {
                // Show path tips
                show_path_tips();
            }
            
            "7" => {
                // Exit
                println!("👋 Goodbye!");
                break;
            }
            
            _ => {
                println!("❌ Invalid option. Please select 1-7."); // Fixed: Now shows 1-7
            }
        }
        
        println!("\nPress Enter to continue...");
        let _ = get_user_input("");
    }
    
    Ok(())
}
    