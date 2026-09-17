import React from 'react';
import {
  FolderOpen,
  RefreshCw,
  SlidersHorizontal,
  Download,
  Columns2,
  Maximize2,
  Settings,
  Sliders,
  Split,
  Sparkles,
} from 'lucide-react';
import { FilterMode, SortOrder, ViewMode } from '../types';

interface TopBarProps {
  jpgFolder: string;
  rawFolder: string;
  onJpgFolderChange: (val: string) => void;
  onRawFolderChange: (val: string) => void;
  onBrowseJpg: () => void;
  onBrowseRaw: () => void;
  onScan: () => void;
  isLoading: boolean;
  filterMode: FilterMode;
  onFilterChange: (val: FilterMode) => void;
  sortOrder: SortOrder;
  onSortChange: (val: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (val: ViewMode) => void;
  onOpenExportModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenMetadataModal?: () => void;
  onToggleTonalAdjuster?: () => void;
  showTonalPanel?: boolean;
  onOpenLuminar?: () => void;
  isLuminarRunning?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  jpgFolder,
  rawFolder,
  onJpgFolderChange,
  onRawFolderChange,
  onBrowseJpg,
  onBrowseRaw,
  onScan,
  isLoading,
  filterMode,
  onFilterChange,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
  onOpenExportModal,
  onOpenSettingsModal,
  onOpenMetadataModal,
  onToggleTonalAdjuster,
  showTonalPanel,
  onOpenLuminar,
  isLuminarRunning,
}) => {
  return (
    <header className="h-14 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-3 gap-6 shrink-0 text-xs">
      {/* Folder Inputs */}
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-3xl">
        {/* JPG Folder */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-[#0A0A0A] border border-white/10 rounded-md px-2.5 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition">
          <label htmlFor="topbar-jpg-input" className="text-white/60 font-semibold whitespace-nowrap cursor-pointer">
            JPG:
          </label>
          <input
            id="topbar-jpg-input"
            type="text"
            className="bg-transparent border-none outline-none text-white w-full font-mono text-[11px]"
            value={jpgFolder}
            onChange={(e) => onJpgFolderChange(e.target.value)}
            placeholder="选择或输入 JPG 文件夹路径..."
            aria-label="JPG 照片文件夹路径"
          />
          <button
            onClick={onBrowseJpg}
            className="text-white/60 hover:text-white p-1 rounded hover:bg-white/5 active:scale-[0.96] transition"
            title="浏览 JPG 文件夹"
            aria-label="浏览选择 JPG 文件夹"
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* RAW Folder */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-[#0A0A0A] border border-white/10 rounded-md px-2.5 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition">
          <label htmlFor="topbar-raw-input" className="text-white/60 font-semibold whitespace-nowrap cursor-pointer">
            RAW:
          </label>
          <input
            id="topbar-raw-input"
            type="text"
            className="bg-transparent border-none outline-none text-white w-full font-mono text-[11px]"
            value={rawFolder}
            onChange={(e) => onRawFolderChange(e.target.value)}
            placeholder="可选：RAW 文件夹路径..."
            aria-label="RAW 原片文件夹路径 (可选)"
          />
          <button
            onClick={onBrowseRaw}
            className="text-white/60 hover:text-white p-1 rounded hover:bg-white/5 active:scale-[0.96] transition"
            title="浏览 RAW 文件夹"
            aria-label="浏览选择 RAW 文件夹"
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Scan / Refresh */}
        <button
          onClick={onScan}
          disabled={isLoading || !jpgFolder.trim()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-white/90 text-black active:scale-[0.96] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed rounded-md font-medium transition-transform shadow-sm"
          aria-label={isLoading ? '正在扫描照片目录' : '扫描照片目录'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="pb-[1px]">{isLoading ? '扫描中...' : '扫描照片'}</span>
        </button>
      </div>

      {/* Center Controls: Filter & Sort */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-white/10 rounded-md px-2.5 py-1 text-white/80">
          <SlidersHorizontal className="w-3.5 h-3.5 text-white/60" aria-hidden="true" />
          <select
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as FilterMode)}
            aria-label="照片筛选过滤"
            className="bg-transparent border-none outline-none text-white cursor-pointer text-xs"
          >
            <option value="all" className="bg-[#0A0A0A]">全部照片</option>
            <option value="pick" className="bg-[#0A0A0A]">仅已保留 (Pick)</option>
            <option value="reject" className="bg-[#0A0A0A]">已淘汰 (Reject)</option>
            <option value="unmarked" className="bg-[#0A0A0A]">未标记</option>
            <option value="star3" className="bg-[#0A0A0A]">★3 星以上</option>
            <option value="star5" className="bg-[#0A0A0A]">★5 星精选</option>
          </select>
        </div>

        {/* Sort */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-md px-2.5 py-1 text-white/80">
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            aria-label="照片排序方式"
            className="bg-transparent border-none outline-none text-white cursor-pointer text-xs"
          >
            <option value="time_filename" className="bg-[#0A0A0A]">拍摄时间排序</option>
            <option value="filename" className="bg-[#0A0A0A]">文件名排序</option>
            <option value="rating" className="bg-[#0A0A0A]">星级最高优先</option>
          </select>
        </div>
      </div>

      {/* Right Controls: View Modes & Export & Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View mode toggle group */}
        <div className="flex items-center bg-[#0A0A0A] border border-white/10 rounded-md p-0.5" role="group" aria-label="视图检视模式">
          <button
            onClick={() => onViewModeChange('single')}
            className={`p-1.5 rounded ${
              viewMode === 'single'
                ? 'bg-white text-black font-medium shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-[0.96] transition`}
            title="单图大图检视"
            aria-label="单图大图检视模式"
            aria-pressed={viewMode === 'single'}
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => onViewModeChange('split')}
            className={`p-1.5 rounded ${
              viewMode === 'split'
                ? 'bg-white text-black font-medium shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-[0.96] transition`}
            title="跨图连拍PK对比 (快捷键 C 切换)"
            aria-label="跨图连拍对比模式"
            aria-pressed={viewMode === 'split'}
          >
            <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => onViewModeChange('before_after')}
            className={`p-1.5 rounded ${
              viewMode === 'before_after'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-[0.96] transition`}
            title="本张照片前后对照 (快捷键 Y 切换，按住 \ 瞬看原片)"
            aria-label="本张照片前后对照模式"
            aria-pressed={viewMode === 'before_after'}
          >
            <Split className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Tonal Adjuster Toggle */}
        {onToggleTonalAdjuster && (
          <button
            onClick={onToggleTonalAdjuster}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md active:scale-[0.96] transition-transform font-medium ${
              showTonalPanel
                ? 'bg-white text-black font-medium shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-white'
            }`}
            title="轻量调色与自动曝光预检 (快捷键 E)"
            aria-label="轻量调色预检面板"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-white" aria-hidden="true" />
            <span className="pb-[1px]">调色</span>
          </button>
        )}

        {/* Luminar AI Roundtrip */}
        {onOpenLuminar && (
          <button
            onClick={onOpenLuminar}
            disabled={isLuminarRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 disabled:opacity-50 text-white rounded-md active:scale-[0.96] transition-transform font-medium shadow-sm"
            title="调用 Luminar AI 滤镜插件模式精修 (Apply 自动回写)"
            aria-label="Luminar AI 精修"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" aria-hidden="true" />
            <span className="pb-[1px]">{isLuminarRunning ? 'Luminar 运行中...' : 'Luminar AI'}</span>
          </button>
        )}

        {/* Manual Lens / Metadata Editor */}
        <button
          onClick={onOpenMetadataModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md active:scale-[0.96] transition-transform font-medium"
          title="手动镜头元数据录入与批量同步至 XMP (快捷键 M)"
          aria-label="手动镜头与元数据批量编辑"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          <span className="pb-[1px]">手动镜头 (M)</span>
        </button>

        {/* Batch Export */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md active:scale-[0.96] transition-transform font-medium"
          title="导出选中的照片"
          aria-label="批量挑选导出照片"
        >
          <Download className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          <span className="pb-[1px]">导出</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettingsModal}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/5 rounded-md active:scale-[0.96] transition-transform"
          title="首选项与工具设置"
          aria-label="首选项与工具设置"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
