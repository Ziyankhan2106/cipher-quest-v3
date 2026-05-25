import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AudioContextType {
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
}

const AudioCtx = createContext<AudioContextType>({
  volume: 0.5,
  setVolume: () => {},
  isMuted: false,
  setIsMuted: () => {},
});

export const useAudio = () => useContext(AudioCtx);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/assets/background_music.mp3');
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {});
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('keydown', tryPlay);
    };

    audio.play().catch(() => {
      document.addEventListener('click', tryPlay);
      document.addEventListener('keydown', tryPlay);
    });

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    }
  }, [volume, isMuted]);

  return (
    <AudioCtx.Provider value={{ volume, setVolume, isMuted, setIsMuted }}>
      {children}
    </AudioCtx.Provider>
  );
};
