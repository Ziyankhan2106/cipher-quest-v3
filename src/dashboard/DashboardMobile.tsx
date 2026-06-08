import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, Volume2, VolumeX, Plus, Minus, LogOut, Target, FlaskConical, Globe, Crosshair } from 'lucide-react';
import { CHAPTERS } from '../story_mode/lib/game-data';

const RANK_NAMES: Record<number, string> = {
  1: 'RECRUIT', 2: 'GUARD', 3: 'SCOUT', 4: 'SOLDIER',
  5: 'VETERAN', 6: 'ELITE', 7: 'CAPTAIN', 8: 'HERO',
};

const TILES = [
  { id: 0, name: 'Story Mode',  path: '/story',      desc: 'Campaign',   icon: <Target className="w-5 h-5" /> },
  { id: 1, name: 'Cipher Lab',  path: '/cipherlab',  desc: 'Training',   icon: <FlaskConical className="w-5 h-5" /> },
  { id: 2, name: 'Multiplayer', path: '/multiplayer', desc: 'Warzone',    icon: <Globe className="w-5 h-5" /> },
  { id: 3, name: 'Training',    path: '/training',   desc: 'Academy',    icon: <Crosshair className="w-5 h-5" /> },
];

const DashboardMobile = () => {
  const { user, logout, refreshUser } = useAuth();
  const { volume, setVolume, isMuted, setIsMuted } = useAudio();
  const navigate = useNavigate();

  const level    = user?.level    || 1;
  const xp       = user?.xp       || 0;
  const username = user?.username || 'WOLFY';
  const rankName = RANK_NAMES[level] || 'RECRUIT';

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allSectorsFinished, setAllSectorsFinished] = useState(false);

  useEffect(() => {
    refreshUser();
    if (user) {
      fetch('/api/story/profile').then(r => r.json()).then(data => {
        const completedMissions = new Set(data.storyData?.completedMissions || []);
        const totalMissions = CHAPTERS.reduce((acc, chap) => acc + chap.missions.length, 0);
        if (totalMissions > 0 && completedMissions.size >= totalMissions) {
          setAllSectorsFinished(true);
        }
      }).catch(() => {});
    }
  }, [user]);

  const navigate_ = (path: string) => {
    if (path === '/training') window.location.href = '/training/';
    else navigate(path);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#020205] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src="/assets/cyborg_bg.png" alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060f] via-[#04060f]/80 to-[#04060f]/60" />
      </div>

      <div className="relative z-10 flex flex-col min-h-[100dvh] p-4">
        {/* Header */}
        <div className="flex justify-between items-center bg-[#0a0a0f]/80 border border-[#00f2ff]/30 p-4 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(0,242,255,0.1)] mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-white m-0 uppercase font-mono">
              CIPHER<span className="text-[#00f2ff]">Q.</span>
            </h1>
            <p className="font-mono text-xs text-[#b400ff] uppercase tracking-widest mt-1">{username}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[#00f2ff] font-bold text-sm tracking-widest">{rankName}</span>
              <span className="text-white/50 text-xs font-mono">LV.{level}</span>
            </div>
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="p-2 border border-white/20 rounded-md bg-white/5">
              <Settings className="text-[#00f2ff]" size={20} />
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#0a0a0f] border border-[#00f2ff]/30 rounded-xl mb-6 p-4 overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-xs font-mono uppercase text-[#00f2ff]">
                  <span>Audio Level</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setVolume(Math.max(0, volume - 0.1))} className="p-2 bg-white/5 rounded border border-white/10"><Minus size={16}/></button>
                   <button onClick={() => setVolume(Math.min(1, volume + 0.1))} className="p-2 bg-white/5 rounded border border-white/10 flex-1 flex justify-center"><Plus size={16}/></button>
                </div>
                <button onClick={() => setIsMuted(!isMuted)} className="py-2 flex justify-center items-center gap-2 border border-white/10 bg-white/5 rounded text-xs font-mono uppercase">
                  {isMuted ? <VolumeX size={16} className="text-red-500" /> : <Volume2 size={16} className="text-[#00f2ff]" />}
                  {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
                </button>
                <div className="h-[1px] bg-white/10 my-1" />
                <button onClick={logout} className="py-2 flex justify-center items-center gap-2 border border-red-500/30 bg-red-500/10 text-red-500 rounded text-xs font-mono uppercase">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="flex-1 flex flex-col gap-4 mt-2">
          
          {/* Robu Feature */}
          <div className="relative w-full flex justify-center mb-6 mt-4">
            <div className="absolute inset-0 bg-[#00f2ff]/5 rounded-full blur-[40px] opacity-50 pointer-events-none"></div>
            <img src="/assets/robu_hi.webp" alt="Robu Guide" className="h-48 object-contain drop-shadow-[0_0_25px_rgba(0,242,255,0.4)] relative z-10 animate-[bounce_4s_infinite]" />
            
            {/* Cyberpunk Accents */}
            <div className="absolute top-1/2 left-4 w-12 h-[1px] bg-[#00f2ff]/30"></div>
            <div className="absolute top-1/2 right-4 w-12 h-[1px] bg-[#00f2ff]/30"></div>
            <div className="absolute top-1/4 right-8 w-2 h-2 rounded-full bg-[#b400ff]/50 shadow-[0_0_10px_#b400ff] animate-pulse"></div>
            <div className="absolute bottom-1/4 left-8 w-2 h-2 rounded-full bg-[#00f2ff]/50 shadow-[0_0_10px_#00f2ff] animate-pulse"></div>
          </div>

          <div className="bg-[#0a0a0f]/80 backdrop-blur-sm border border-[#00f2ff]/20 rounded-xl p-4 flex justify-between items-center shadow-[0_0_15px_rgba(0,242,255,0.05)]">
            <span className="font-mono text-xs uppercase text-white/50 tracking-widest">Global Experience</span>
            <span className="font-display font-bold text-[#00f2ff] text-xl">{xp.toLocaleString()}</span>
          </div>

          <div className="flex flex-col gap-4 mt-2 pb-8">
            {TILES.map(tile => (
              <button 
                key={tile.id} 
                onClick={() => navigate_(tile.path)}
                className="w-full text-left bg-gradient-to-r from-[#0a0a0f] to-[rgba(0,242,255,0.05)] border border-[#00f2ff]/20 p-5 rounded-xl flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b400ff] shadow-[0_0_5px_#b400ff]"></div>
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Module 0{tile.id + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold uppercase tracking-widest text-white m-0 shadow-sm">{tile.name}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                  {tile.icon}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMobile;
