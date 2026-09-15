use std::fs;
use std::path::{Path, PathBuf};

const XPACKET_UUID: &str = "W5M0MpCehiHzreSzNTczkc9d";

/// Get the expected .xmp sidecar path for a given image file
pub fn get_xmp_path(image_path: &Path) -> PathBuf {
    image_path.with_extension("xmp")
}

/// Check if an .xmp or .acr sidecar exists
pub fn check_sidecar_exists(image_path: &Path) -> bool {
    let xmp = image_path.with_extension("xmp");
    if xmp.exists() {
        return true;
    }
    let acr = image_path.with_extension("acr");
    acr.exists()
}

/// Read rating and label from an existing XMP sidecar
pub fn read_xmp(xmp_path: &Path) -> Option<(u8, String)> {
    if !xmp_path.exists() {
        return None;
    }
    let content = fs::read_to_string(xmp_path).ok()?;
    
    // Parse xmp:Rating (0..5)
    let mut rating = 0u8;
    if let Some(pos) = content.find("xmp:Rating") {
        let slice = &content[pos..content.len().min(pos + 40)];
        for ch in slice.chars() {
            if ch.is_ascii_digit() {
                if let Some(digit) = ch.to_digit(10) {
                    rating = (digit as u8).min(5);
                    break;
                }
            }
        }
    }

    // Parse xmp:Label (Red, Yellow, Green, Blue, Purple)
    let mut label = String::new();
    if let Some(start_idx) = content.find("<xmp:Label>") {
        let after_tag = &content[start_idx + 11..];
        if let Some(end_idx) = after_tag.find("</xmp:Label>") {
            label = after_tag[..end_idx].trim().to_string();
        }
    } else if let Some(start_idx) = content.find("xmp:Label=\"") {
        let after_attr = &content[start_idx + 11..];
        if let Some(end_idx) = after_attr.find('\"') {
            label = after_attr[..end_idx].trim().to_string();
        }
    }

    Some((rating, label))
}

/// Write Adobe Lightroom Classic & Capture One compatible XMP sidecar
pub fn write_xmp(image_path: &Path, rating: u8, flag: &str) -> Result<PathBuf, String> {
    let xmp_path = get_xmp_path(image_path);
    let rating = rating.min(5);
    
    // Map flag to Adobe color label
    let label = match flag {
        "pick" => "Green",
        "reject" => "Red",
        _ => "",
    };

    let label_tag = if !label.is_empty() {
        format!("      <xmp:Label>{}</xmp:Label>\n", label)
    } else {
        String::new()
    };

    let body = format!(
        "<?xpacket begin=\"\u{feff}\" id=\"{}\"?>\n\
        <x:xmpmeta xmlns:x=\"adobe:ns:meta/\" x:xmptk=\"GalleryCulling\">\n\
        \x20 <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n\
        \x20   <rdf:Description rdf:about=\"\"\n\
        \x20       xmlns:xmp=\"http://ns.adobe.com/xap/1.0/\">\n\
        \x20     <xmp:Rating>{}</xmp:Rating>\n\
        {}\
        \x20   </rdf:Description>\n\
        \x20 </rdf:RDF>\n\
        </x:xmpmeta>\n\
        <?xpacket end=\"w\"?>\n",
        XPACKET_UUID, rating, label_tag
    );

    fs::write(&xmp_path, body).map_err(|e| format!("写入 XMP 失败 ({}): {}", xmp_path.display(), e))?;
    Ok(xmp_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xmp_write_and_read() {
        let temp_dir = std::env::temp_dir();
        let test_img = temp_dir.join("test_photo_sample.jpg");
        let xmp_file = write_xmp(&test_img, 4, "pick").expect("Should write xmp");
        assert!(xmp_file.exists());

        let (rating, label) = read_xmp(&xmp_file).expect("Should read xmp");
        assert_eq!(rating, 4);
        assert_eq!(label, "Green");

        // Clean up
        let _ = fs::remove_file(xmp_file);
    }
}
