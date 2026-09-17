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
export type ViewMode = 'single' | 'split' | 'before_after';
export type SortOrder = 'time_filename' | 'filename' | 'rating';
export type FilterMode = 'all' | 'pick' | 'reject' | 'unmarked' | 'star1' | 'star2' | 'star3' | 'star4' | 'star5';

export interface ToneAdjustments {
  exposure: number;     // 曝光补偿 -5.00 .. +5.00 EV
  highlights: number;   // 高光 -100 .. +100
  shadows: number;      // 阴影 -100 .. +100
  temperature: number;  // 色温冷暖 -100 .. +100
  tint: number;         // 色调 (绿/洋红) -100 .. +100
  contrast: number;     // 对比度 -100 .. +100
}

export interface PhotoGroupInfo {
  id: string;
  baseName: string;
  jpg?: PhotoFileInfo;
  raw?: PhotoFileInfo;
  edited?: PhotoFileInfo;
  tone?: ToneAdjustments;
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
