'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTTSPlayerReturn {
  isPlaying: boolean;
  isSupported: boolean;
  play: (audioBlob: Blob) => void;
  stop: () => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export function useTTSPlayer(): UseTTSPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
  }, []);

  const play = useCallback((audioBlob: Blob) => {
    if (!enabled) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    currentUrlRef.current = audioUrl;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.preload = 'auto';
    audio.playbackRate = 0.92;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    };
    audio.onerror = () => {
      console.error('Error playing TTS audio');
      setIsPlaying(false);
    };

    audio.play().catch((error) => {
      console.error('Failed to play TTS audio:', error);
      setIsPlaying(false);
    });
  }, [enabled]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  }, []);

  return {
    isPlaying,
    isSupported,
    play,
    stop,
    enabled,
    setEnabled,
  };
}

export default useTTSPlayer;
