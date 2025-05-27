# --- ADD: Custom exception classes for structured error handling ---
class ImageSelectorError(Exception):
    """Base exception for the image selector application."""
    pass

class FolderNotFoundError(ImageSelectorError):
    """Custom exception for cases where specified folders are not found or are invalid."""
    pass

class NoImagePairsFoundError(ImageSelectorError):
    """Custom exception when no matching image pairs are found in specified folders."""
    pass

class ImageProcessingError(ImageSelectorError):
     """Custom exception for errors during image loading or processing (e.g., Pillow errors)."""
     pass

class InvalidIndexError(ImageSelectorError):
     """Custom exception for invalid image indices when accessing image pairs."""
     pass

class ConfigError(ImageSelectorError):
     """Custom exception for configuration loading or saving errors."""
     pass

class ExternalToolError(ImageSelectorError):
     """Custom exception for errors when interacting with external tools (e.g., subprocess)."""
     pass
# --- END ADD ---