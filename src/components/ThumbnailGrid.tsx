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
      ? 'border-green-500/80'
      : group.flag === 'reject'
      ? 'border-red-500/80 opacity-40'
      : 'border-transparent';

  return (
    <div
      onClick={onSelect}
      className={`h-full w-full rounded flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all border ${
        isSelected
          ? 'bg-[#222531] border-blue-500 shadow-md ring-1 ring-blue-500/50'
          : `bg-[#191a21] hover:bg-[#20222c] ${flagColor}`
      }`}
    >
      {/* Thumbnail Image */}
      <div className="relative w-20 h-20 shrink-0 bg-[#0d0e12] rounded overflow-hidden flex items-center justify-center">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={group.baseName}
            className="w-full h-full object-contain pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="text-[10px] text-gray-500">加载中...</div>
        )}

        {/* Flag Icon overlay */}
        {group.flag === 'pick' && (
          <div className="absolute top-1 left-1 bg-green-600 text-white rounded p-0.5 shadow">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}
        {group.flag === 'reject' && (
          <div className="absolute top-1 left-1 bg-red-600 text-white rounded p-0.5 shadow">
            <X className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}

        {/* Rating Stars badge */}
        {group.rating > 0 && (
          <div className="absolute bottom-0.5 right-0.5 bg-black/75 px-1 py-0.5 rounded flex items-center text-[10px] text-yellow-400 font-bold gap-0.5">
            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
            <span>{group.rating}</span>
          </div>
        )}
      </div>

      {/* Info labels */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
        <div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-mono text-gray-200 truncate" title={group.baseName}>
              {group.baseName}
            </span>
            <span className="text-[10px] text-gray-500 shrink-0 font-mono">#{index + 1}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1 mt-1">
            {group.raw && (
              <span className="px-1 py-0.2 bg-blue-900/60 text-blue-300 text-[9px] font-mono rounded">
                {group.raw.extension.toUpperCase()}
              </span>
            )}
            {group.hasXmp && (
              <span
                className="flex items-center gap-0.5 px-1 py-0.2 bg-amber-900/50 text-amber-300 text-[9px] rounded"
                title="已编辑 (存在 XMP/ACR)"
              >
                <FileEdit className="w-2.5 h-2.5" />
                <span>XMP</span>
              </span>
            )}
          </div>
        </div>

        {/* Shutter / Aperture / ISO preview */}
        {group.exif && (
          <div className="text-[10px] text-gray-400 truncate font-mono">
            {[group.exif.aperture, group.exif.shutterSpeed, group.exif.iso ? `ISO${group.exif.iso}` : null]
              .filter(Boolean)
              .join(' ')}
          </div>
        )}
      </div>
    </div>
  );
};
