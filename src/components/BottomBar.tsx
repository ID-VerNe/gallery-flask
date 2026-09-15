import React from 'react';
import { PhotoGroupInfo } from '../types';
import { ExternalLink, HardDrive } from 'lucide-react';

interface BottomBarProps {
  currentGroup?: PhotoGroupInfo;
  currentIndex: number;
  totalCount: number;
  onOpenExternal: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  currentGroup,
  currentIndex,
  totalCount,
  onOpenExternal,
}) => {
  return (
    <footer className="h-9 bg-[#18191e] border-t border-[#292c37] flex items-center justify-between px-3 text-[11px] text-gray-400 select-none shrink-0">
      {/* Left: Current File Info */}
      <div className="flex items-center gap-3">
        {currentGroup ? (
          <>
            <div className="flex items-center gap-1.5 font-mono text-gray-200">
              <span className="font-semibold">{currentGroup.baseName}</span>
              <span className="text-gray-500">
                ({currentGroup.status === 'COMPLETE' ? 'JPG + RAW' : currentGroup.status})
              </span>
            </div>

            {currentGroup.raw && (
              <span className="text-gray-500 font-mono">
                RAW: {(currentGroup.raw.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
            {currentGroup.jpg && (
              <span className="text-gray-500 font-mono">
                JPG: {(currentGroup.jpg.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </>
        ) : (
          <span>未加载照片</span>
        )}
      </div>

      {/* Center: Keyboard Cheat Sheet */}
      <div className="hidden md:flex items-center gap-2 text-gray-400">
        <span className="bg-[#242733] px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">1~5</span>
        <span>打分</span>
        <span className="text-gray-600">|</span>
        <span className="bg-[#242733] px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">P</span>
        <span className="text-green-400">保留</span>
        <span className="text-gray-600">|</span>
        <span className="bg-[#242733] px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">X</span>
        <span className="text-red-400">淘汰</span>
        <span className="text-gray-600">|</span>
        <span className="bg-[#242733] px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">A/D</span>
        <span>切片</span>
        <span className="text-gray-600">|</span>
        <span className="bg-[#242733] px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">O</span>
        <span>打开</span>
        <span className="text-gray-600">|</span>
        <span className="bg-[#242733] px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">C</span>
        <span>对比</span>
      </div>

      {/* Right: Counter & Quick Open */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 font-mono text-gray-300">
          <HardDrive className="w-3.5 h-3.5 text-gray-500" />
          <span>
            {totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '0 / 0'}
          </span>
        </div>

        <button
          onClick={onOpenExternal}
          disabled={!currentGroup}
          className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-[11px] font-medium transition"
        >
          <ExternalLink className="w-3 h-3" />
          <span>打开</span>
        </button>
      </div>
    </footer>
  );
};
