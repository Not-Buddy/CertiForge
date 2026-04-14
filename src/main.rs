// src/main.rs
use anyhow::Result;
use std::collections::HashMap;
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};

// Declare modules
mod analysis;
mod api;
mod csvexcelparser;
mod editpng;

// Import functions
use analysis::{analyze_png_file, print_analysis};
use csvexcelparser::{
    create_sample_csv, debug_csv_file, debug_template_file, generate_certificates_interactive,
    select_csv_file, select_template_file,
};
use editpng::add_text_to_png_interactive;

fn get_user_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();

    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

// Function to list image files in a specific directory
fn list_image_files_in_dir(dir_path: &str) -> Result<Vec<String>, String> {
    let mut image_files = Vec::new();

    if !Path::new(dir_path).exists() {
        return Err(format!("Directory '{}' not found", dir_path));
    }

    let entries = std::fs::read_dir(dir_path)
        .map_err(|_| format!("Failed to read directory '{}'", dir_path))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(extension) = path.extension() {
            let ext = extension.to_string_lossy().to_lowercase();
            if (ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "bmp" || ext == "gif")
                && let Some(filename) = path.file_name()
            {
                image_files.push(filename.to_string_lossy().to_string());
            }
        }
    }

    if image_files.is_empty() {
        return Err(format!("No image files found in directory '{}'", dir_path));
    }

    image_files.sort();
    Ok(image_files)
}

// Function to select input image file
fn select_input_image() -> Result<String, String> {
    let base_path = "Template".to_string();
    let image_files = list_image_files_in_dir(&base_path)?;

    println!("\n🖼️ Available Image Files in 'Template' directory:");
    for (i, file) in image_files.iter().enumerate() {
        println!("  {}. {}", i + 1, file);
    }

    loop {
        let input = get_user_input("\nSelect image file (enter number or filename): ");

        if let Ok(num) = input.parse::<usize>()
            && num > 0
            && num <= image_files.len()
        {
            let selected_file = &image_files[num - 1];
            let full_path = format!("{}/{}", base_path, selected_file);
            println!("✅ Selected: {}", selected_file);
            return Ok(full_path);
        }

        for file in &image_files {
            if file.to_lowercase() == input.to_lowercase() {
                let full_path = format!("{}/{}", base_path, file);
                println!("✅ Selected: {}", file);
                return Ok(full_path);
            }
        }

        println!("❌ Invalid selection. Please try again.");
    }
}

// Function to select output file path
fn select_output_path(default_name: Option<&str>) -> String {
    println!("\n📁 Output File Options:");
    println!("1. Save in current directory");
    println!("2. Save in 'output' directory");
    println!("3. Custom path");

    let choice = get_user_input("Select option (1-3): ");
    let default_filename = default_name.unwrap_or("output.png");

    match choice.as_str() {
        "1" => {
            let filename = get_user_input(&format!(
                "Enter filename (default '{}'): ",
                default_filename
            ));
            if filename.is_empty() {
                default_filename.to_string()
            } else {
                filename
            }
        }
        "2" => {
            let _ = std::fs::create_dir_all("output");
            let filename = get_user_input(&format!(
                "Enter filename (default '{}'): ",
                default_filename
            ));
            let filename = if filename.is_empty() {
                default_filename
            } else {
                &filename
            };
            format!("output/{}", filename)
        }
        "3" => get_user_input("Enter full output path: "),
        _ => {
            println!("Invalid option, using default");
            default_filename.to_string()
        }
    }
}

fn show_path_tips() {
    println!("\n💡 File Organization Tips:");
    println!("  • Put input images in current directory or Template/ folder");
    println!("  • Output files will be saved in current directory or output/ folder");
    println!("  • CSV files should be in excelcsvs/ directory");
    println!("  • Template files should be in Template/ directory");
    println!("  • Font files should be in assets/ directory");
}

fn show_menu() {
    println!("\n🎯 === Certificate Maker ===");
    println!("1. Add text to single image (interactive)");
    println!("2. Generate certificates from CSV files in 'excelcsvs' directory");
    println!("3. Analyze PNG file");
    println!("4. Create sample CSV file");
    println!("5. Debug CSV file");
    println!("6. Debug template file");
    println!("7. Show file organization tips");
    println!("8. Exit");
}

fn run_cli() -> Result<()> {
    if let Ok(current_dir) = std::env::current_dir() {
        println!("📁 Starting in directory: {}", current_dir.display());
    }

    loop {
        show_menu();
        let choice = get_user_input("\nSelect an option (1-8): ");

        match choice.as_str() {
            "1" => {
                println!("\n📝 Single Image Text Addition");

                let input_file = match select_input_image() {
                    Ok(file) => file,
                    Err(e) => {
                        println!("❌ {}", e);
                        continue;
                    }
                };

                if !Path::new(&input_file).exists() {
                    println!("❌ Selected file not found: {}", input_file);
                    continue;
                }

                let input_stem = Path::new(&input_file)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("output");
                let default_output = format!("{}_with_text.png", input_stem);
                let output_file = select_output_path(Some(&default_output));

                let text = get_user_input("Enter text to add: ");
                if text.is_empty() {
                    println!("No text entered. Returning to menu...");
                    continue;
                }

                println!("\n📊 PNG File Analysis");
                let file_path = match select_input_image() {
                    Ok(file) => file,
                    Err(e) => {
                        println!("❌ {}", e);
                        continue;
                    }
                };

                if !Path::new(&file_path).exists() {
                    println!("❌ Selected file not found: {}", file_path);
                    continue;
                }

                match analyze_png_file(&file_path) {
                    Ok(analysis) => print_analysis(&analysis),
                    Err(e) => {
                        println!("❌ Error analyzing file: {}", e);
                        show_path_tips();
                    }
                }

                let x_input = get_user_input("Enter X position (or press Enter for default 50): ");
                let x_pos = if x_input.is_empty() {
                    50
                } else {
                    x_input.parse().unwrap_or(50)
                };

                let y_input = get_user_input("Enter Y position (or press Enter for default 50): ");
                let y_pos = if y_input.is_empty() {
                    50
                } else {
                    y_input.parse().unwrap_or(50)
                };

                match add_text_to_png_interactive(&input_file, &output_file, &text, x_pos, y_pos) {
                    Ok(()) => {
                        println!("✅ Text added successfully!");
                        println!("📁 Output saved to: {}", output_file);
                    }
                    Err(e) => {
                        println!("❌ Error: {}", e);
                        show_path_tips();
                    }
                }
            }

            "2" => {
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
                println!("\n📊 PNG File Analysis");
                let file_path = match select_input_image() {
                    Ok(file) => file,
                    Err(e) => {
                        println!("❌ {}", e);
                        continue;
                    }
                };

                if !Path::new(&file_path).exists() {
                    println!("❌ Selected file not found: {}", file_path);
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
                println!("\n📄 Create Sample CSV");
                let filename = get_user_input(
                    "Enter filename for sample CSV (default 'excelcsvs/sample_names.csv'): ",
                );
                let filename = if filename.is_empty() {
                    "excelcsvs/sample_names.csv"
                } else {
                    &filename
                };

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
                println!("\n🔍 CSV File Debugger");
                let csv_file = match select_csv_file() {
                    Ok(file) => file,
                    Err(e) => {
                        println!("❌ {}", e);
                        continue;
                    }
                };
                match debug_csv_file(&csv_file) {
                    Ok(()) => println!("✅ CSV debug complete"),
                    Err(e) => println!("❌ Debug error: {}", e),
                }
            }

            "6" => {
                println!("\n🔍 Template File Debugger");
                let template_file = match select_template_file() {
                    Ok(file) => file,
                    Err(e) => {
                        println!("❌ {}", e);
                        continue;
                    }
                };
                match debug_template_file(&template_file) {
                    Ok(()) => println!("✅ Template debug complete"),
                    Err(e) => println!("❌ Debug error: {}", e),
                }
            }

            "7" => {
                show_path_tips();
            }

            "8" => {
                println!("👋 Goodbye!");
                break;
            }

            _ => {
                println!("❌ Invalid option. Please select 1-8.");
            }
        }

        println!("\nPress Enter to continue...");
        let _ = get_user_input("");
    }

    Ok(())
}

// ---------------------------------------------------------------------------
//  HTTP API Server (default mode)
// ---------------------------------------------------------------------------

async fn run_server() -> std::io::Result<()> {
    use actix_cors::Cors;
    use actix_web::{App, HttpServer, web};

    // Ensure required directories exist
    let _ = std::fs::create_dir_all("assets");
    let _ = std::fs::create_dir_all("Template");
    let _ = std::fs::create_dir_all("excelcsvs");
    let _ = std::fs::create_dir_all("certificates");
    let _ = std::fs::create_dir_all("output");

    let jobs: api::Jobs = Arc::new(Mutex::new(HashMap::new()));

    println!("🚀 CertiForge API Server starting...");
    println!("📡 Listening on http://127.0.0.1:7000");
    println!("💡 Use --cli flag to run the interactive CLI instead");
    println!();

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(jobs.clone()))
            .app_data(web::PayloadConfig::new(50 * 1024 * 1024))
            .app_data(
                actix_multipart::form::MultipartFormConfig::default().total_limit(50 * 1024 * 1024),
            )
            .route("/api/health", web::get().to(api::health))
            .route("/api/fonts", web::get().to(api::list_fonts))
            .route("/api/templates", web::get().to(api::list_templates))
            .route("/api/templates/{name}", web::get().to(api::serve_template))
            .route("/api/analyze", web::post().to(api::analyze_image))
            .route("/api/generate-single", web::post().to(api::generate_single))
            .route("/api/generate-batch", web::post().to(api::generate_batch))
            .route("/api/jobs/{id}/status", web::get().to(api::job_status))
            .route("/api/jobs/{id}/download", web::get().to(api::job_download))
            .route("/api/upload-template", web::post().to(api::upload_template))
            .route("/api/upload-font", web::post().to(api::upload_font))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

#[actix_web::main]
async fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();

    if args.iter().any(|a| a == "--cli") {
        run_cli()?;
    } else {
        run_server()
            .await
            .map_err(|e| anyhow::anyhow!("Server error: {}", e))?;
    }

    Ok(())
}
