import { useState, useEffect, useMemo, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { TopBar } from './components/TopBar';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { PreviewViewport } from './components/PreviewViewport';
import { BeforeAfterViewport } from './components/BeforeAfterViewport';
import { SplitCompareViewport } from './components/SplitCompareViewport';
import { TonalAdjuster } from './components/TonalAdjuster';
import { BottomBar } from './components/BottomBar';
import { BatchExportModal } from './components/BatchExportModal';
import { SettingsModal } from './components/SettingsModal';
import { MetadataEditorModal } from './components/MetadataEditorModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  AppSettings,
  FilterMode,
  PhotoFileInfo,
  PhotoGroupInfo,
  SortOrder,
  ViewMode,
  ToneAdjustments,
} from './types';
import { api } from './services/api';
import { computeAutoTone, DEFAULT_TONE } from './utils/autoTone';

export default function App() {
  const [jpgFolder, setJpgFolder] = useState('');
  const [rawFolder, setRawFolder] = useState('');
  const [groups, setGroups] = useState<PhotoGroupInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [compareIndex, setCompareIndex] = useState<number>(1);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [isPinnedOnLeft, setIsPinnedOnLeft] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('time_filename');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Tonal & Luminar state
  const [toneMap, setToneMap] = useState<Record<string, ToneAdjustments>>({});
  const [showTonalPanel, setShowTonalPanel] = useState(false);
  const [isLuminarRunning, setIsLuminarRunning] = useState(false);
  const [isHoldOriginal, setIsHoldOriginal] = useState(false);

  // Load initial settings and default paths on startup
  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      if (s.defaultJpgFolder) setJpgFolder(s.defaultJpgFolder);
      if (s.defaultRawFolder) setRawFolder(s.defaultRawFolder);
      if (s.sortOrder) setSortOrder(s.sortOrder as SortOrder);
    });

    // Check for updates
    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          const yes = window.confirm(`🎉 发现新版本 ${update.version}！\n\n更新日志：\n${update.body || '修复已知问题，优化体验。'}\n\n是否立即下载并升级？`);
          if (yes) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    };
    // small delay to not block initial render
    setTimeout(checkForUpdates, 1000);
  }, []);

  // Filtered list of groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      switch (filterMode) {
        case 'pick':
          return g.flag === 'pick';
        case 'reject':
          return g.flag === 'reject';
        case 'unmarked':
          return g.flag === 'none' && g.rating === 0;
        case 'star3':
          return g.rating >= 3;
        case 'star5':
          return g.rating === 5;
        case 'all':
        default:
          return true;
      }
    });
  }, [groups, filterMode]);

  const currentGroup = filteredGroups[selectedIndex] || undefined;

  // Compute compare groups based on pinned reference
  const { leftCompareGroup, rightCompareGroup, isLeftPinned, isRightPinned } = useMemo(() => {
    const leftBase = filteredGroups[selectedIndex];
    const rightDefault =
      filteredGroups[compareIndex] ||
      filteredGroups[selectedIndex + 1] ||
      filteredGroups[0];

    if (!pinnedId) {
      return {
        leftCompareGroup: leftBase,
        rightCompareGroup: rightDefault,
        isLeftPinned: false,
        isRightPinned: false,
      };
    }

    const pinnedGroup = filteredGroups.find((g) => g.id === pinnedId) || leftBase;

    if (isPinnedOnLeft) {
      return {
        leftCompareGroup: pinnedGroup,
        rightCompareGroup: filteredGroups[compareIndex] || rightDefault,
        isLeftPinned: true,
        isRightPinned: false,
      };
    } else {
      return {
        leftCompareGroup: filteredGroups[selectedIndex] || leftBase,
        rightCompareGroup: pinnedGroup,
        isLeftPinned: false,
        isRightPinned: true,
      };
    }
  }, [filteredGroups, selectedIndex, compareIndex, pinnedId, isPinnedOnLeft]);

  // Pin / Unpin Left as Reference
  const handleTogglePinLeft = useCallback(() => {
    if (isLeftPinned) {
      setPinnedId(null);
    } else if (leftCompareGroup) {
      setPinnedId(leftCompareGroup.id);
      setIsPinnedOnLeft(true);
    }
  }, [isLeftPinned, leftCompareGroup]);

  // Pin / Unpin Right as Reference
  const handleTogglePinRight = useCallback(() => {
    if (isRightPinned) {
      setPinnedId(null);
    } else if (rightCompareGroup) {
      setPinnedId(rightCompareGroup.id);
      setIsPinnedOnLeft(false);
    }
  }, [isRightPinned, rightCompareGroup]);

  // Swap A / B (Candidate becomes new pinned benchmark or swap positions)
  const handleSwapCompare = useCallback(() => {
    if (pinnedId) {
      if (isPinnedOnLeft && rightCompareGroup) {
        setPinnedId(rightCompareGroup.id);
      } else if (!isPinnedOnLeft && leftCompareGroup) {
        setPinnedId(leftCompareGroup.id);
      }
    } else {
      const temp = selectedIndex;
      setSelectedIndex(compareIndex);
      setCompareIndex(temp);
    }
  }, [pinnedId, isPinnedOnLeft, leftCompareGroup, rightCompareGroup, selectedIndex, compareIndex]);

  // Benchmark toggle shortcut (B)
  const handleTogglePinBenchmark = useCallback(() => {
    if (pinnedId) {
      setPinnedId(null);
    } else if (leftCompareGroup) {
      setPinnedId(leftCompareGroup.id);
      setIsPinnedOnLeft(true);
    }
  }, [pinnedId, leftCompareGroup]);

  // Folder scanning handler
  const handleScan = useCallback(async () => {
    if (!jpgFolder.trim()) return;
    setIsLoading(true);

    try {
      const res = await api.scanFolders(jpgFolder, rawFolder, sortOrder);
      setGroups(res.groups);

      // Populate initial tones from XMP
      const initialTones: Record<string, ToneAdjustments> = {};
      res.groups.forEach((g) => {
        if (g.tone) initialTones[g.id] = g.tone;
      });
      setToneMap(initialTones);

      // Check session history for this folder
      const history = await api.loadSession(jpgFolder);
      if (history && history[0] < res.groups.length) {
        setSelectedIndex(history[0]);
        setCompareIndex(Math.min(history[0] + 1, res.groups.length - 1));
      } else {
        setSelectedIndex(0);
        setCompareIndex(res.groups.length > 1 ? 1 : 0);
      }

      // Save as default in settings
      if (settings) {
        api.saveSettings({
          ...settings,
          defaultJpgFolder: jpgFolder,
          defaultRawFolder: rawFolder,
          sortOrder,
        });
      }
    } catch (err) {
      alert(`扫描失败: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [jpgFolder, rawFolder, sortOrder, settings]);

  // Folder picker handlers
  const handleBrowseJpg = async () => {
    const selected = await api.selectFolderDialog(jpgFolder);
    if (selected) {
      setJpgFolder(selected);
    }
  };

  const handleBrowseRaw = async () => {
    const selected = await api.selectFolderDialog(rawFolder);
    if (selected) {
      setRawFolder(selected);
    }
  };

  // Selection navigation (aware of pinned compare mode)
  const handlePrev = useCallback(() => {
    if (viewMode === 'split' && pinnedId && isPinnedOnLeft) {
      setCompareIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  }, [viewMode, pinnedId, isPinnedOnLeft]);

  const handleNext = useCallback(() => {
    if (viewMode === 'split' && pinnedId && isPinnedOnLeft) {
      setCompareIndex((prev) =>
        prev < filteredGroups.length - 1 ? prev + 1 : prev,
      );
    } else {
      setSelectedIndex((prev) =>
        prev < filteredGroups.length - 1 ? prev + 1 : prev,
      );
    }
  }, [viewMode, pinnedId, isPinnedOnLeft, filteredGroups.length]);

  // Select photo from thumbnail list
  const handleSelectPhoto = useCallback(
    (idx: number) => {
      if (viewMode === 'split' && pinnedId && isPinnedOnLeft) {
        setCompareIndex(idx);
      } else {
        setSelectedIndex(idx);
        if (viewMode === 'split' && !pinnedId) {
          setCompareIndex(Math.min(idx + 1, filteredGroups.length - 1));
        }
      }
    },
    [viewMode, pinnedId, isPinnedOnLeft, filteredGroups.length],
  );

  // Update Rating & Flag (syncs to XMP)
  const handleRate = useCallback(
    async (rating: number, targetGroup: PhotoGroupInfo = currentGroup!) => {
      if (!targetGroup) return;
      const targetPath = targetGroup.raw?.path || targetGroup.jpg?.path;
      if (!targetPath) return;

      // Update in local state
      setGroups((prev) =>
        prev.map((g) => (g.id === targetGroup.id ? { ...g, rating } : g)),
      );

      // Sync to XMP in background
      try {
        await api.updateRatingFlag(targetPath, rating, targetGroup.flag, true);
      } catch (err) {
        console.error('XMP update error:', err);
      }
    },
    [currentGroup],
  );

  const handleFlag = useCallback(
    async (
      flag: 'pick' | 'reject' | 'none',
      targetGroup: PhotoGroupInfo = currentGroup!,
    ) => {
      if (!targetGroup) return;
      const targetPath = targetGroup.raw?.path || targetGroup.jpg?.path;
      if (!targetPath) return;

      setGroups((prev) =>
        prev.map((g) => (g.id === targetGroup.id ? { ...g, flag } : g)),
      );

      try {
        await api.updateRatingFlag(targetPath, targetGroup.rating, flag, true);
      } catch (err) {
        console.error('XMP update error:', err);
      }
    },
    [currentGroup],
  );

  // Open in Photoshop / External app
  const handleOpenExternal = useCallback(async () => {
    if (!currentGroup) return;
    const targetPath = currentGroup.raw?.path || currentGroup.jpg?.path;
    if (!targetPath) return;

    try {
      await api.openInPhotoshop(targetPath, settings?.photoshopPath);
    } catch (e) {
      console.warn('Photoshop failed, falling back to default:', e);
      await api.openInDefaultApp(targetPath);
    }
  }, [currentGroup, settings?.photoshopPath]);

  // View mode toggles
  const handleToggleCompare = useCallback(() => {
    setViewMode((m) => (m === 'split' ? 'single' : 'split'));
  }, []);

  const handleToggleBeforeAfter = useCallback(() => {
    setViewMode((m) => (m === 'before_after' ? 'single' : 'before_after'));
  }, []);

  const handleToggleTonalPanel = useCallback(() => {
    setShowTonalPanel((prev) => !prev);
  }, []);

  const handleHoldOriginalStart = useCallback(() => {
    setIsHoldOriginal(true);
  }, []);

  const handleHoldOriginalEnd = useCallback(() => {
    setIsHoldOriginal(false);
  }, []);

  // Tone adjustments state and handlers
  const currentTone = currentGroup
    ? toneMap[currentGroup.id] || currentGroup.tone || DEFAULT_TONE
    : undefined;

  const handleToneChange = useCallback(
    (newTone: ToneAdjustments) => {
      if (!currentGroup) return;
      setToneMap((prev) => ({ ...prev, [currentGroup.id]: newTone }));
      setGroups((prev) =>
        prev.map((g) => (g.id === currentGroup.id ? { ...g, tone: newTone } : g))
      );
    },
    [currentGroup],
  );

  const handleResetTone = useCallback(() => {
    if (!currentGroup) return;
    setToneMap((prev) => ({ ...prev, [currentGroup.id]: { ...DEFAULT_TONE } }));
    setGroups((prev) =>
      prev.map((g) =>
        g.id === currentGroup.id ? { ...g, tone: { ...DEFAULT_TONE } } : g
      )
    );
  }, [currentGroup]);

  const handleAutoTone = useCallback(() => {
    if (!currentGroup) return;
    const src = currentGroup.jpg?.path
      ? api.toAssetUrl(currentGroup.jpg.path)
      : currentGroup.raw?.path
      ? api.toAssetUrl(currentGroup.raw.path)
      : null;
    if (!src) return;

    const img = document.querySelector(
      `img[alt="${currentGroup.baseName}"]`
    ) as HTMLImageElement | null;
    if (img && img.complete && img.naturalWidth > 0) {
      const autoTone = computeAutoTone(img);
      handleToneChange(autoTone);
    } else {
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.onload = () => {
        const autoTone = computeAutoTone(tempImg);
        handleToneChange(autoTone);
      };
      tempImg.src = src;
    }
  }, [currentGroup, handleToneChange]);

  const handleSaveToneToXmp = useCallback(async () => {
    if (!currentGroup) return;
    const toneToSave = toneMap[currentGroup.id] || currentGroup.tone || DEFAULT_TONE;
    const targetPath = currentGroup.raw?.path || currentGroup.jpg?.path;
    if (!targetPath) return;

    try {
      await api.updateToneAdjustments(targetPath, toneToSave);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === currentGroup.id ? { ...g, hasXmp: true, tone: toneToSave } : g
        )
      );
      alert('调色参数已成功写入同名 .xmp 文件！\nPhotoshop / ACR 打开时将自动载入该调色效果。');
    } catch (err) {
      alert(`写入 XMP 失败: ${err}`);
    }
  }, [currentGroup, toneMap]);

  // Luminar AI Roundtrip Handler
  const handleOpenLuminar = useCallback(async () => {
    if (!currentGroup) return;
    const targetPath = currentGroup.raw?.path || currentGroup.jpg?.path;
    if (!targetPath) return;

    setIsLuminarRunning(true);
    try {
      const editedPath = await api.openInLuminarRoundtrip(targetPath);
      const ext = editedPath.split('.').pop() || 'tif';
      const editedInfo: PhotoFileInfo = {
        path: editedPath,
        name: editedPath.split(/[/\\]/).pop() || 'edited.tif',
        extension: ext,
        size: 0,
        mtime: Date.now() / 1000,
      };

      setGroups((prev) =>
        prev.map((g) => (g.id === currentGroup.id ? { ...g, edited: editedInfo } : g))
      );

      // Automatically switch to Before/After comparison view to review result!
      setViewMode('before_after');
    } catch (err) {
      alert(`调用 Luminar AI 失败或未完成: ${err}`);
    } finally {
      setIsLuminarRunning(false);
    }
  }, [currentGroup]);

  // Save session when index changes
  useEffect(() => {
    if (jpgFolder && selectedIndex >= 0) {
      api.saveSession(jpgFolder, rawFolder, selectedIndex, sortOrder);
    }
  }, [selectedIndex, jpgFolder, rawFolder, sortOrder]);

  // Metadata batch updated handler
  const handleMetadataUpdated = useCallback(
    (targetIds: string[], lensModel: string, focalLength: string, aperture: string) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (targetIds.includes(g.id)) {
            return {
              ...g,
              hasXmp: true,
              exif: {
                ...g.exif,
                lensModel: lensModel || g.exif?.lensModel,
                focalLength: focalLength || g.exif?.focalLength,
                aperture: aperture || g.exif?.aperture,
              },
            };
          }
          return g;
        }),
      );
    },
    [],
  );

  // Register single-handed keyboard shortcuts
  useKeyboardShortcuts({
    onPrev: handlePrev,
    onNext: handleNext,
    onRate: (r) => handleRate(r),
    onFlag: (f) => handleFlag(f),
    onOpenExternal: handleOpenExternal,
    onToggleCompare: handleToggleCompare,
    onSwapCompare: handleSwapCompare,
    onTogglePinReference: handleTogglePinBenchmark,
    onPinLeft: handleTogglePinLeft,
    onPinRight: handleTogglePinRight,
    onOpenMetadataModal: () => setIsMetadataOpen(true),
    onToggleBeforeAfter: handleToggleBeforeAfter,
    onToggleTonalPanel: handleToggleTonalPanel,
    onHoldOriginalStart: handleHoldOriginalStart,
    onHoldOriginalEnd: handleHoldOriginalEnd,
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0A0A0A] text-white overflow-hidden antialiased">
      {/* Top Controls Bar */}
      <TopBar
        jpgFolder={jpgFolder}
        rawFolder={rawFolder}
        onJpgFolderChange={setJpgFolder}
        onRawFolderChange={setRawFolder}
        onBrowseJpg={handleBrowseJpg}
        onBrowseRaw={handleBrowseRaw}
        onScan={handleScan}
        isLoading={isLoading}
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        sortOrder={sortOrder}
        onSortChange={(order) => {
          setSortOrder(order);
          // Auto re-scan or sort
          handleScan();
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenMetadataModal={() => setIsMetadataOpen(true)}
        onToggleTonalAdjuster={handleToggleTonalPanel}
        showTonalPanel={showTonalPanel}
        onOpenLuminar={handleOpenLuminar}
        isLuminarRunning={isLuminarRunning}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Viewport */}
        {viewMode === 'single' && (
          <PreviewViewport
            group={currentGroup}
            tone={currentTone}
            isHoldOriginal={isHoldOriginal}
            onPrev={handlePrev}
            onNext={handleNext}
            onRate={(r) => handleRate(r)}
            onFlag={(f) => handleFlag(f)}
            onOpenExternal={handleOpenExternal}
            onOpenLuminar={handleOpenLuminar}
            onToggleTonalAdjuster={handleToggleTonalPanel}
            isLuminarRunning={isLuminarRunning}
            onBrowseJpg={handleBrowseJpg}
          />
        )}

        {viewMode === 'before_after' && (
          <BeforeAfterViewport
            group={currentGroup}
            tone={currentTone}
            isHoldOriginal={isHoldOriginal}
            onPrev={handlePrev}
            onNext={handleNext}
            onRate={(r) => handleRate(r)}
            onFlag={(f) => handleFlag(f)}
            onOpenLuminar={handleOpenLuminar}
            onToggleTonalAdjuster={handleToggleTonalPanel}
            isLuminarRunning={isLuminarRunning}
          />
        )}

        {viewMode === 'split' && (
          <SplitCompareViewport
            leftGroup={leftCompareGroup}
            rightGroup={rightCompareGroup}
            isLeftPinned={isLeftPinned}
            isRightPinned={isRightPinned}
            onTogglePinLeft={handleTogglePinLeft}
            onTogglePinRight={handleTogglePinRight}
            onSwap={handleSwapCompare}
            onRate={(g, r) => handleRate(r, g)}
            onFlag={(g, f) => handleFlag(f, g)}
            onSelectLeft={() => {}}
            onSelectRight={() => {
              if (compareIndex >= 0 && compareIndex < filteredGroups.length) {
                setSelectedIndex(compareIndex);
              }
            }}
          />
        )}
        {/* Right Sidebar (Thumbnail Grid OR Tonal Adjuster) */}
        <div className="w-[390px] h-full shrink-0 bg-[#0A0A0A]">
          {showTonalPanel && currentGroup ? (
            <TonalAdjuster
              tone={currentTone || DEFAULT_TONE}
              onChange={handleToneChange}
              onReset={handleResetTone}
              onAuto={handleAutoTone}
              onSaveXmp={handleSaveToneToXmp}
              onClose={() => setShowTonalPanel(false)}
            />
          ) : (
            <ThumbnailGrid
              groups={filteredGroups}
              selectedIndex={selectedIndex}
              pinnedId={pinnedId}
              onSelect={handleSelectPhoto}
            />
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <BottomBar
        currentGroup={currentGroup}
        currentIndex={selectedIndex}
        totalCount={filteredGroups.length}
        onOpenExternal={handleOpenExternal}
        onOpenMetadataModal={() => setIsMetadataOpen(true)}
      />

      {/* Batch Export Modal */}
      <BatchExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        groups={groups}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={(s) => setSettings(s)}
      />

      {/* Manual Lens Metadata Editor Modal */}
      <MetadataEditorModal
        isOpen={isMetadataOpen}
        onClose={() => setIsMetadataOpen(false)}
        currentGroup={currentGroup}
        filteredGroups={filteredGroups}
        allGroups={groups}
        onMetadataUpdated={handleMetadataUpdated}
      />
    </div>
  );
}
