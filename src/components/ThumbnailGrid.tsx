import React, { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Star, Check, X, FileEdit } from 'lucide-react';
import { PhotoGroupInfo } from '../types';
import { api } from '../services/api';

interface ThumbnailGridProps {
  groups: PhotoGroupInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isSidebar?: boolean;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  groups,
  selectedIndex,
  onSelect,
  isSidebar = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isSidebar ? 105 : 190),
    overscan: 5,
  });

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < groups.length) {
      virtualizer.scrollToIndex(selectedIndex, {
        align: 'auto',
        behavior: 'auto',
      });
    }
  }, [selectedIndex, groups.length, virtualizer]);

  return (
    <div
      ref={parentRef}
      className={`h-full w-full overflow-y-auto bg-[#14151a] p-2 select-none ${
        isSidebar ? 'border-l border-[#242731]' : ''
      }`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
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
