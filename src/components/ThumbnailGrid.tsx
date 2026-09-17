import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Star, Check, X, Columns3, Columns4, Pin } from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface ThumbnailGridProps {
  groups: PhotoGroupInfo[];
  selectedIndex: number;
  pinnedId?: string | null;
  onSelect: (index: number) => void;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  groups,
  selectedIndex,
  pinnedId,
  onSelect,
}) => {
  const [columns, setColumns] = useState<3 | 4>(3);
  const parentRef = useRef<HTMLDivElement>(null);

  // Split groups into rows for multi-column layout
  const rows = useMemo(() => {
    const res: PhotoGroupInfo[][] = [];
    for (let i = 0; i < groups.length; i += columns) {
      res.push(groups.slice(i, i + columns));
    }
    return res;
  }, [groups, columns]);

  // Virtualizer for multi-column rows
  const rowHeight = columns === 3 ? 140 : 118;
  const gridVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
  });

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < groups.length) {
      const rowIndex = Math.floor(selectedIndex / columns);
      gridVirtualizer.scrollToIndex(rowIndex, {
        align: 'auto',
        behavior: 'auto',
      });
    }
  }, [selectedIndex, columns, groups.length, gridVirtualizer]);

  return (
    <div className="h-full w-full flex flex-col bg-[#14151a] border-l border-[#242731] select-none">
      {/* Top Header & Column Switcher */}
      <div className="h-9 px-2.5 bg-[#171821] border-b border-[#242731] flex items-center justify-between text-xs text-gray-300 shrink-0">
        <span className="font-medium text-[11px] text-gray-300 font-mono">
          宫格列表 ({groups.length})
        </span>

        <div className="flex items-center gap-1 bg-[#101116] p-0.5 rounded-lg border border-[#282b3a]">
          <button
            onClick={() => setColumns(3)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition ${
              columns === 3
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
            title="一行 3 张缩略图"
          >
            <Columns3 className="w-3 h-3" />
            <span>3列</span>
          </button>
          <button
            onClick={() => setColumns(4)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition ${
              columns === 4
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
            title="一行 4 张缩略图"
          >
            <Columns4 className="w-3 h-3" />
            <span>4列</span>
          </button>
        </div>
      </div>

      {/* Virtualized Grid List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
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
                className={`grid gap-1.5 pb-1.5 ${
                  columns === 3 ? 'grid-cols-3' : 'grid-cols-4'
                }`}
              >
                {rowGroups.map((group, colIdx) => {
                  const itemIndex = virtualRow.index * columns + colIdx;
                  const isSelected = itemIndex === selectedIndex;
                  const isPinned = pinnedId === group.id;

                  return (
                    <GridPhotoCell
                      key={group.id}
                      group={group}
                      index={itemIndex}
                      columns={columns}
                      isSelected={isSelected}
                      isPinned={isPinned}
                      onSelect={() => onSelect(itemIndex)}
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

interface GridPhotoCellProps {
  group: PhotoGroupInfo;
  index: number;
  columns: 3 | 4;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: () => void;
}

const GridPhotoCell: React.FC<GridPhotoCellProps> = ({
  group,
  index,
  columns,
  isSelected,
  isPinned,
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

  const flagBorder =
    group.flag === 'pick'
      ? 'border-emerald-500/70 bg-emerald-950/20'
      : group.flag === 'reject'
      ? 'border-rose-500/60 bg-rose-950/20'
      : 'border-[#262936]';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative rounded-lg flex flex-col overflow-hidden cursor-pointer transition-[border-color,box-shadow,transform] border text-left bg-[#181922] hover:bg-[#20222e] ${
        isPinned
          ? 'border-amber-400 ring-2 ring-inset ring-amber-400/60 shadow-lg'
          : isSelected
          ? 'border-blue-500 ring-2 ring-inset ring-blue-500/60 shadow-md'
          : `hover:border-[#3a3e52] ${flagBorder}`
      }`}
      style={{ height: columns === 3 ? '132px' : '110px' }}
    >
      {/* Thumbnail Container */}
      <div className="relative flex-1 bg-[#0a0b0e] overflow-hidden flex items-center justify-center p-0.5">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={group.baseName}
            style={{ imageOrientation: 'from-image' }}
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="text-[10px] text-gray-500 font-mono">加载中</div>
        )}

        {/* Top-Right Index */}
        <div className="absolute top-1 right-1 bg-black/75 backdrop-blur px-1 py-0.2 rounded text-[9px] font-mono text-gray-300 tabular-nums">
          #{index + 1}
        </div>

        {/* Top-Left: Pick/Reject Badge or Pinned Reference */}
        {isPinned ? (
          <div className="absolute top-1 left-1 bg-amber-500 text-black rounded px-1 py-0.2 shadow flex items-center gap-0.5 text-[9px] font-medium">
            <Pin className="w-2.5 h-2.5 fill-black" />
            <span>基准</span>
          </div>
        ) : group.flag === 'pick' ? (
          <div className="absolute top-1 left-1 bg-emerald-600 text-white rounded p-0.5 shadow">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        ) : group.flag === 'reject' ? (
          <div className="absolute top-1 left-1 bg-rose-600 text-white rounded p-0.5 shadow">
            <X className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        ) : null}

        {/* Bottom-Right Rating */}
        {group.rating > 0 && (
          <div className="absolute bottom-1 right-1 bg-black/85 backdrop-blur px-1 py-0.2 rounded flex items-center text-[10px] text-amber-300 font-bold gap-0.5 tabular-nums border border-white/10">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{group.rating}</span>
          </div>
        )}
      </div>

      {/* Bottom Minimal File Stem & Badges */}
      <div className="px-1.5 py-1 bg-[#13141a] border-t border-[#232532] flex items-center justify-between text-[10px] font-mono shrink-0">
        <span className="text-gray-300 truncate max-w-[70%]" title={group.baseName}>
          {group.baseName}
        </span>
        <div className="flex items-center gap-0.5">
          {group.raw && (
            <span className="text-[9px] text-blue-400 font-medium">R</span>
          )}
          {group.hasXmp && (
            <span className="text-[9px] text-amber-400 font-medium" title="包含 XMP">X</span>
          )}
        </div>
      </div>
    </div>
  );
};

