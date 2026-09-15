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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181920] border border-[#2d303c] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-gray-200 text-xs">
        {/* Header */}
        <div className="h-12 border-b border-[#292c37] px-4 flex items-center justify-between bg-[#14151b]">
          <div className="flex items-center gap-2 font-semibold text-sm text-white">
            <Settings className="w-4 h-4 text-blue-400" />
            <span>首选项与工具设置</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Photoshop Path */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 font-medium">Photoshop 可执行程序路径：</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.photoshopPath}
                onChange={(e) =>
                  setSettings({ ...settings, photoshopPath: e.target.value })
                }
                className="flex-1 bg-[#121316] border border-[#2d303c] rounded px-3 py-1.5 text-gray-200 outline-none font-mono text-[11px]"
              />
              <button
                onClick={handleBrowsePhotoshop}
                className="px-2.5 py-1.5 bg-[#252834] hover:bg-[#323646] text-white rounded flex items-center gap-1"
                title="选择 Photoshop 路径"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              用于快捷键 'O' 或点击“打开 RAW”时直接通过 Photoshop 打开对应相机 RAW 文件。
            </p>
          </div>

          {/* Thumbnail Width */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 font-medium">缩略图默认生成尺寸 (宽度像素)：</label>
            <input
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
              className="w-32 bg-[#121316] border border-[#2d303c] rounded px-3 py-1.5 text-gray-200 outline-none font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#292c37] px-4 flex items-center justify-end gap-2 bg-[#14151b]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#252834] hover:bg-[#323646] text-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
