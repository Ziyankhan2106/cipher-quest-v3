import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AudioContextType {
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  setIsGameActive: (active: boolean) => void;
}

const AudioCtx = createContext<AudioContextType>({
  volume: 0.5,
  setVolume: () => {},
  isMuted: false,
  setIsMuted: () => {},
  setIsGameActive: () => {},
});

export const useAudio = () => useContext(AudioCtx);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('cq_volume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [isMuted, setIsMutedState] = useState(() => {
    return localStorage.getItem('cq_muted') === 'true';
  });
  const [isGameActive, setIsGameActive] = useState(false);

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem('cq_volume', v.toString());
  };

  const setIsMuted = (m: boolean) => {
    setIsMutedState(m);
    localStorage.setItem('cq_muted', m.toString());
  };
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
      audioRef.current.volume = (isMuted || isGameActive) ? 0 : Math.max(0, Math.min(1, volume));
    }
  }, [volume, isMuted, isGameActive]);

  return (
    <AudioCtx.Provider value={{ volume, setVolume, isMuted, setIsMuted, setIsGameActive }}>
      {children}
    </AudioCtx.Provider>
  );
};
