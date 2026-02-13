'use client';

interface RecordButtonProps {
  isRecording: boolean;
  duration: number;
  isProcessing?: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function RecordButton({
  isRecording,
  duration,
  isProcessing = false,
  onStart,
  onStop,
  disabled = false,
}: RecordButtonProps) {
  const handleClick = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  // Processing state
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center space-y-3">
        <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center shadow-warm">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <span className="text-sm text-muted-foreground">Transcribing your thoughts...</span>
      </div>
    );
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleClick}
          className="relative w-24 h-24 rounded-full bg-primary hover:bg-primary/90 transition-all duration-300 shadow-warm-lg"
        >
          <span className="absolute inset-0 rounded-full bg-primary animate-pulse opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-lg shadow-sm" />
          </div>
        </button>
        <div className="text-center space-y-1">
          <span className="text-sm font-medium text-primary">Recording</span>
          <span className="text-lg font-mono text-foreground block">{formatDuration(duration)}</span>
        </div>
      </div>
    );
  }

  // Ready state
  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center ${
          disabled
            ? 'bg-muted border-2 border-border cursor-not-allowed'
            : 'bg-primary hover:bg-accent hover:shadow-warm-xl hover:scale-105 shadow-warm-lg'
        }`}
      >
        <svg 
          className="w-10 h-10 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" 
          />
        </svg>
      </button>
      <span className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
        {disabled ? 'Getting your question...' : 'Tap to record'}
      </span>
    </div>
  );
}
