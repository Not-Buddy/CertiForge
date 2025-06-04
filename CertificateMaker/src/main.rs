use lopdf::{Document, Dictionary, Object, content::{Content, Operation}};
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    // Read user input
    let mut input = String::new();
    println!("Enter text to add to PDF:");
    std::io::stdin().read_line(&mut input)?;
    let text = input.trim();  // Fixes Error 1

    // Load PDF
    let mut doc = Document::load("TemplateC/ExampleCertificate.pdf")?;

    // Get first page (Fixes Error 2)
    let (&page_id, _) = doc.get_pages()
        .iter()
        .next()
        .ok_or("PDF has no pages")?;

    // Create content operations
    let content = Content {
        operations: vec![
            Operation::new("BT", vec![]),
            Operation::new("Tf", vec!["F1".into(), 36.into()]),
            Operation::new("Td", vec![100.into(), 400.into()]),
            Operation::new("Tj", vec![Object::string_literal(text)]),
            Operation::new("ET", vec![]),
        ],
    };

    // Modify page content (Fixes Error 3)
    if let Ok(mut existing_content) = doc.get_and_decode_page_content(page_id) {
        existing_content.operations.extend(content.operations);
        doc.change_page_content(page_id, existing_content.encode()?)?;
    }

    // Add font resource (Fixes Error 4)
    if let Ok((resources, _)) = doc.get_page_resources(page_id) {
        let mut new_resources = resources.clone().unwrap_or_default();
        new_resources.set("Font", Dictionary::from_iter(vec![
            ("F1", Dictionary::from_iter(vec![
                ("Type", "Font".into()),
                ("Subtype", "Type1".into()),
                ("BaseFont", "Helvetica-Bold".into()),
            ]).into())
        ]));
        doc.set_page_resources(page_id, new_resources)?;
    }

    doc.save("output.pdf")?;
    Ok(())
}

