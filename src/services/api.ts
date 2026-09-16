import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { AppSettings, ExportItem, FolderScanResult } from '../types';

export const api = {
  /**
   * Scan JPG and RAW folders
   */
  scanFolders: async (
    jpgFolder: string,
    rawFolder?: string,
    sortOrder?: string,
  ): Promise<FolderScanResult> => {
    return await invoke<FolderScanResult>('scan_folders_cmd', {
      jpgFolder,
      rawFolder: rawFolder || null,
      sortOrder: sortOrder || null,
    });
  },

  /**
   * Get or generate thumbnail path for an image
   */
  getThumbnail: async (filePath: string, width?: number): Promise<string> => {
    const localCachePath = await invoke<string>('get_thumbnail_cmd', {
      filePath,
      width: width || 200,
    });
    return convertFileSrc(localCachePath);
  },

  /**
   * Update photo rating and pick/reject flag
   */
  updateRatingFlag: async (
    filePath: string,
    rating: number,
    flag: string,
    syncXmp: boolean = true,
  ): Promise<boolean> => {
    return await invoke<boolean>('update_rating_flag_cmd', {
      filePath,
      rating,
      flag,
      syncXmp,
    });
  },

  /**
   * Open file in Photoshop
   */
  openInPhotoshop: async (
    filePath: string,
    customPsPath?: string,
  ): Promise<boolean> => {
    return await invoke<boolean>('open_in_photoshop_cmd', {
      filePath,
      customPsPath: customPsPath || null,
    });
  },

  /**
   * Open file in OS default application
   */
  openInDefaultApp: async (filePath: string): Promise<boolean> => {
    return await invoke<boolean>('open_in_default_app_cmd', {
      filePath,
    });
  },

  /**
   * Move photos to OS Recycle Bin
   */
  trashPhotos: async (filePaths: string[]): Promise<number> => {
    return await invoke<number>('trash_photos_cmd', {
      filePaths,
    });
  },

  /**
   * Batch copy/export selected photos
   */
  batchExport: async (
    items: ExportItem[],
    targetFolder: string,
    includeRaw: boolean,
    includeJpg: boolean,
  ): Promise<number> => {
    return await invoke<number>('batch_export_cmd', {
      items,
      targetFolder,
      includeRaw,
      includeJpg,
    });
  },

  /**
   * Batch update lens metadata (lens model, focal length, aperture) into XMP sidecars
   */
  batchUpdateMetadata: async (
    filePaths: string[],
    lensModel?: string,
    focalLength?: string,
    aperture?: string,
  ): Promise<number> => {
    return await invoke<number>('batch_update_metadata_cmd', {
      filePaths,
      lensModel: lensModel || null,
      focalLength: focalLength || null,
      aperture: aperture || null,
    });
  },

  /**
   * Load app settings from SQLite
   */
  getSettings: async (): Promise<AppSettings> => {
    return await invoke<AppSettings>('get_settings_cmd');
  },

  /**
   * Save app settings to SQLite
   */
  saveSettings: async (settings: AppSettings): Promise<boolean> => {
    return await invoke<boolean>('save_settings_cmd', { settings });
  },

  /**
   * Save session browsing history
   */
  saveSession: async (
    jpgFolder: string,
    rawFolder: string,
    lastIndex: number,
    sortOrder: string,
  ): Promise<boolean> => {
    return await invoke<boolean>('save_session_cmd', {
      jpgFolder,
      rawFolder,
      lastIndex,
      sortOrder,
    });
  },

  /**
   * Load session browsing history
   */
  loadSession: async (
    jpgFolder: string,
  ): Promise<[number, string] | null> => {
    return await invoke<[number, string] | null>('load_session_cmd', {
      jpgFolder,
    });
  },

  /**
   * Open native folder picker dialog
   */
  selectFolderDialog: async (defaultPath?: string): Promise<string | null> => {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: defaultPath || undefined,
      title: '选择照片文件夹',
    });
    return typeof selected === 'string' ? selected : null;
  },

  /**
   * Convert local disk path to Tauri asset:// URL for zero-copy streaming
   */
  toAssetUrl: (filePath: string): string => {
    return convertFileSrc(filePath);
  },
};
