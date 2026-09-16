import React from 'react';
import {
  FolderOpen,
  RefreshCw,
  SlidersHorizontal,
  Download,
  Columns2,
  Maximize2,
  LayoutGrid,
  Settings,
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
}) => {
  return (
    <header className="h-14 bg-[#18191e] border-b border-[#292c37] flex items-center justify-between px-3 gap-3 shrink-0 text-xs">
      {/* Folder Inputs */}
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-3xl">
        {/* JPG Folder */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-[#121316] border border-[#2d313e] rounded-md px-2.5 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition">
          <label htmlFor="topbar-jpg-input" className="text-gray-400 font-semibold whitespace-nowrap cursor-pointer">
            JPG:
          </label>
          <input
            id="topbar-jpg-input"
            type="text"
            className="bg-transparent border-none outline-none text-gray-200 w-full font-mono text-[11px]"
            value={jpgFolder}
            onChange={(e) => onJpgFolderChange(e.target.value)}
            placeholder="选择或输入 JPG 文件夹路径..."
            aria-label="JPG 照片文件夹路径"
          />
          <button
            onClick={onBrowseJpg}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#252834] active:scale-[0.96] transition"
            title="浏览 JPG 文件夹"
            aria-label="浏览选择 JPG 文件夹"
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* RAW Folder */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-[#121316] border border-[#2d313e] rounded-md px-2.5 py-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition">
          <label htmlFor="topbar-raw-input" className="text-gray-400 font-semibold whitespace-nowrap cursor-pointer">
            RAW:
          </label>
          <input
            id="topbar-raw-input"
            type="text"
            className="bg-transparent border-none outline-none text-gray-200 w-full font-mono text-[11px]"
            value={rawFolder}
            onChange={(e) => onRawFolderChange(e.target.value)}
            placeholder="可选：RAW 文件夹路径..."
            aria-label="RAW 原片文件夹路径 (可选)"
          />
          <button
            onClick={onBrowseRaw}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#252834] active:scale-[0.96] transition"
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md font-medium active:scale-[0.96] transition-transform shrink-0"
          aria-label={isLoading ? '正在扫描照片目录' : '扫描照片目录'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isLoading ? '扫描中...' : '扫描照片'}</span>
        </button>
      </div>

      {/* Center Controls: Filter & Sort */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-[#121316] border border-[#2d313e] rounded-md px-2.5 py-1 text-gray-300">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          <select
            value={filterMode}
            onChange={(e) => onFilterChange(e.target.value as FilterMode)}
            aria-label="照片筛选过滤"
            className="bg-transparent border-none outline-none text-gray-200 cursor-pointer text-xs"
          >
            <option value="all" className="bg-[#18191e]">全部照片</option>
            <option value="pick" className="bg-[#18191e]">仅已保留 (Pick)</option>
            <option value="reject" className="bg-[#18191e]">已淘汰 (Reject)</option>
            <option value="unmarked" className="bg-[#18191e]">未标记</option>
            <option value="star3" className="bg-[#18191e]">★3 星以上</option>
            <option value="star5" className="bg-[#18191e]">★5 星精选</option>
          </select>
        </div>

        {/* Sort */}
        <div className="bg-[#121316] border border-[#2d313e] rounded-md px-2.5 py-1 text-gray-300">
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            aria-label="照片排序方式"
            className="bg-transparent border-none outline-none text-gray-200 cursor-pointer text-xs"
          >
            <option value="time_filename" className="bg-[#18191e]">拍摄时间排序</option>
            <option value="filename" className="bg-[#18191e]">文件名排序</option>
            <option value="rating" className="bg-[#18191e]">星级最高优先</option>
          </select>
        </div>
      </div>

      {/* Right Controls: View Modes & Export & Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View mode toggle group */}
        <div className="flex items-center bg-[#121316] border border-[#2d313e] rounded-md p-0.5" role="group" aria-label="视图检视模式">
          <button
            onClick={() => onViewModeChange('single')}
            className={`p-1.5 rounded ${
              viewMode === 'single'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#20222c]'
            } active:scale-[0.96] transition`}
            title="单图大图检视 (快捷键 G 切换)"
            aria-label="单图大图检视模式"
            aria-pressed={viewMode === 'single'}
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => onViewModeChange('split')}
            className={`p-1.5 rounded ${
              viewMode === 'split'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#20222c]'
            } active:scale-[0.96] transition`}
            title="双图联动对比 (快捷键 C 切换)"
            aria-label="双图联动对比模式"
            aria-pressed={viewMode === 'split'}
          >
            <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#20222c]'
            } active:scale-[0.96] transition`}
            title="纯网格全屏模式"
            aria-label="纯网格全屏浏览模式"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Batch Export */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252834] hover:bg-[#323646] text-gray-200 rounded-md active:scale-[0.96] transition-transform font-medium"
          title="导出选中的照片"
          aria-label="批量挑选导出照片"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
          <span>导出</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettingsModal}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#252834] rounded-md active:scale-[0.96] transition-transform"
          title="首选项与工具设置"
          aria-label="首选项与工具设置"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
