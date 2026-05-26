import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Settings, Volume2, VolumeX, Plus, Minus, LogOut,
  Crosshair, FlaskConical, Globe, Target, ChevronsUp
} from 'lucide-react';
import RainEffect from '../components/RainEffect';
import { CHAPTERS } from '../story_mode/lib/game-data';

/* ── Constants ─────────────────────────────────────────────────────── */
const RANK_NAMES: Record<number, string> = {
  1: 'RECRUIT', 2: 'GUARD', 3: 'SCOUT', 4: 'SOLDIER',
  5: 'VETERAN', 6: 'ELITE', 7: 'CAPTAIN', 8: 'HERO',
};

const TILES = [
  { id: 0, name: 'Story Mode',  path: '/story',      desc: 'Campaign Operations',   icon: <Target      className="w-5 h-5" /> },
  { id: 1, name: 'Cipher Lab',  path: '/cipherlab',  desc: 'Infiltration Training', icon: <FlaskConical className="w-5 h-5" /> },
  { id: 2, name: 'Multiplayer', path: '/multiplayer', desc: 'Active Warzone',        icon: <Globe       className="w-5 h-5" /> },
  { id: 3, name: 'Training',    path: '/training',   desc: 'Combat Academy',        icon: <Crosshair   className="w-5 h-5" /> },
];

const STEPS = [
  { type: 'intro',  robotMood: 'hi',    title: 'Signal acquired.',  body: 'Welcome to Cipher-Quest. I am your guide robu, I will walk you through your console before we begin.', note: '' },
  { type: 'intro',  robotMood: 'sad',   title: 'Signal acquired.',  body: 'Our world has been overrun by autonomous systems that rewrote their own rules. You are one of the last human operatives still off-grid.', note: '' },
  { type: 'intro',  robotMood: 'guide', title: 'Your role.',        body: 'Your task is to infiltrate the city network, decode hostile signals, and reclaim control one cipher at a time.', note: 'Every mission advances the story.' },
  { type: 'tile',   robotMood: 'guide', tileIndex: 0, title: 'Story Mode.',      body: 'Start the main narrative journey and progress through the resistance storyline.', note: 'You will be given codewords to decode.' },
  { type: 'tile',   robotMood: 'guide', tileIndex: 1, title: 'CipherLab.',       body: 'Solve standalone cipher challenges and sharpen your decoding skills.', note: 'Decode encoded words using the appropriate technique.' },
  { type: 'tile',   robotMood: 'guide', tileIndex: 2, title: 'Multiplayer.',     body: 'Challenge your friends and sharpen skills together.', note: 'Both players decode the same word.' },
  { type: 'tile',   robotMood: 'guide', tileIndex: 3, title: 'Training Academy.', body: 'Learn core mechanics before entering high-risk missions.', note: 'Use it to train safely and improve.' },
  { type: 'outro',  robotMood: 'guide', title: 'You are ready.',   body: "That's the console. When you're ready, begin your first mission or explore at your own pace.", note: '' },
];

const ROBOT_SOURCES: Record<string, string> = {
  hi: '/assets/robu_hi.webp', sad: '/assets/robu_sad.webp',
  guide: '/assets/robu.webp', idle: '/assets/robu.webp',
};

/* ── Component ─────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const { volume, setVolume, isMuted, setIsMuted } = useAudio();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const level    = user?.level    || 1;
  const xp       = user?.xp       || 0;
  const username = user?.username || 'WOLFY';
  const rankName = RANK_NAMES[level] || 'RECRUIT';

  const [settingsOpen,     setSettingsOpen]     = useState(false);
  const [badgesModalOpen,  setBadgesModalOpen]  = useState(false);
  const [showLevelUpdate,  setShowLevelUpdate]  = useState<{ show: boolean; type: 'promotion' | 'demotion' }>({ show: false, type: 'promotion' });

  /* Tutorial */
  const [tutorialMode,        setTutorialMode]        = useState(false);
  const [stepIndex,           setStepIndex]           = useState(0);
  const [tutorialExiting,     setTutorialExiting]     = useState(false);
  const [tutorialInitialized, setTutorialInitialized] = useState(false);

  /* Story Mode completion status */
  const [allSectorsFinished, setAllSectorsFinished] = useState(false);

  useEffect(() => {
    if (user) {
      fetch('/api/story/profile').then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      }).then(data => {
        const completedMissions = new Set(data.storyData?.completedMissions || []);
        const totalMissions = CHAPTERS.reduce((acc, chap) => acc + chap.missions.length, 0);
        if (totalMissions > 0 && completedMissions.size >= totalMissions) {
          setAllSectorsFinished(true);
        }
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user || tutorialInitialized) return;
    const isNew            = searchParams.get('new') === '1';
    const tutorialFinished = user.gameData?.tutorialFinished;
    const savedStep        = user.gameData?.tutorialStepIndex || 0;
    if (isNew && !tutorialFinished) { setTutorialMode(true); setStepIndex(savedStep); }
    setTutorialInitialized(true);
  }, [user, searchParams, tutorialInitialized]);

  const persistTutorial = async (idx: number, finished: boolean) => {
    try {
      await fetch('/api/me/progress', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ tutorialStepIndex: idx, tutorialFinished: finished }),
      });
      await refreshUser();
    } catch { setStepIndex(idx); if (finished) finishTutorialUI(); }
  };

  const finishTutorialUI = () => {
    setTutorialMode(false); setTutorialExiting(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('new');
    window.history.replaceState({}, '', url);
  };

  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) { const n = stepIndex + 1; setStepIndex(n); persistTutorial(n, false); }
    else { setTutorialExiting(true); persistTutorial(STEPS.length - 1, true); setTimeout(finishTutorialUI, 300); }
  };

  const skipIntro = () => {
    const outro = STEPS.findIndex(s => s.type === 'outro');
    const n = outro !== -1 ? outro : STEPS.length - 1;
    setStepIndex(n); persistTutorial(n, false);
  };

  /* Keyboard tutorial nav */
  useEffect(() => {
    if (!tutorialMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextStep(); }
      else if (e.key === 'Escape') { e.preventDefault(); skipIntro(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [tutorialMode, stepIndex]);

  /* Mouse parallax */
  useEffect(() => {
    const mv = (e: MouseEvent) => {
      const page = document.querySelector('.page') as HTMLElement;
      if (page) { page.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`); page.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`); }
    };
    document.addEventListener('mousemove', mv);
    return () => document.removeEventListener('mousemove', mv);
  }, []);

  /* Level change detection */
  useEffect(() => {
    if (!user) return;
    if (searchParams.get('new') === '1') { sessionStorage.setItem('cq_last_level', String(level)); return; }
    const stored = sessionStorage.getItem('cq_last_level');
    if (!stored) { sessionStorage.setItem('cq_last_level', String(level)); }
    else {
      const prev = parseInt(stored, 10);
      sessionStorage.setItem('cq_last_level', String(level));
      if (prev > 0 && level !== prev) setShowLevelUpdate({ show: true, type: level > prev ? 'promotion' : 'demotion' });
    }
  }, [user, level]);

  /* Preload assets */
  useEffect(() => {
    refreshUser();
    Object.values(ROBOT_SOURCES).forEach(src => { const i = new Image(); i.src = src; });
    [1,2,3,4,5,6,7,8].forEach(n => { const i = new Image(); i.src = `/assets/badge${n}.png`; });
  }, []);

  const isTutorialActive = tutorialMode && !tutorialExiting;
  const currentStep = STEPS[stepIndex] || STEPS[0];
  const robotSrc = isTutorialActive ? (ROBOT_SOURCES[currentStep.robotMood] || ROBOT_SOURCES.guide) : ROBOT_SOURCES.idle;

  const navigate_ = (path: string) => {
    if (path === '/training') window.location.href = path;
    else navigate(path);
  };

  /* ── RENDER ──────────────────────────────────────────────────────── */
  return (
    <div className="page overflow-hidden h-screen text-white select-none" style={{ background: '#04060f' }}>

      {/* ── Background ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/cyborg_bg.png"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        {/* bottom fade so cards sit cleanly */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060f] via-[#04060f]/30 to-transparent" style={{ top: '55%' }} />
        {/* subtle cyan tint */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,200,255,0.08) 0%, transparent 70%)' }} />
      </div>

      <RainEffect />
      <div className="scanline" />

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      {/* Cyberpunk navbar exactly matching reference image */}
      <header className="absolute top-0 left-0 right-0 z-50" style={{ height: '90px', margin: '10px 14px 0', cursor: 'url("/assets/mouse.png") 4 4, auto' }}>
        {/* ── Outer wrapper: angled left clip + neon border frame ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(0,8,20,0.96) 0%, rgba(2,10,24,0.92) 60%, rgba(4,6,18,0.95) 100%)',
          backdropFilter: 'blur(14px)',
          clipPath: 'polygon(28px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 28px)',
          border: '1px solid transparent',
        }} />

        {/* Cyan top border */}
        <div style={{ position: 'absolute', top: 0, left: '28px', right: 0, height: '1.5px', background: 'linear-gradient(90deg, #00e5ff, rgba(0,229,255,0.6) 50%, rgba(180,0,255,0.4) 80%, #b400ff)', zIndex: 2 }} />
        {/* Bottom border */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1.5px', background: 'linear-gradient(90deg, rgba(0,229,255,0.7) 0%, rgba(0,229,255,0.3) 40%, rgba(180,0,255,0.3) 70%, rgba(180,0,255,0.6))', zIndex: 2 }} />
        {/* Left border (vertical part after clip) */}
        <div style={{ position: 'absolute', left: 0, top: '28px', bottom: 0, width: '1.5px', background: 'linear-gradient(180deg, transparent, rgba(0,229,255,0.7) 20%, rgba(0,229,255,0.5))', zIndex: 2 }} />
        {/* Right border */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '1.5px', background: 'linear-gradient(180deg, rgba(180,0,255,0.8), rgba(180,0,255,0.4))', zIndex: 2 }} />
        {/* Diagonal cut border (top-left) */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '60px', background: 'linear-gradient(135deg, rgba(0,229,255,0.8), transparent)', transform: 'rotate(45deg) translateX(14px) translateY(-8px)', transformOrigin: 'top left', zIndex: 2 }} />

        {/* Cyan glow left */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '200px', background: 'linear-gradient(90deg, rgba(0,229,255,0.06), transparent)', pointerEvents: 'none', zIndex: 1 }} />
        {/* Magenta glow right */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '160px', background: 'linear-gradient(270deg, rgba(180,0,255,0.07), transparent)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Outer box-shadow glow */}
        <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 30px rgba(0,229,255,0.08), 0 0 15px rgba(0,0,0,0.9), inset 0 0 60px rgba(0,0,0,0.4)', pointerEvents: 'none', zIndex: 1 }} />

        {/* ── Decorative circuit lines bottom-left ── */}
        <svg style={{ position: 'absolute', left: 0, bottom: 0, pointerEvents: 'none', zIndex: 3, opacity: 0.55, transform: 'scale(1.3)', transformOrigin: 'bottom left' }} width="260" height="68" viewBox="0 0 260 68" fill="none">
          <line x1="30" y1="68" x2="30" y2="50" stroke="#00e5ff" strokeWidth="0.8" />
          <line x1="30" y1="50" x2="55" y2="50" stroke="#00e5ff" strokeWidth="0.8" />
          <line x1="55" y1="50" x2="55" y2="68" stroke="#00e5ff" strokeWidth="0.8" />
          <line x1="60" y1="68" x2="60" y2="55" stroke="#00e5ff" strokeWidth="0.5" opacity="0.5" />
          <line x1="60" y1="55" x2="80" y2="55" stroke="#00e5ff" strokeWidth="0.5" opacity="0.5" />
          <circle cx="30" cy="50" r="1.5" fill="#00e5ff" />
          <circle cx="55" cy="50" r="1.5" fill="#00e5ff" />
          <line x1="85" y1="68" x2="85" y2="58" stroke="#00e5ff" strokeWidth="0.5" opacity="0.3" />
          <line x1="85" y1="58" x2="100" y2="58" stroke="#00e5ff" strokeWidth="0.5" opacity="0.3" />
          <line x1="110" y1="68" x2="110" y2="62" stroke="#00e5ff" strokeWidth="0.4" opacity="0.2" />
          <line x1="110" y1="62" x2="130" y2="62" stroke="#00e5ff" strokeWidth="0.4" opacity="0.2" />
          <text x="34" y="66" fontSize="6" fill="#00e5ff" opacity="0.4" fontFamily="monospace">BIT</text>
        </svg>

        {/* ── Content row ── */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', paddingLeft: '20px', paddingRight: '16px', zIndex: 10 }}>

          {/* LEFT: Logo — angular bracket + CIPHER QUEST */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {/* Angular bracket shape */}
            <svg width="44" height="60" viewBox="0 0 32 44" fill="none" style={{ marginRight: '14px', flexShrink: 0 }}>
              {/* Left diagonal top */}
              <line x1="2" y1="4" x2="14" y2="4" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="4" x2="2" y2="40" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="40" x2="14" y2="40" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
              {/* dot accent */}
              <circle cx="20" cy="22" r="3" fill="#00e5ff" opacity="0.9" />
              <circle cx="27" cy="22" r="1.5" fill="#00e5ff" opacity="0.5" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <span style={{
                fontSize: '28px', fontWeight: 800, letterSpacing: '0.16em',
                fontFamily: "'Rajdhani', 'Orbitron', 'Inter', monospace",
                lineHeight: 1.1,
                color: '#ffffff',
                textShadow: '0 0 12px rgba(255,255,255,0.2)',
              }}>
                CIPHER{' '}
                <span style={{ color: '#00e5ff', textShadow: '0 0 14px #00e5ff, 0 0 30px rgba(0,229,255,0.4)' }}>QUEST</span>
              </span>
              {/* Decorative sub-line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                <div style={{ width: '14px', height: '1px', background: '#00e5ff', opacity: 0.5 }} />
                <div style={{ width: '4px', height: '1px', background: '#00e5ff', opacity: 0.3 }} />
                <div style={{ width: '2px', height: '1px', background: '#00e5ff', opacity: 0.2 }} />
              </div>
            </div>
          </div>

          {/* Spacer to push everything to the right */}
          <div style={{ flex: 1 }} />

          {/* CENTER-RIGHT: Rank / Level / XP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '40px' }}>
            {/* Rank name — bright cyan */}
            <span style={{
              color: '#00e5ff', fontSize: '18px', fontWeight: 800,
              letterSpacing: '0.22em', fontFamily: 'monospace',
              textShadow: '0 0 12px #00e5ff, 0 0 24px rgba(0,229,255,0.5)',
            }}>{rankName}</span>

            {/* Level indicator */}
            <span style={{
              color: 'rgba(255,255,255,0.5)', fontSize: '14px',
              letterSpacing: '0.15em', fontFamily: 'monospace',
            }}>LV.{level}</span>

            {/* XP count */}
            <span style={{
              color: '#ffffff', fontSize: '16px', fontWeight: 700,
              letterSpacing: '0.15em', fontFamily: 'monospace',
              textShadow: '0 0 8px rgba(255,255,255,0.4)',
            }}>{xp.toLocaleString()} XP</span>
          </div>

          {/* RIGHT: CALLSIGN label + username + arrow button + gear */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Callsign block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <span style={{
                color: '#b400ff', fontSize: '11px', letterSpacing: '0.35em',
                fontFamily: 'monospace', fontWeight: 700,
                textShadow: '0 0 8px rgba(180,0,255,0.8)',
                textTransform: 'uppercase',
              }}>CALLSIGN</span>
              <span 
                className={allSectorsFinished ? "rainbow-text" : ""}
                style={{
                  color: allSectorsFinished ? undefined : '#ffffff',
                  display: 'inline-block',
                  fontSize: '20px', fontWeight: 700,
                  letterSpacing: '0.1em', lineHeight: 1.1,
                  textShadow: allSectorsFinished ? 'none' : '0 0 6px rgba(255,255,255,0.3)',
                  fontFamily: "'Rajdhani', 'Inter', monospace",
              }}>{username.toUpperCase()}</span>
            </div>

            {/* Rank / Badge arrow button — cyan gradient with neon border */}
            <button
              onClick={() => setBadgesModalOpen(true)}
              title="View Ranks"
              style={{
                width: '52px', height: '52px',
                background: 'linear-gradient(135deg, rgba(0,60,100,0.9) 0%, rgba(0,30,70,0.95) 50%, rgba(0,10,40,0.98) 100%)',
                border: '1.5px solid rgba(0,229,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#00e5ff',
                boxShadow: '0 0 14px rgba(0,229,255,0.35), inset 0 0 12px rgba(0,229,255,0.08)',
                cursor: 'pointer', transition: 'all 0.25s',
                position: 'relative', overflow: 'hidden',
                clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,100,160,0.95) 0%, rgba(0,60,120,0.98) 100%)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 22px rgba(0,229,255,0.6), inset 0 0 16px rgba(0,229,255,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,60,100,0.9) 0%, rgba(0,30,70,0.95) 50%, rgba(0,10,40,0.98) 100%)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 14px rgba(0,229,255,0.35), inset 0 0 12px rgba(0,229,255,0.08)';
              }}
            >
              <img src={`/assets/badge${level}.png`} alt="Current Rank Badge" style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.6))' }} />
            </button>

            {/* Settings gear button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                title="Settings"
                style={{
                  width: '50px', height: '50px',
                  background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.75)',
                  boxShadow: settingsOpen ? '0 0 12px rgba(255,255,255,0.15)' : 'none',
                  transition: 'all 0.2s',
                  cursor: 'url("/assets/mouse.png") 4 4, pointer',
                }}
              >
                <Settings size={22} style={{ transform: settingsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.4s' }} />
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: '240px', padding: '20px',
                      background: 'rgba(2,6,18,0.97)',
                      border: '1px solid rgba(0,229,255,0.3)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(0,229,255,0.1)',
                      backdropFilter: 'blur(20px)',
                      zIndex: 200,
                      clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span style={{ color: '#00e5ff', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Music Volume</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setVolume(Math.max(0, parseFloat((volume - 0.1).toFixed(1))))} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'url("/assets/mouse.png") 4 4, pointer' }}>
                          <Minus size={14} />
                        </button>
                        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '2px', position: 'relative', cursor: 'url("/assets/mouse.png") 4 4, pointer' }}
                          onClick={e => {
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                            setVolume(parseFloat(ratio.toFixed(2)));
                          }}>
                          <div style={{ width: `${(isMuted ? 0 : volume) * 100}%`, height: '100%', background: '#00e5ff', boxShadow: '0 0 6px #00e5ff', borderRadius: '2px', transition: 'width 0.1s' }} />
                          <div style={{ position: 'absolute', top: '50%', left: `${(isMuted ? 0 : volume) * 100}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 6px #00e5ff' }} />
                        </div>
                        <button onClick={() => setVolume(Math.min(1, parseFloat((volume + 0.1).toFixed(1))))} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'url("/assets/mouse.png") 4 4, pointer' }}>
                          <Plus size={14} />
                        </button>
                      </div>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMuted ? '#ffaa00' : '#00e5ff', background: 'none', border: 'none', cursor: 'url("/assets/mouse.png") 4 4, pointer', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 0' }}
                      >
                        {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />} {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
                      </button>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                      <button
                        onClick={() => { setSettingsOpen(false); setTutorialMode(true); setStepIndex(0); persistTutorial(0, false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00e5ff', background: 'none', border: 'none', cursor: 'url("/assets/mouse.png") 4 4, pointer', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 0' }}
                      >
                        <Shield size={13} /> Restart Tutorial
                      </button>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                      <button
                        onClick={logout}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4455', background: 'none', border: 'none', cursor: 'url("/assets/mouse.png") 4 4, pointer', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 0' }}
                      >
                        <LogOut size={13} /> Terminate Session
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── BOTTOM CARDS ────────────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0"
        style={{ 
          bottom: '15%', padding: '0 20px 28px',
          zIndex: (isTutorialActive && currentStep.type === 'tile') ? 160 : 20 
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', maxWidth: '1100px', margin: '0 auto' }}>
          {TILES.map((tile) => {
            const isHighlighted = isTutorialActive && currentStep.type === 'tile' && currentStep.tileIndex === tile.id;
            const isOtherHighlighted = isTutorialActive && currentStep.type === 'tile' && currentStep.tileIndex !== tile.id;
            return (
            <button
              key={tile.id}
              onClick={() => navigate_(tile.path)}
              style={{
                position: 'relative',
                height: '140px',
                background: 'rgba(3,8,20,0.85)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(12px)',
                clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
                opacity: isOtherHighlighted ? 0.3 : 1,
                transform: isHighlighted ? 'scale(1.05)' : 'translateY(0)',
                boxShadow: isHighlighted ? '0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(0,255,255,0.4), inset 0 0 20px rgba(0,255,255,0.2)' : 'none',
                zIndex: isHighlighted ? 10 : 1,
              }}
              onMouseEnter={e => {
                if (isHighlighted || isOtherHighlighted) return;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,255,0.15)';
              }}
              onMouseLeave={e => {
                if (isHighlighted || isOtherHighlighted) return;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              {/* Border overlay - cyan on left/bottom, magenta on top/right */}
              {/* Top border - magenta */}
              <div style={{ position: 'absolute', top: 0, left: '14px', right: 0, height: '2px', background: '#cc00ff', boxShadow: '0 0 6px #cc00ff', zIndex: 2 }} />
              {/* Right border - magenta */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: '14px', width: '2px', background: '#cc00ff', boxShadow: '0 0 6px #cc00ff', zIndex: 2 }} />
              {/* Bottom border - cyan */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: '14px', height: '2px', background: '#00ffff', boxShadow: '0 0 6px #00ffff', zIndex: 2 }} />
              {/* Left border - cyan */}
              <div style={{ position: 'absolute', left: 0, top: '14px', bottom: 0, width: '2px', background: '#00ffff', boxShadow: '0 0 6px #00ffff', zIndex: 2 }} />
              {/* Top-left corner diagonal - cyan */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', zIndex: 2, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '12px', left: 0, width: '20px', height: '2px', background: '#00ffff', boxShadow: '0 0 6px #00ffff', transform: 'rotate(-45deg)', transformOrigin: 'left center' }} />
              </div>
              {/* Bottom-right corner diagonal - magenta */}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', zIndex: 2, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: '12px', right: 0, width: '20px', height: '2px', background: '#cc00ff', boxShadow: '0 0 6px #cc00ff', transform: 'rotate(-45deg)', transformOrigin: 'right center' }} />
              </div>

              {/* Card Content */}
              <div style={{ position: 'relative', height: '100%', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 3 }}>
                {/* Top row: MODULE label + >> */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cc00ff', boxShadow: '0 0 6px #cc00ff' }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 600 }}>
                      MODULE_0{tile.id + 1}
                    </span>
                  </div>
                  <span style={{ color: '#cc00ff', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, textShadow: '0 0 5px #cc00ff', letterSpacing: '0.1em' }}>{'>>'}</span>
                </div>

                {/* Title */}
                <div>
                  <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.08em', textShadow: '0 0 15px rgba(255,255,255,0.3)', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
                    {tile.name}
                  </h3>
                </div>

                {/* Bottom row: desc + icon */}
                <div>
                  <div style={{ width: '100%', height: '1px', background: 'rgba(0,255,255,0.25)', marginBottom: '10px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '30%', background: '#00ffff', boxShadow: '0 0 4px #00ffff' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#00ffff', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 0 5px rgba(0,255,255,0.5)' }}>
                      {tile.desc}
                    </span>
                    <span style={{ color: '#cc00ff', textShadow: '0 0 8px #cc00ff' }}>
                      {tile.icon}
                    </span>
                  </div>
                </div>
              </div>
            </button>
            );
          })}
        </div>
      </div>

      {/* ── TUTORIAL OVERLAY ────────────────────────────────────────── */}
      <AnimatePresence>
        {tutorialMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: tutorialExiting ? 0.3 : 0.5 }}
            className="fixed inset-0 z-[150] pointer-events-none bg-black/60 flex items-center justify-center backdrop-blur-sm"
          >
            {isTutorialActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="pointer-events-auto flex items-end gap-6"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-[#00e5ff]/20 blur-xl rounded-full animate-pulse" />
                  <img src={robotSrc} alt="Robu" className="w-48 h-48 object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" />
                </div>
                <div className="bg-[#020612]/95 border border-[#00e5ff]/30 p-8 w-[460px] shadow-[0_0_40px_rgba(0,229,255,0.15)] relative"
                     style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#00e5ff] to-transparent" />
                  <h3 className="text-[#00e5ff] font-bold tracking-widest text-base mb-3 font-mono uppercase">{currentStep.title}</h3>
                  <p className="text-white/90 text-base leading-relaxed mb-5">{currentStep.body}</p>
                  {currentStep.note && <p className="text-[#00e5ff]/70 text-sm mb-5 italic">{currentStep.note}</p>}
                  
                  <div className="flex justify-between items-center pt-4 mt-2">
                    <button 
                      onClick={skipIntro} 
                      className="px-4 py-2 border border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5 text-sm font-mono uppercase tracking-widest transition-all"
                      style={{ clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)' }}
                    >
                      Skip
                    </button>
                    <button 
                      onClick={nextStep} 
                      className="px-5 py-2 bg-[#00e5ff]/10 border border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff]/20 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] text-sm font-mono uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(0,229,255,0.1)]"
                      style={{ clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)' }}
                    >
                      {stepIndex < STEPS.length - 1 ? 'Next' : 'Acknowledge'} <span>&gt;&gt;</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEVEL UPDATE MODAL ──────────────────────────────────────── */}
      {showLevelUpdate.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="tactical-panel p-16 max-w-xl w-full text-center relative z-10"
            style={{ borderColor: showLevelUpdate.type === 'promotion' ? 'var(--current-theme-color)' : '#ef4444' }}
          >
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-10 animate-pulse ${showLevelUpdate.type === 'promotion' ? 'bg-[var(--current-theme-color)] shadow-[0_0_50px_var(--current-theme-color)]' : 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]'}`}>
              <img src={`/assets/badge${level}.png`} alt="Badge" className="w-24 h-24 object-contain" />
            </div>
            <h2 className="cq-title mb-4">{showLevelUpdate.type === 'promotion' ? 'PROMOTION!' : 'DEMOTION!'}</h2>
            <p className={`font-mono text-xs uppercase tracking-[0.4em] mb-2 ${showLevelUpdate.type === 'promotion' ? 'text-[var(--current-theme-color)]' : 'text-red-500'}`}>
              Neural_Clearance_Level: 0{level}
            </p>
            <p className="cq-subheading text-white/60 mb-12">New Rank: {rankName}</p>
            <button onClick={() => setShowLevelUpdate({ show: false, type: 'promotion' })} className="cyber-button w-full h-16 text-lg">Acknowledge</button>
          </motion.div>
        </div>
      )}

      {/* ── BADGES MODAL ────────────────────────────────────────────── */}
      {badgesModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setBadgesModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="tactical-panel bg-[#0a0a0f] max-w-4xl w-full relative z-10 flex flex-col"
            style={{ borderColor: 'rgba(0,242,255,0.3)', boxShadow: '0 0 50px rgba(0,242,255,0.1)', maxHeight: '80vh' }}
          >
            {/* Sticky header */}
            <div className="flex justify-between items-center px-8 pt-8 pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="cq-title" style={{ color: 'var(--current-theme-color)' }}>Operator Ranks</h2>
                <p className="font-mono text-xs text-white/50 uppercase tracking-widest mt-2">Clearance Level Verification</p>
              </div>
              <button onClick={() => setBadgesModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Scrollable grid body */}
            <div className="overflow-y-auto p-8 pt-6" style={{ flex: '1 1 auto' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1,2,3,4,5,6,7,8].map(lvl => (
                  <div key={lvl} className={`flex flex-col items-center p-4 border rounded ${level === lvl ? 'border-[var(--current-theme-color)]/50 bg-[var(--current-theme-color)]/5 shadow-[0_0_15px_rgba(0,242,255,0.2)]' : 'border-white/5 bg-white/5'}`}>
                    <div className="w-20 h-20 mb-4 p-2 relative">
                      <img src={`/assets/badge${lvl}.png`} alt={`Level ${lvl}`} className="w-full h-full object-contain" />
                      {level === lvl && <div className="absolute -top-2 -right-2 bg-[var(--current-theme-color)] text-black text-[9px] font-bold px-2 py-0.5 rounded-full font-mono uppercase">Current</div>}
                    </div>
                    <span className="font-display font-bold text-lg mb-1 text-white">{RANK_NAMES[lvl]}</span>
                    <span className="font-mono text-[10px] text-[var(--current-theme-color)] uppercase tracking-widest">Level 0{lvl}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
