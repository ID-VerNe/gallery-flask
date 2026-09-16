import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onPrev: () => void;
  onNext: () => void;
  onRate: (rating: number) => void;
  onFlag: (flag: 'pick' | 'reject' | 'none') => void;
  onOpenExternal: () => void;
  onToggleCompare: () => void;
  onSwapCompare?: () => void;
  onTogglePinReference?: () => void;
  onPinLeft?: () => void;
  onPinRight?: () => void;
  onOpenMetadataModal?: () => void;
}

export function useKeyboardShortcuts({
  onPrev,
  onNext,
  onRate,
  onFlag,
  onOpenExternal,
  onToggleCompare,
  onSwapCompare,
  onTogglePinReference,
  onPinLeft,
  onPinRight,
  onOpenMetadataModal,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if user is focusing an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        // Navigation
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          onPrev();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          onNext();
          break;

        // Rating: 1 to 5
        case '1':
          e.preventDefault();
          onRate(1);
          break;
        case '2':
          e.preventDefault();
          onRate(2);
          break;
        case '3':
          e.preventDefault();
          onRate(3);
          break;
        case '4':
          e.preventDefault();
          onRate(4);
          break;
        case '5':
          e.preventDefault();
          onRate(5);
          break;
        case '0':
        case 'u':
        case 'U':
          e.preventDefault();
          onRate(0);
          onFlag('none');
          break;

        // Pick / Reject
        case 'p':
        case 'P':
          e.preventDefault();
          onFlag('pick');
          break;
        case 'x':
        case 'X':
          e.preventDefault();
          onFlag('reject');
          break;

        // Open in Photoshop / External app
        case 'o':
        case 'O':
          e.preventDefault();
          onOpenExternal();
          break;

        // View mode toggles
        case 'c':
        case 'C':
          e.preventDefault();
          onToggleCompare();
          break;

        // Compare Swap (S)
        case 's':
        case 'S':
          if (onSwapCompare) {
            e.preventDefault();
            onSwapCompare();
          }
          break;

        // Pin Reference (B - Benchmark/Base)
        case 'b':
        case 'B':
          if (onTogglePinReference) {
            e.preventDefault();
            onTogglePinReference();
          }
          break;

        // Pin Left as Baseline ([)
        case '[':
          if (onPinLeft) {
            e.preventDefault();
            onPinLeft();
          }
          break;

        // Pin Right as Baseline (]) or Space
        case ']':
          if (onPinRight) {
            e.preventDefault();
            onPinRight();
          }
          break;

        case ' ':
          if (onPinRight) {
            e.preventDefault();
            onPinRight();
          }
          break;

        // Metadata Editor (M)
        case 'm':
        case 'M':
          if (onOpenMetadataModal) {
            e.preventDefault();
            onOpenMetadataModal();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onPrev,
    onNext,
    onRate,
    onFlag,
    onOpenExternal,
    onToggleCompare,
    onSwapCompare,
    onTogglePinReference,
    onPinLeft,
    onPinRight,
    onOpenMetadataModal,
  ]);
}
