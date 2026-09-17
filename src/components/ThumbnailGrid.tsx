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
    <div className="h-full w-full flex flex-col bg-background-base border-l border-white/10 select-none">
      {/* Top Header & Column Switcher */}
      <div className="h-9 px-2.5 bg-background-base border-b border-white/10 flex items-center justify-between text-xs text-white/80 shrink-0">
        <span className="font-medium text-[11px] text-white/80 font-mono">
          宫格列表 ({groups.length})
        </span>

        <div className="flex items-center gap-1 bg-background-base p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setColumns(3)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition ${
              columns === 3
                ? 'bg-white text-black font-medium font-medium shadow-sm'
                : 'text-white/60 hover:text-white'
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
                ? 'bg-white text-black font-medium font-medium shadow-sm'
                : 'text-white/60 hover:text-white'
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
      ? 'border-emerald-500/40'
      : group.flag === 'reject'
      ? 'border-rose-500/40'
      : 'border-white/10';

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
      className={`relative rounded-lg flex flex-col overflow-hidden cursor-pointer transition-[border-color,transform] border text-left bg-white/5 hover:bg-white/10 ${
        isPinned
          ? 'border-white/90 ring-1 ring-inset ring-white/90'
          : isSelected
          ? 'border-white/60 ring-1 ring-inset ring-white/60'
          : `hover:border-white/30 ${flagBorder}`
      }`}
      style={{ height: columns === 3 ? '132px' : '110px' }}
    >
      {/* Thumbnail Container */}
      <div className="relative flex-1 bg-background-base overflow-hidden flex items-center justify-center p-0.5">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={group.baseName}
            style={{ imageOrientation: 'from-image' }}
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="text-[10px] text-white/40 font-mono">加载中</div>
        )}

        {/* Top-Right Index */}
        <div className="absolute top-1 right-1 bg-background-base/75 backdrop-blur px-1 py-0.2 rounded text-[9px] font-mono text-white/80 tabular-nums">
          #{index + 1}
        </div>

        {/* Top-Left: Pick/Reject Badge or Pinned Reference */}
        {isPinned ? (
          <div className="absolute top-1 left-1 bg-white text-black rounded px-1 py-0.2 flex items-center gap-0.5 text-[9px] font-medium">
            <Pin className="w-2.5 h-2.5 fill-black" />
            <span>基准</span>
          </div>
        ) : group.flag === 'pick' ? (
          <div className="absolute top-1 left-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 rounded p-0.5">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        ) : group.flag === 'reject' ? (
          <div className="absolute top-1 left-1 bg-rose-500/15 border border-rose-500/30 text-rose-500 rounded p-0.5">
            <X className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        ) : null}

        {/* Bottom-Right Rating */}
        {group.rating > 0 && (
          <div className="absolute bottom-1 right-1 bg-background-base/85 backdrop-blur px-1 py-0.2 rounded flex items-center text-[10px] text-amber-300 font-medium gap-0.5 tabular-nums border border-white/10">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{group.rating}</span>
          </div>
        )}
      </div>

      {/* Bottom Minimal File Stem & Badges */}
      <div className="px-1.5 py-1 bg-background-base border-t border-white/10 flex items-center justify-between text-[10px] font-mono shrink-0">
        <span className="text-white/80 truncate max-w-[70%]" title={group.baseName}>
          {group.baseName}
        </span>
        <div className="flex items-center gap-0.5">
          {group.raw && (
            <span className="text-[9px] text-white font-medium" title="RAW 原片">R</span>
          )}
          {group.hasXmp && (
            <span className="text-[9px] text-amber-400 font-medium" title="包含 XMP 调色/标记">X</span>
          )}
          {group.tone && (
            <span className="text-[9px] text-emerald-400 font-medium" title="已调色">T</span>
          )}
          {group.edited && (
            <span className="text-[9px] text-purple-400 font-medium" title="包含精修成果 (Luminar AI)">E</span>
          )}
        </div>
      </div>
    </div>
  );
};

