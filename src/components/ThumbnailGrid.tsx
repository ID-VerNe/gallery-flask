import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Star, Check, X, FileEdit, LayoutGrid, Columns3, Columns4 } from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface ThumbnailGridProps {
  groups: PhotoGroupInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDoubleClick?: (index: number) => void;
  isSidebar?: boolean;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  groups,
  selectedIndex,
  onSelect,
  onDoubleClick,
  isSidebar = false,
}) => {
  const [columns, setColumns] = useState<3 | 4>(4);
  const parentRef = useRef<HTMLDivElement>(null);

  // Group into rows for multi-column grid
  const rows = useMemo(() => {
    if (isSidebar) return [];
    const res: PhotoGroupInfo[][] = [];
    for (let i = 0; i < groups.length; i += columns) {
      res.push(groups.slice(i, i + columns));
    }
    return res;
  }, [groups, columns, isSidebar]);

  // Virtualizer for sidebar (1 photo per row)
  const sidebarVirtualizer = useVirtualizer({
    count: isSidebar ? groups.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 105,
    overscan: 5,
  });

  // Virtualizer for grid (3 or 4 photos per row)
  const gridVirtualizer = useVirtualizer({
    count: !isSidebar ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 290,
    overscan: 4,
  });

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < groups.length) {
      if (isSidebar) {
        sidebarVirtualizer.scrollToIndex(selectedIndex, {
          align: 'auto',
          behavior: 'auto',
        });
      } else {
        const rowIndex = Math.floor(selectedIndex / columns);
        gridVirtualizer.scrollToIndex(rowIndex, {
          align: 'auto',
          behavior: 'auto',
        });
      }
    }
  }, [selectedIndex, isSidebar, columns, groups.length, sidebarVirtualizer, gridVirtualizer]);

  if (isSidebar) {
    return (
      <div
        ref={parentRef}
        className="h-full w-full overflow-y-auto bg-[#14151a] p-2 select-none border-l border-[#242731]"
      >
        <div
          style={{
            height: `${sidebarVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {sidebarVirtualizer.getVirtualItems().map((virtualRow) => {
            const group = groups[virtualRow.index];
            const isSelected = virtualRow.index === selectedIndex;

            return (
              <div
                key={group.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="px-1 py-1"
              >
                <ThumbnailCard
                  group={group}
                  index={virtualRow.index}
                  isSelected={isSelected}
                  onSelect={() => onSelect(virtualRow.index)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-column Grid View (3 or 4 columns)
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0e0f13] select-none">
      {/* Top Grid Sub-toolbar */}
      <div className="h-9 shrink-0 bg-[#16171e] border-b border-[#242733] flex items-center justify-between px-4 text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-blue-400" />
          <span className="font-medium">缩略图多列宫格</span>
          <span className="text-[11px] text-gray-500">
            共 {groups.length} 张照片 (双击单张进入预览)
          </span>
        </div>

        {/* Column Switcher (3 or 4) */}
        <div className="flex items-center gap-1 bg-[#101116] p-0.5 rounded-lg border border-[#272a38]">
          <button
            onClick={() => setColumns(3)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${
              columns === 3
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="一行显示 3 张大缩略图"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>3 列宫格</span>
          </button>
          <button
            onClick={() => setColumns(4)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${
              columns === 4
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="一行显示 4 张缩略图"
          >
            <Columns4 className="w-3.5 h-3.5" />
            <span>4 列宫格</span>
          </button>
        </div>
      </div>

      {/* Virtualized Grid Body */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-3">
        <div
          style={{
            height: `${gridVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {gridVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowGroups = rows[virtualRow.index] || [];

            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`grid gap-3 pb-3 ${
                  columns === 3 ? 'grid-cols-3' : 'grid-cols-4'
                }`}
              >
                {rowGroups.map((group, colIdx) => {
                  const itemIndex = virtualRow.index * columns + colIdx;
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <GridPhotoCard
                      key={group.id}
                      group={group}
                      index={itemIndex}
                      isSelected={isSelected}
                      onSelect={() => onSelect(itemIndex)}
                      onDoubleClick={() => onDoubleClick?.(itemIndex)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ThumbnailCardProps {
  group: PhotoGroupInfo;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  group,
  index,
  isSelected,
  onSelect,
}) => {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const targetPath = group.jpg?.path || group.raw?.path;
    if (targetPath) {
      api.getThumbnail(targetPath, 200).then((url) => {
        if (active) {
          setThumbSrc(url);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [group.jpg?.path, group.raw?.path]);

  const flagColor =
    group.flag === 'pick'
      ? 'border-emerald-500/70 bg-emerald-950/20'
      : group.flag === 'reject'
      ? 'border-rose-500/50 bg-rose-950/20'
      : 'border-[#262935]';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-label={`照片 ${group.baseName}, 序号 ${index + 1}${group.rating > 0 ? `, ${group.rating} 星` : ''}${group.flag === 'pick' ? ', 已保留' : group.flag === 'reject' ? ', 已淘汰' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`h-full w-full rounded-lg flex items-center gap-2.5 px-2.5 py-2 cursor-pointer transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 border text-left ${
        isSelected
          ? 'bg-[#222531] border-blue-500 shadow-md ring-1 ring-blue-500/50'
          : `bg-[#191a21] hover:bg-[#20222c] ${flagColor}`
      }`}
    >
      {/* Thumbnail Image with Depth Ring */}
      <div className="relative w-20 h-20 shrink-0 bg-[#0d0e12] rounded-md ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={group.baseName}
            style={{ imageOrientation: 'from-image' }}
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="text-[11px] text-gray-500 font-mono">加载中...</div>
        )}

        {/* Flag Icon overlay */}
        {group.flag === 'pick' && (
          <div className="absolute top-1 left-1 bg-emerald-600 text-white rounded p-0.5 shadow">
            <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
          </div>
        )}
        {group.flag === 'reject' && (
          <div className="absolute top-1 left-1 bg-rose-600 text-white rounded p-0.5 shadow">
            <X className="w-3 h-3 stroke-[3]" aria-hidden="true" />
          </div>
        )}

        {/* Rating Stars badge */}
        {group.rating > 0 && (
          <div className="absolute bottom-0.5 right-0.5 bg-black/85 backdrop-blur px-1.5 py-0.5 rounded flex items-center text-[11px] text-amber-300 font-bold gap-0.5 tabular-nums">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span>{group.rating}</span>
          </div>
        )}
      </div>

      {/* Info labels */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
        <div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono font-medium text-gray-200 truncate" title={group.baseName}>
              {group.baseName}
            </span>
            <span className="text-[11px] text-gray-400 shrink-0 font-mono tabular-nums">#{index + 1}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {group.raw && (
              <span className="px-1.5 py-0.5 bg-blue-900/60 text-blue-300 text-[10px] font-mono rounded">
                {group.raw.extension.toUpperCase()}
              </span>
            )}
            {group.hasXmp && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-900/50 text-amber-300 text-[10px] rounded"
                title="已编辑 (存在 XMP/ACR)"
              >
                <FileEdit className="w-2.5 h-2.5" aria-hidden="true" />
                <span>XMP</span>
              </span>
            )}
            {group.flag === 'reject' && (
              <span className="px-1.5 py-0.5 bg-rose-950/80 text-rose-300 text-[10px] rounded font-medium">
                淘汰
              </span>
            )}
            {group.flag === 'pick' && (
              <span className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 text-[10px] rounded font-medium">
                保留
              </span>
            )}
          </div>
        </div>

        {/* Shutter / Aperture / ISO preview */}
        {group.exif && (
          <div className="text-[11px] text-gray-400 truncate font-mono tabular-nums">
            {[group.exif.aperture, group.exif.shutterSpeed, group.exif.iso ? `ISO${group.exif.iso}` : null]
              .filter(Boolean)
              .join(' ')}
          </div>
        )}
      </div>
    </div>
  );
};

interface GridPhotoCardProps {
  group: PhotoGroupInfo;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
}

const GridPhotoCard: React.FC<GridPhotoCardProps> = ({
  group,
  index,
  isSelected,
  onSelect,
  onDoubleClick,
}) => {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const targetPath = group.jpg?.path || group.raw?.path;
    if (targetPath) {
      // High resolution thumbnail for multi-column grid
      api.getThumbnail(targetPath, 400).then((url) => {
        if (active) {
          setThumbSrc(url);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [group.jpg?.path, group.raw?.path]);

  const flagColor =
    group.flag === 'pick'
      ? 'border-emerald-500/70 bg-emerald-950/15'
      : group.flag === 'reject'
      ? 'border-rose-500/50 bg-rose-950/15'
      : 'border-[#262935]';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`h-[280px] rounded-xl flex flex-col overflow-hidden cursor-pointer transition-[background-color,border-color,box-shadow,transform] border text-left bg-[#171821] hover:bg-[#1d1f2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${flagColor} ${
        isSelected
          ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/60 scale-[1.01]'
          : 'hover:border-[#383c4e]'
      }`}
    >
      {/* Upper Large Thumbnail Container */}
      <div className="relative flex-1 bg-[#090a0d] overflow-hidden flex items-center justify-center p-1.5">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={group.baseName}
            style={{ imageOrientation: 'from-image' }}
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="text-xs text-gray-500 font-mono">加载缩略图中...</div>
        )}

        {/* Index badge */}
        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300 tabular-nums">
          #{index + 1}
        </div>

        {/* Pick / Reject Badge */}
        {group.flag === 'pick' && (
          <div className="absolute top-2 left-2 bg-emerald-600 text-white rounded-md px-1.5 py-0.5 shadow flex items-center gap-1 text-[11px] font-medium">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>保留</span>
          </div>
        )}
        {group.flag === 'reject' && (
          <div className="absolute top-2 left-2 bg-rose-600 text-white rounded-md px-1.5 py-0.5 shadow flex items-center gap-1 text-[11px] font-medium">
            <X className="w-3 h-3 stroke-[3]" />
            <span>淘汰</span>
          </div>
        )}

        {/* Rating Stars badge */}
        {group.rating > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur px-2 py-0.5 rounded-md flex items-center text-xs text-amber-300 font-bold gap-1 tabular-nums border border-white/10">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{group.rating}</span>
          </div>
        )}
      </div>

      {/* Lower Meta Bar */}
      <div className="p-2.5 bg-[#14151c] border-t border-[#232532] flex flex-col justify-between shrink-0 h-[72px]">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-mono font-medium text-gray-100 truncate" title={group.baseName}>
            {group.baseName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {group.raw && (
              <span className="px-1.5 py-0.2 bg-blue-900/60 text-blue-300 text-[10px] font-mono rounded">
                {group.raw.extension.toUpperCase()}
              </span>
            )}
            {group.hasXmp && (
              <span
                className="flex items-center gap-0.5 px-1 py-0.2 bg-amber-900/50 text-amber-300 text-[10px] rounded"
                title="已同步 XMP 侧边栏"
              >
                <FileEdit className="w-2.5 h-2.5" />
                <span>XMP</span>
              </span>
            )}
          </div>
        </div>

        {/* Lens / Camera / EXIF */}
        <div className="text-[11px] text-gray-400 truncate font-mono tabular-nums flex items-center justify-between">
          <span className="truncate text-gray-300">
            {group.exif?.lensModel || group.exif?.cameraModel || '未录入镜头信息'}
          </span>
          {group.exif && (
            <span className="shrink-0 text-gray-400 ml-1">
              {[group.exif.focalLength, group.exif.aperture, group.exif.shutterSpeed, group.exif.iso ? `ISO${group.exif.iso}` : null]
                .filter(Boolean)
                .join(' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
