import React from 'react';
import { PhotoGroupInfo } from '../types';
import { ExternalLink, HardDrive } from 'lucide-react';

interface BottomBarProps {
  currentGroup?: PhotoGroupInfo;
  currentIndex: number;
  totalCount: number;
  onOpenExternal: () => void;
  onOpenMetadataModal?: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  currentGroup,
  currentIndex,
  totalCount,
  onOpenExternal,
  onOpenMetadataModal,
}) => {
  return (
    <footer className="h-9 bg-[#0A0A0A] border-t border-white/10 flex items-center justify-between px-3 text-[11px] text-white/60 shrink-0">
      {/* Left: Current File Info (Selectable text) */}
      <div className="flex items-center gap-3 select-text">
        {currentGroup ? (
          <>
            <div className="flex items-center gap-1.5 font-mono text-white">
              <span className="font-semibold">{currentGroup.baseName}</span>
              <span className="text-white/40">
                ({currentGroup.status === 'COMPLETE' ? 'JPG + RAW' : currentGroup.status})
              </span>
            </div>

            {currentGroup.raw && (
              <span className="text-white/60 font-mono tabular-nums">
                RAW: {(currentGroup.raw.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
            {currentGroup.jpg && (
              <span className="text-white/60 font-mono tabular-nums">
                JPG: {(currentGroup.jpg.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </>
        ) : (
          <span>未加载照片</span>
        )}
      </div>

      {/* Center: Keyboard Cheat Sheet */}
      <div className="hidden md:flex items-center gap-2 text-white/60 select-none">
        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80">1~5</span>
        <span>打分</span>
        <span className="text-white/20">|</span>
        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80">P</span>
        <span className="text-emerald-400 font-medium">保留</span>
        <span className="text-white/20">|</span>
        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80">X</span>
        <span className="text-rose-400 font-medium">淘汰</span>
        <span className="text-white/20">|</span>
        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80">A/D</span>
        <span>切片</span>
        <span className="text-white/20">|</span>
        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80">C</span>
        <span>对比</span>
        <span className="text-white/20">|</span>
        <button
          onClick={onOpenMetadataModal}
          className="flex items-center gap-1 hover:text-white transition"
          title="点击打开手动镜头与元数据编辑 (快捷键 M)"
        >
          <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300">M</span>
          <span className="text-amber-300">镜头元数据</span>
        </button>
      </div>

      {/* Right: Counter & Quick Open */}
      <div className="flex items-center gap-3 select-none">
        <div className="flex items-center gap-1 font-mono text-white/80 tabular-nums">
          <HardDrive className="w-3.5 h-3.5 text-white/40" aria-hidden="true" />
          <span>
            {totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '0 / 0'}
          </span>
        </div>

        <button
          onClick={onOpenExternal}
          disabled={!currentGroup}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-white/90 text-black active:scale-[0.96] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed rounded-md font-medium transition-transform shadow-sm"
          aria-label="在修图或外部程序中打开"
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="pb-[1px]">打开</span>
        </button>
      </div>
    </footer>
  );
};
