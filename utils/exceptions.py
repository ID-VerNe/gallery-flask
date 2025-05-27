class ImageSelectorError(Exception):
    pass

class FolderNotFoundError(ImageSelectorError):
    pass

class NoImagePairsFoundError(ImageSelectorError):
    pass

class ImageProcessingError(ImageSelectorError):
     pass

class InvalidIndexError(ImageSelectorError):
     pass

class ConfigError(ImageSelectorError):
     pass

class ExternalToolError(ImageSelectorError):
     pass
