'use client';

interface SessionControlsProps {
  onSkip: () => void;
  onEnd: () => void;
  disabled?: boolean;
}

export default function SessionControls({
  onSkip,
  onEnd,
  disabled = false,
}: SessionControlsProps) {
  return (
    <div className="flex items-center justify-center space-x-8">
      <button
        onClick={onSkip}
        disabled={disabled}
        className={`text-sm font-medium transition-all duration-200 ${
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          Skip
        </span>
      </button>

      <div className="h-4 w-px bg-border" />

      <button
        onClick={onEnd}
        disabled={disabled}
        className={`text-sm font-medium transition-all duration-200 ${
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-destructive hover:text-destructive/80'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          End
        </span>
      </button>
    </div>
  );
}
