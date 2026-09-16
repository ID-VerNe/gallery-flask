import React, { useState } from 'react';
import { X, FolderOpen, Download, CheckCircle2 } from 'lucide-react';
import { ExportItem, PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: PhotoGroupInfo[];
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  groups,
}) => {
  const [targetFolder, setTargetFolder] = useState('');
  const [includeRaw, setIncludeRaw] = useState(true);
  const [includeJpg, setIncludeJpg] = useState(true);
  const [exportFilter, setExportFilter] = useState<'pick_or_rated' | 'pick_only' | 'star3_plus' | 'all'>('pick_or_rated');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

  // Close modal on Escape
  React.useEffect(() => {
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

  // Filter groups according to policy
  const exportCandidates = groups.filter((g) => {
    if (exportFilter === 'pick_only') return g.flag === 'pick';
    if (exportFilter === 'star3_plus') return g.rating >= 3;
    if (exportFilter === 'all') return g.flag !== 'reject';
    // default: pick_or_rated (pick or rating > 0, and not rejected)
    return g.flag !== 'reject' && (g.flag === 'pick' || g.rating > 0);
  });

  const handleBrowseTarget = async () => {
    const selected = await api.selectFolderDialog(targetFolder);
    if (selected) {
      setTargetFolder(selected);
    }
  };

  const handleExport = async () => {
    if (!targetFolder.trim()) {
      alert('请选择导出目标文件夹！');
      return;
    }
    if (exportCandidates.length === 0) {
      alert('没有符合导出条件的照片！');
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    const items: ExportItem[] = exportCandidates.map((g) => ({
      baseName: g.baseName,
      jpgPath: g.jpg?.path,
      rawPath: g.raw?.path,
    }));

    try {
      const count = await api.batchExport(items, targetFolder, includeRaw, includeJpg);
      setExportResult(`成功导出 ${count} 个文件至目标文件夹！`);
    } catch (err) {
      alert(`导出出错: ${err}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-export-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="bg-[#181920] border border-[#2d303c] rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-gray-200 text-xs">
        {/* Modal Header */}
        <div className="h-12 border-b border-[#292c37] px-4 flex items-center justify-between bg-[#14151b]">
          <div className="flex items-center gap-2 font-semibold text-sm text-white">
            <Download className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <h2 id="batch-export-modal-title">批量挑选导出 (Culling Export)</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#252834] active:scale-[0.96] transition"
            aria-label="关闭导出弹窗"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-4">
          {/* Target Folder */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="export-target-folder" className="text-gray-300 font-medium cursor-pointer">
              目标导出目录：
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-target-folder"
                type="text"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                placeholder="请选择或粘贴保存挑选照片的文件夹..."
                className="flex-1 bg-[#121316] border border-[#2d303c] rounded-md px-3 py-1.5 text-gray-200 outline-none font-mono text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              />
              <button
                onClick={handleBrowseTarget}
                className="px-3.5 py-1.5 bg-[#252834] hover:bg-[#323646] active:scale-[0.96] text-white rounded-md flex items-center gap-1.5 transition-transform"
                aria-label="浏览选择目标导出目录"
              >
                <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>浏览</span>
              </button>
            </div>
          </div>

          {/* Filter Range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 font-medium">导出范围：</label>
            <div className="grid grid-cols-2 gap-2 bg-[#121316] p-2.5 rounded border border-[#252834]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_filter"
                  checked={exportFilter === 'pick_or_rated'}
                  onChange={() => setExportFilter('pick_or_rated')}
                />
                <span>已保留或已打星 ({groups.filter(g => g.flag !== 'reject' && (g.flag === 'pick' || g.rating > 0)).length} 张)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_filter"
                  checked={exportFilter === 'pick_only'}
                  onChange={() => setExportFilter('pick_only')}
                />
                <span>仅标记保留 Pick ({groups.filter(g => g.flag === 'pick').length} 张)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_filter"
                  checked={exportFilter === 'star3_plus'}
                  onChange={() => setExportFilter('star3_plus')}
                />
                <span>★ 3 星以上 ({groups.filter(g => g.rating >= 3).length} 张)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_filter"
                  checked={exportFilter === 'all'}
                  onChange={() => setExportFilter('all')}
                />
                <span>全部非淘汰照片 ({groups.filter(g => g.flag !== 'reject').length} 张)</span>
              </label>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-300 font-medium">包含文件类型：</label>
            <div className="flex items-center gap-4 bg-[#121316] p-2.5 rounded border border-[#252834]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRaw}
                  onChange={(e) => setIncludeRaw(e.target.checked)}
                />
                <span>复制 RAW 原片及 XMP 侧边栏</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeJpg}
                  onChange={(e) => setIncludeJpg(e.target.checked)}
                />
                <span>复制对应 JPG 预览</span>
              </label>
            </div>
          </div>

          {/* Success Message */}
          {exportResult && (
            <div className="p-3 bg-green-950/40 border border-green-600/50 rounded flex items-center gap-2 text-green-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
              <span>{exportResult}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-12 border-t border-[#292c37] px-4 flex items-center justify-between bg-[#14151b]">
          <span className="text-gray-400">
            预计导出: <b className="text-white font-mono tabular-nums">{exportCandidates.length}</b> 组照片
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-[#252834] hover:bg-[#323646] active:scale-[0.96] text-gray-300 transition-transform"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || exportCandidates.length === 0 || !targetFolder.trim()}
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-[0.96] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1.5 transition-transform"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isExporting ? '导出中...' : '开始导出'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
