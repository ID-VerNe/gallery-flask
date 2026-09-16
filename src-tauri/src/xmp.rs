use std::fs;
use std::path::{Path, PathBuf};

const XPACKET_UUID: &str = "W5M0MpCehiHzreSzNTczkc9d";

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct XmpMetadata {
    pub rating: u8,
    pub label: String,
    pub lens_model: Option<String>,
    pub focal_length: Option<String>,
    pub aperture: Option<String>,
}

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

/// Extract tag value from XML string (handles both <tag>value</tag> and tag="value")
fn extract_tag_value(content: &str, tag_name: &str) -> Option<String> {
    let open_tag = format!("<{}>", tag_name);
    let close_tag = format!("</{}>", tag_name);
    if let Some(start_idx) = content.find(&open_tag) {
        let after_tag = &content[start_idx + open_tag.len()..];
        if let Some(end_idx) = after_tag.find(&close_tag) {
            let val = after_tag[..end_idx].trim();
            if !val.is_empty() {
                return Some(val.to_string());
            }
        }
    }
    let attr_prefix = format!("{}=\"", tag_name);
    if let Some(start_idx) = content.find(&attr_prefix) {
        let after_attr = &content[start_idx + attr_prefix.len()..];
        if let Some(end_idx) = after_attr.find('\"') {
            let val = after_attr[..end_idx].trim();
            if !val.is_empty() {
                return Some(val.to_string());
            }
        }
    }
    None
}

/// Read full metadata (rating, label, lens, focal length, aperture) from an existing XMP sidecar
pub fn read_xmp_full(xmp_path: &Path) -> Option<XmpMetadata> {
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

    let label = extract_tag_value(&content, "xmp:Label").unwrap_or_default();
    let lens_model = extract_tag_value(&content, "aux:LensModel")
        .or_else(|| extract_tag_value(&content, "aux:Lens"));
    let focal_length = extract_tag_value(&content, "exif:FocalLength");
    let aperture = extract_tag_value(&content, "exif:FNumber");

    Some(XmpMetadata {
        rating,
        label,
        lens_model,
        focal_length,
        aperture,
    })
}

/// Read rating and label from an existing XMP sidecar
#[allow(dead_code)]
pub fn read_xmp(xmp_path: &Path) -> Option<(u8, String)> {
    read_xmp_full(xmp_path).map(|m| (m.rating, m.label))
}

/// Write Adobe Lightroom Classic & Capture One compatible XMP sidecar
pub fn write_xmp_full(image_path: &Path, meta: &XmpMetadata) -> Result<PathBuf, String> {
    let xmp_path = get_xmp_path(image_path);
    let rating = meta.rating.min(5);

    let label_tag = if !meta.label.is_empty() {
        format!("      <xmp:Label>{}</xmp:Label>\n", meta.label)
    } else {
        String::new()
    };

    let lens_tag = if let Some(lens) = &meta.lens_model {
        if !lens.trim().is_empty() {
            format!(
                "      <aux:Lens>{}</aux:Lens>\n      <aux:LensModel>{}</aux:LensModel>\n",
                lens.trim(),
                lens.trim()
            )
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let focal_tag = if let Some(focal) = &meta.focal_length {
        if !focal.trim().is_empty() {
            format!("      <exif:FocalLength>{}</exif:FocalLength>\n", focal.trim())
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let aperture_tag = if let Some(aperture) = &meta.aperture {
        if !aperture.trim().is_empty() {
            format!("      <exif:FNumber>{}</exif:FNumber>\n", aperture.trim())
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    let body = format!(
        "<?xpacket begin=\"\u{feff}\" id=\"{}\"?>\n\
        <x:xmpmeta xmlns:x=\"adobe:ns:meta/\" x:xmptk=\"GalleryCulling\">\n\
        \x20 <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n\
        \x20   <rdf:Description rdf:about=\"\"\n\
        \x20       xmlns:xmp=\"http://ns.adobe.com/xap/1.0/\"\n\
        \x20       xmlns:aux=\"http://ns.adobe.com/exif/1.0/aux/\"\n\
        \x20       xmlns:exif=\"http://ns.adobe.com/exif/1.0/\">\n\
        \x20     <xmp:Rating>{}</xmp:Rating>\n\
        {}{}{}{}\
        \x20   </rdf:Description>\n\
        \x20 </rdf:RDF>\n\
        </x:xmpmeta>\n\
        <?xpacket end=\"w\"?>\n",
        XPACKET_UUID, rating, label_tag, lens_tag, focal_tag, aperture_tag
    );

    fs::write(&xmp_path, body).map_err(|e| format!("写入 XMP 失败 ({}): {}", xmp_path.display(), e))?;
    Ok(xmp_path)
}

/// Write Adobe Lightroom Classic & Capture One compatible XMP sidecar (preserving existing lens/metadata if present)
pub fn write_xmp(image_path: &Path, rating: u8, flag: &str) -> Result<PathBuf, String> {
    let xmp_path = get_xmp_path(image_path);
    let mut meta = read_xmp_full(&xmp_path).unwrap_or_default();
    meta.rating = rating;
    meta.label = match flag {
        "pick" => "Green".to_string(),
        "reject" => "Red".to_string(),
        _ => String::new(),
    };
    write_xmp_full(image_path, &meta)
}

/// Update lens metadata (lens model, focal length, aperture) in XMP, preserving rating & flag
pub fn update_xmp_metadata(
    image_path: &Path,
    lens_model: Option<&str>,
    focal_length: Option<&str>,
    aperture: Option<&str>,
) -> Result<PathBuf, String> {
    let xmp_path = get_xmp_path(image_path);
    let mut meta = read_xmp_full(&xmp_path).unwrap_or_default();
    if let Some(l) = lens_model {
        meta.lens_model = Some(l.to_string());
    }
    if let Some(f) = focal_length {
        meta.focal_length = Some(f.to_string());
    }
    if let Some(a) = aperture {
        meta.aperture = Some(a.to_string());
    }
    write_xmp_full(image_path, &meta)
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

    #[test]
    fn test_xmp_metadata_update() {
        let temp_dir = std::env::temp_dir();
        let test_img = temp_dir.join("test_lens_sample.jpg");
        let _ = write_xmp(&test_img, 5, "pick");

        let xmp_file = update_xmp_metadata(
            &test_img,
            Some("Voigtlander 50mm F2 APO"),
            Some("50mm"),
            Some("f/2.0"),
        )
        .expect("Should update metadata");

        let full_meta = read_xmp_full(&xmp_file).expect("Should read full xmp");
        assert_eq!(full_meta.rating, 5);
        assert_eq!(full_meta.label, "Green");
        assert_eq!(full_meta.lens_model.as_deref(), Some("Voigtlander 50mm F2 APO"));
        assert_eq!(full_meta.focal_length.as_deref(), Some("50mm"));
        assert_eq!(full_meta.aperture.as_deref(), Some("f/2.0"));

        let _ = fs::remove_file(xmp_file);
    }
}
