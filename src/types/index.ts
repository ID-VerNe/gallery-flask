export interface PhotoFileInfo {
  name: string;
  extension: string;
  path: string;
  size: number;
  mtime: number;
}

export interface ExifData {
  shutterSpeed?: string;
  aperture?: string;
  iso?: string;
  focalLength?: string;
  dateTime?: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  orientation?: number;
}

export type CullFlag = 'none' | 'pick' | 'reject';
export type ViewMode = 'single' | 'split';
export type SortOrder = 'time_filename' | 'filename' | 'rating';
export type FilterMode = 'all' | 'pick' | 'reject' | 'unmarked' | 'star1' | 'star2' | 'star3' | 'star4' | 'star5';

export interface PhotoGroupInfo {
  id: string;
  baseName: string;
  jpg?: PhotoFileInfo;
  raw?: PhotoFileInfo;
  status: 'COMPLETE' | 'JPG_ONLY' | 'RAW_ONLY';
  rating: number; // 0..5
  flag: CullFlag;
  hasXmp: boolean;
  exif?: ExifData;
  thumbnailPath?: string;
}

export interface AppSettings {
  defaultJpgFolder: string;
  defaultRawFolder: string;
  photoshopPath: string;
  thumbnailWidth: number;
  sortOrder: SortOrder;
}

export interface ExportItem {
  baseName: string;
  jpgPath?: string;
  rawPath?: string;
}

export interface FolderScanResult {
  groups: PhotoGroupInfo[];
  totalCount: number;
  jpgFolder: string;
  rawFolder: string;
  isViewerMode: boolean;
}
