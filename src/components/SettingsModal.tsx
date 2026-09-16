import React, { useState, useEffect } from 'react';
import { X, Settings, FolderOpen, Save } from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';
import { open } from '@tauri-apps/plugin-dialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then(setSettings);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !settings) return null;

  const handleBrowsePhotoshop = async () => {
    const selected = await open({
      multiple: false,
      title: '选择 Photoshop 可执行文件 (Photoshop.exe)',
      filters: [{ name: 'Executable', extensions: ['exe', 'app'] }],
    });
    if (typeof selected === 'string') {
      setSettings({ ...settings, photoshopPath: selected });
    }
  };

  const handleSave = async () => {
    try {
      await api.saveSettings(settings);
      onSettingsSaved(settings);
      onClose();
    } catch (e) {
      alert(`保存设置失败: ${e}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="bg-[#181920] border border-[#2d303c] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-gray-200 text-xs">
        {/* Header */}
        <div className="h-12 border-b border-[#292c37] px-4 flex items-center justify-between bg-[#14151b]">
          <div className="flex items-center gap-2 font-semibold text-sm text-white">
            <Settings className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <h2 id="settings-modal-title">首选项与工具设置</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#252834] active:scale-[0.96] transition"
            aria-label="关闭设置弹窗"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Photoshop Path */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-photoshop-path" className="text-gray-300 font-medium cursor-pointer">
              Photoshop 可执行程序路径：
            </label>
            <div className="flex items-center gap-2">
              <input
                id="settings-photoshop-path"
                type="text"
                value={settings.photoshopPath}
                onChange={(e) =>
                  setSettings({ ...settings, photoshopPath: e.target.value })
                }
                className="flex-1 bg-[#121316] border border-[#2d303c] rounded-md px-3 py-1.5 text-gray-200 outline-none font-mono text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              />
              <button
                onClick={handleBrowsePhotoshop}
                className="px-3 py-1.5 bg-[#252834] hover:bg-[#323646] active:scale-[0.96] text-white rounded-md flex items-center gap-1 transition-transform"
                title="选择 Photoshop 路径"
                aria-label="选择 Photoshop 路径"
              >
                <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              用于快捷键 'O' 或点击“打开 RAW”时直接通过 Photoshop 打开对应相机 RAW 文件。
            </p>
          </div>

          {/* Thumbnail Width */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-thumbnail-width" className="text-gray-300 font-medium cursor-pointer">
              缩略图默认生成尺寸 (宽度像素)：
            </label>
            <input
              id="settings-thumbnail-width"
              type="number"
              min={100}
              max={600}
              step={50}
              value={settings.thumbnailWidth}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  thumbnailWidth: parseInt(e.target.value, 10) || 200,
                })
              }
              className="w-32 bg-[#121316] border border-[#2d303c] rounded-md px-3 py-1.5 text-gray-200 outline-none font-mono text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#292c37] px-4 flex items-center justify-end gap-2 bg-[#14151b]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-[#252834] hover:bg-[#323646] active:scale-[0.96] text-gray-300 transition-transform"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.96] text-white font-medium flex items-center gap-1.5 transition-transform"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>保存设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
