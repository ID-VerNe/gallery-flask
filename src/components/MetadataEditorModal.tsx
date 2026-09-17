import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle2, Sparkles } from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface MetadataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup?: PhotoGroupInfo;
  filteredGroups: PhotoGroupInfo[];
  allGroups: PhotoGroupInfo[];
  onMetadataUpdated: (targetIds: string[], lensModel: string, focalLength: string, aperture: string) => void;
}

const COMMON_MANUAL_LENSES = [
  { name: 'Voigtlander APO-LANTHAR 50mm F2', focal: '50mm', aperture: 'f/2.0' },
  { name: 'Voigtlander NOKTON 35mm F1.2', focal: '35mm', aperture: 'f/1.2' },
  { name: 'TTArtisan 28mm F5.6', focal: '28mm', aperture: 'f/5.6' },
  { name: '7Artisans 35mm F0.95', focal: '35mm', aperture: 'f/0.95' },
  { name: 'Leica Summicron-M 50mm f/2', focal: '50mm', aperture: 'f/2.0' },
  { name: 'Zeiss Planar T* 50mm f/1.4', focal: '50mm', aperture: 'f/1.4' },
];

export const MetadataEditorModal: React.FC<MetadataEditorModalProps> = ({
  isOpen,
  onClose,
  currentGroup,
  filteredGroups,
  allGroups,
  onMetadataUpdated,
}) => {
  const [lensModel, setLensModel] = useState('');
  const [focalLength, setFocalLength] = useState('');
  const [aperture, setAperture] = useState('');
  const [syncScope, setSyncScope] = useState<'current' | 'filtered' | 'all'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  // Initialize values from current group when opened
  useEffect(() => {
    if (isOpen && currentGroup) {
      setLensModel(currentGroup.exif?.lensModel || '');
      setFocalLength(currentGroup.exif?.focalLength || '');
      setAperture(currentGroup.exif?.aperture || '');
      setSaveResult(null);
    }
  }, [isOpen, currentGroup]);

  // Close modal on Escape
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

  if (!isOpen) return null;

  const targetGroups =
    syncScope === 'current'
      ? currentGroup ? [currentGroup] : []
      : syncScope === 'filtered'
      ? filteredGroups
      : allGroups;

  const handleApplyPreset = (preset: { name: string; focal: string; aperture: string }) => {
    setLensModel(preset.name);
    setFocalLength(preset.focal);
    setAperture(preset.aperture);
  };

  const handleSave = async () => {
    if (targetGroups.length === 0) {
      alert('没有可更新的目标照片！');
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      // Gather all file paths (prefer RAW, then JPG)
      const filePaths = targetGroups
        .map((g) => g.raw?.path || g.jpg?.path)
        .filter((p): p is string => Boolean(p));

      const updatedCount = await api.batchUpdateMetadata(
        filePaths,
        lensModel.trim() || undefined,
        focalLength.trim() || undefined,
        aperture.trim() || undefined,
      );

      // Update in parent memory
      const targetIds = targetGroups.map((g) => g.id);
      onMetadataUpdated(targetIds, lensModel.trim(), focalLength.trim(), aperture.trim());

      setSaveResult(`成功同步元数据至 ${updatedCount} 张照片的 XMP 侧边栏！Lightroom / ACR 将自动识别。`);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      alert(`同步元数据失败: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background-base/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-background-panel border border-border-default rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-background-panel">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-white" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-gray-100">
              手动镜头元数据编辑与批量同步
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition"
            aria-label="关闭窗口"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Quick presets */}
          <div>
            <label className="block text-white/80 font-medium mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>常用手动镜头快捷预设</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MANUAL_LENSES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 bg-button hover:bg-button-hover border border-border-strong text-white/80 rounded-md text-[11px] transition text-left"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3.5 bg-background-header p-4 rounded-xl border border-border-default">
            <div>
              <label className="block text-white/80 font-medium mb-1">
                镜头型号 (Lens Model)
              </label>
              <input
                type="text"
                value={lensModel}
                onChange={(e) => setLensModel(e.target.value)}
                placeholder="例如: Voigtlander APO-LANTHAR 50mm F2"
                className="w-full bg-background-input border border-border-strong rounded-lg px-3 py-2 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/80 font-medium mb-1">
                  焦段 / 焦距 (Focal Length)
                </label>
                <input
                  type="text"
                  value={focalLength}
                  onChange={(e) => setFocalLength(e.target.value)}
                  placeholder="例如: 50mm 或 35mm"
                  className="w-full bg-background-input border border-border-strong rounded-lg px-3 py-2 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-white/80 font-medium mb-1">
                  光圈值 (Aperture / F-Number)
                </label>
                <input
                  type="text"
                  value={aperture}
                  onChange={(e) => setAperture(e.target.value)}
                  placeholder="例如: f/2.0 或 f/1.4"
                  className="w-full bg-background-input border border-border-strong rounded-lg px-3 py-2 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Sync Scope Selection */}
          <div>
            <label className="block text-white/80 font-medium mb-2">
              批量同步目标范围
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSyncScope('current')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  syncScope === 'current'
                    ? 'border-blue-500 bg-blue-950/40 text-white font-medium'
                    : 'border-border-default bg-background-panel text-white/60 hover:text-white'
                }`}
              >
                <span>仅当前选中照片</span>
                <span className="text-[10px] text-white/40 font-mono">(1 张)</span>
              </button>

              <button
                type="button"
                onClick={() => setSyncScope('filtered')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  syncScope === 'filtered'
                    ? 'border-blue-500 bg-blue-950/40 text-white font-medium'
                    : 'border-border-default bg-background-panel text-white/60 hover:text-white'
                }`}
              >
                <span>当前筛选集</span>
                <span className="text-[10px] text-white/40 font-mono">({filteredGroups.length} 张)</span>
              </button>

              <button
                type="button"
                onClick={() => setSyncScope('all')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  syncScope === 'all'
                    ? 'border-blue-500 bg-blue-950/40 text-white font-medium'
                    : 'border-border-default bg-background-panel text-white/60 hover:text-white'
                }`}
              >
                <span>全部扫描照片</span>
                <span className="text-[10px] text-white/40 font-mono">({allGroups.length} 张)</span>
              </button>
            </div>
          </div>

          {/* Info note */}
          <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-200 text-[11px] leading-relaxed">
            💡 提示：保存后将自动为所选照片写入符合 Adobe 标准的 <code className="font-mono text-blue-300">aux:Lens</code> 和 <code className="font-mono text-blue-300">exif:FocalLength</code> 侧边栏，保留现有星标与标记，导入 Lightroom Classic 或 Photoshop ACR 即刻识别。
          </div>

          {/* Success Message */}
          {saveResult && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-xs">{saveResult}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-background-panel">
          <span className="text-white/60 text-xs">
            将更新 <strong className="text-white font-mono">{targetGroups.length}</strong> 张照片
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/15 rounded-lg transition"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || targetGroups.length === 0}
              className="px-5 py-2 text-xs font-medium bg-white hover:bg-white/90 text-black active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition shadow-md"
            >
              {isSaving ? '正在写入 XMP...' : '确认并批量同步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
