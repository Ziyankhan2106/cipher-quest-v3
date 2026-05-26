import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Shield, Zap, History, 
  CheckCircle2, Lightbulb, AlertTriangle, User,
  Globe, ArrowLeft
} from 'lucide-react';
import { generateMission, calculateScore, CipherMission } from '../src/lib/cipherUtils';
import confetti from 'canvas-confetti';
import { useAuth } from '../src/context/AuthContext';

// --- Types ---
interface UserData {
  uid: string;
  username: string;
  totalPoints: number;
  completedLevelIds: string[];
  usedWords?: string[];
}

interface LeaderboardEntry {
  uid: string;
  callsign: string;
  points: number;
}

// --- API helpers ---
async function fetchProfile(): Promise<UserData | null> {
  try {
    const res = await fetch('/api/cipherlab/profile', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile;
  } catch { return null; }
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch('/api/cipherlab/leaderboard', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries || [];
  } catch { return []; }
}

async function submitScore(points: number, missionId: string) {
  try {
    const res = await fetch('/api/cipherlab/complete-mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ points, missionId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchGlobalXp(): Promise<{xp: number, level: number}> {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) return { xp: 0, level: 1 };
    const data = await res.json();
    return { xp: Number(data.profile?.xp || 0), level: Number(data.profile?.level || 1) };
  } catch { return { xp: 0, level: 1 }; }
}

async function updateGlobalXp(delta: number): Promise<{xp: number, level: number}> {
  try {
    const res = await fetch('/api/me/xp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ delta }),
    });
    if (!res.ok) return { xp: 0, level: 1 };
    const data = await res.json();
    return { xp: data.xp || 0, level: data.level || 1 };
  } catch { return { xp: 0, level: 1 }; }
}

/* ── ScrambleText: randomises characters then locks into real text ── */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&!?';

const ScrambleText = ({ text, className }: { text: string; className?: string }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!text) return;
    let frame = 0;
    const totalFrames = 22;
    setDisplayed(text.split('').map(() => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]).join(''));
    const iv = setInterval(() => {
      frame++;
      if (frame >= totalFrames) { setDisplayed(text); clearInterval(iv); return; }
      const locked = Math.floor((frame / totalFrames) * text.length);
      setDisplayed(text.split('').map((ch, i) => i < locked ? ch : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]).join(''));
    }, 50);
    return () => clearInterval(iv);
  }, [text]);
  return <span className={className}>{displayed}</span>;
};

// --- Main App ---
export default function App() {
  const { user: authUser, refreshUser } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dash' | 'lab' | 'leaderboard'>('dash');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [globalXp, setGlobalXp] = useState(0);

  useEffect(() => {
    (async () => {
      if (!authUser) return;
      const profile = await fetchProfile();
      if (!profile) { window.location.href = '/account?mode=login'; return; }
      setUser({
        uid: profile.uid,
        username: profile.username || (authUser.username ?? 'OP_RECRUIT'),
        totalPoints: profile.totalPoints || 0,
        completedLevelIds: profile.completedLevelIds || [],
        usedWords: profile.usedWords || [],
      });
      setLoading(false);
      setLeaderboard(await fetchLeaderboard());
      setGlobalXp(authUser.xp);
    })();
  }, [authUser]);

  const storyCompleted = (authUser?.storyData?.completedMissions?.length || 0) >= 20;

  useEffect(() => {
    const id = setInterval(async () => setLeaderboard(await fetchLeaderboard()), 30000); // 30 seconds
    return () => clearInterval(id);
  }, []);

  const handleComplete = async (points: number, missionId: string) => {
    // Optimistic update for local UI
    setGlobalXp(prev => prev + points);
    
    const result = await submitScore(points, missionId);
    if (result && user) {
      setUser(prev => prev ? ({ ...prev, totalPoints: result.totalPoints, completedLevelIds: result.completedLevelIds }) : null);
      setLeaderboard(await fetchLeaderboard());
      // Sync to global AuthContext
      await refreshUser();
    }
  };

  if (loading) return null;

  return (
    <div 
      className="relative min-h-screen terminal-grid selection:bg-white selection:text-black"
    >
      <div className="scanline" />
      {/* Standardized Background */}
      <div className="fixed inset-0 z-0 bg-[#050505] overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {view === 'dash' && user && (
            <Dashboard user={user} leaderboard={leaderboard} onStartLab={() => setView('lab')} storyCompleted={storyCompleted} authUser={authUser} globalXp={globalXp} />
          )}
          {view === 'lab' && user && (
            <CipherLab user={user} globalXp={globalXp} onComplete={handleComplete} onExit={() => setView('dash')} onXpChange={setGlobalXp} />
          )}
          {view === 'leaderboard' && user && (
            <Leaderboard user={user} entries={leaderboard} onExit={() => setView('dash')} />
          )}
        </AnimatePresence>
      </main>

      {user && (
        <nav className="fixed top-0 left-0 w-full z-40 pointer-events-none">
          {/* Left corner back arrow */}
          <button onClick={() => view === 'dash' ? window.location.href = '/dashboard' : setView('dash')} className="fixed top-0 left-0 w-28 h-28 bg-[#00f2ff] hover:bg-white transition-colors cursor-pointer group pointer-events-auto z-50 flex items-start justify-start pl-6 pt-6 shadow-[0_0_30px_#00f2ff] outline-none" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
             <div className="w-8 h-8 flex items-center justify-center">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-black group-hover:stroke-[#00f2ff] group-hover:-translate-x-1 transition-transform">
                 <path d="m15 18-6-6 6-6"/>
               </svg>
             </div>
          </button>

          {/* Right side module name */}
          <div className="absolute top-6 right-10 flex flex-col items-end">
            <h1 className="cq-title tracking-widest uppercase text-right">Cipher_Lab</h1>
          </div>
        </nav>
      )}
    </div>
  );
}

// --- Dashboard ---
function Dashboard({ user, leaderboard, onStartLab, storyCompleted, authUser, globalXp }: { 
  user: UserData, leaderboard: LeaderboardEntry[], onStartLab: () => void, storyCompleted: boolean, authUser: any, globalXp: number
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
      <div className="lg:col-span-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div onClick={onStartLab} className="glass-panel p-8 rounded-sm group cursor-pointer hover:border-[var(--current-theme-color)] transition-all duration-500">
            <div className="flex justify-end items-start mb-12">
              <div className="text-xs font-mono px-3 py-1 bg-white/10 rounded-full">ACTIVE_LAB</div>
            </div>
            <div>
              <h3 className="cq-subheading mb-2">Neural Lab</h3>
              <p className="text-white/40 text-sm font-mono leading-relaxed group-hover:text-white/60 transition-colors mb-6">
                EXECUTE DECRYPTION SEQUENCES. CHALLENGE YOUR NEURAL CAPACITY IN REAL-TIME.
              </p>
              <button onClick={(e) => { e.stopPropagation(); onStartLab(); }} className="cyber-button text-xs py-3 w-full group-hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(0,242,255,0.3)] bg-[#00f2ff] !text-black border-[#00f2ff]" style={{ backgroundColor: '#00f2ff', color: 'black', borderColor: '#00f2ff' }}>
                ENTER_LAB
              </button>
            </div>
            <div className="mt-8 h-1 w-0 bg-[var(--current-theme-color)] group-hover:w-full transition-all duration-700" />
          </div>

          {/* Global Rankings moved to Multiplayer — removed from CipherLab dashboard */}
        </div>
        {/* Operational Directives / Rules */}
        <div className="glass-panel p-8 border border-white/10 hover:border-[var(--current-theme-color)]/30 transition-colors mt-8">
          <h3 className="text-[12px] font-mono font-bold tracking-[0.3em] uppercase text-[var(--current-theme-color)] mb-6 flex items-center gap-3">
            <Terminal className="w-5 h-5" /> Operational Directives
          </h3>
          <ul className="space-y-4 font-sans text-[14px] leading-relaxed text-white/70 list-none">
            <li className="flex items-start gap-3">
              <span className="text-[var(--current-theme-color)] font-mono font-bold mt-0.5">&gt;</span>
              <p>You will be given an encrypted word and provided encryption technique and appropriate pattern.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--current-theme-color)] font-mono font-bold mt-0.5">&gt;</span>
              <p>You have to decode the word using given information within time limit.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--current-theme-color)] font-mono font-bold mt-0.5">&gt;</span>
              <p>You can use hints but it will cost you xp points.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--current-theme-color)] font-mono font-bold mt-0.5">&gt;</span>
              <p>Each hint will reveal one alphabet of the answer word.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--current-theme-color)] font-mono font-bold mt-0.5">&gt;</span>
              <p>Reward will be given on basis on time taken, hints used and incorrect attempts.</p>
            </li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <div className="glass-panel p-6 rounded-sm">
          <h4 className="cq-subtitle mb-4">Operator Stats</h4>
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-2 border-b border-white/5">
              <div className="w-12 h-12 tactical-panel bg-white/5 p-1 flex-shrink-0">
                <img src={`/assets/badge${authUser?.level || 1}.png`} alt="Badge" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold uppercase tracking-widest ${storyCompleted ? 'rainbow-text' : 'text-white/90'}`}>{user.username.toUpperCase()}</span>
                <span className="font-mono text-xs text-[var(--current-theme-color)] mt-1">{globalXp.toLocaleString()} XP</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-white/40">COMPLETED_CIPHERS</span>
              <span className="font-mono">{user.completedLevelIds.length}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- CipherLab Gameplay ---
function CipherLab({ user, globalXp, onComplete, onExit, onXpChange }: { user: UserData, globalXp: number, onComplete: (points: number, id: string) => void, onExit: () => void, onXpChange: (xp: number) => void }) {
  const [sessionMission, setSessionMission] = useState<CipherMission | null>(null);
  const [userInput, setUserInput] = useState('');
  const [hintsCount, setHintsCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'success' | 'error'>('none');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startNewMission = useCallback(() => {
    if (!user) return;
    const level = user.completedLevelIds.length;
    const mission = generateMission(level, user.usedWords || []);
    setSessionMission(mission);
    setUserInput('');
    setHintsCount(0);
    setTimeLeft(300);
    setIsActive(true);
    setStartTime(Date.now());
    setFeedback('none');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    startNewMission();
  }, [user, startNewMission]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setFeedback('error');
      setTimeout(() => startNewMission(), 1500);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionMission || !isActive) return;
    if (userInput.toUpperCase().trim() === sessionMission.originalText) {
      const timeSpent = (Date.now() - startTime) / 1000;
      const basePoints = sessionMission.difficulty === 'easy' ? 100 : sessionMission.difficulty === 'medium' ? 250 : 500;
      const points = calculateScore(basePoints, timeSpent, 300, hintsCount);
      setFeedback('success');
      setIsActive(false);
      onComplete(points, sessionMission.id);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [localStorage.getItem('cq_theme') || 'var(--current-theme-color)', '#ffffff'] });
    } else {
      setFeedback('error');
      setUserInput('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setTimeout(() => setFeedback('none'), 1000);
    }
  };

  const handleSkip = () => { setFeedback('none'); setUserInput(''); setHintsCount(0); startNewMission(); };
  const revealHint = async () => {
    if (!sessionMission || hintsCount >= sessionMission.originalText.length) return;
    if (globalXp <= 0) return;
    setHintsCount(prev => prev + 1);
    const result = await updateGlobalXp(-20);
    onXpChange(result.xp);
  };

  const getRevealedWord = () => {
    if (!sessionMission || hintsCount < 1) return null;
    const revealedCount = hintsCount;
    return sessionMission.originalText.split('').map((char, i) => i < revealedCount ? char : '_').join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={isShaking ? {
        x: [0, -14, 14, -9, 9, -4, 4, 0],
        filter: ['brightness(1) hue-rotate(0deg)', 'brightness(1.6) hue-rotate(280deg)', 'brightness(1.2) hue-rotate(180deg)', 'brightness(1) hue-rotate(0deg)'],
        opacity: 1, scale: 1,
      } : { opacity: 1, scale: 1, x: 0, filter: 'brightness(1) hue-rotate(0deg)' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex-1 w-full max-w-[1400px] mx-auto px-2 lg:px-4 py-4 flex flex-col items-center text-lg"
      style={{ maxHeight: 'calc(100vh - 56px)', overflow: 'hidden' }}
    >
      {/* Full-screen red glitch flash on wrong answer */}
      <AnimatePresence>
        {isShaking && (
          <motion.div
            key="glitch-flash-lab"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.1, 0.28, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, times: [0, 0.15, 0.35, 0.6, 1] }}
            className="fixed inset-0 z-[90] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,30,30,0.6) 0%, rgba(200,0,0,0.3) 100%)', mixBlendMode: 'screen' }}
          />
        )}
      </AnimatePresence>
      <div className="w-full flex justify-between items-center mb-8 border-b border-white/10 pb-4 mt-12 opacity-0 h-0 pointer-events-none"></div>

      <div className="w-full flex flex-col xl:flex-row gap-6 items-stretch min-h-full">
        {/* Left Column */}
        <div className="flex-1 flex flex-col w-full max-w-[340px] xl:max-w-none relative z-10">
          <div className="glass-panel p-4 flex-1 flex flex-col border border-[var(--current-theme-color)]/10 shadow relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--current-theme-color)]/5 to-transparent pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
              <Zap className="text-[var(--current-theme-color)] animate-[pulse_2s_infinite]" />
              <h2 className="font-sans text-[14px] tracking-[0.4em] uppercase text-[var(--current-theme-color)] font-bold">CipherLab Protocol</h2>
            </div>
            <div className="flex flex-col gap-4 mb-2 flex-1">
              {sessionMission ? (
                <>
                  <div className="mt-2 border border-[var(--current-theme-color)]/10 bg-[var(--current-theme-color)]/5 p-2 rounded">
                    <span className="text-[var(--current-theme-color)] font-bold tracking-[0.12em] uppercase text-[14px]">&gt; Target Algorithm:</span>
                      <div className="text-white mt-1 font-mono text-2xl">{sessionMission.type.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="mt-2 border border-[var(--current-theme-color)]/20 bg-[var(--current-theme-color)]/5 p-3 rounded">
                      <span className="text-[var(--current-theme-color)] font-bold tracking-[0.12em] uppercase text-[14px]">&gt; Known Pattern:</span>
                      <div className="text-white mt-1 font-mono text-2xl italic">{sessionMission.schemeHint}</div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <button onClick={revealHint} disabled={hintsCount >= sessionMission.originalText.length || !isActive || globalXp <= 0}
                              className="w-full py-2 border border-[var(--current-theme-color)]/10 text-[var(--current-theme-color)] hover:bg-[var(--current-theme-color)]/10 transition-colors text-[14px] tracking-[0.12em] font-bold disabled:opacity-30 disabled:pointer-events-none rounded flex items-center justify-center gap-2">
                      <Lightbulb className="w-4 h-4" /> REVEAL INTEL (-20 XP)
                    </button>
                    <button onClick={handleSkip} disabled={!isActive}
                              className="w-full py-2 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black transition-colors text-[14px] tracking-[0.12em] font-bold disabled:opacity-30 disabled:pointer-events-none rounded">
                      SKIP SEQUENCE
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-10">
                  <button onClick={startNewMission} className="bg-[var(--current-theme-color)] text-black font-bold uppercase tracking-[0.2em] text-[12px] px-8 py-4 rounded hover:shadow-[0_0_20px_var(--current-theme-color)] transition-all">
                    Initialize Sequence
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
          <div className="flex-[1.6] flex flex-col gap-4 w-full">
            <div className={`bg-[#0a0a0c]/80 border border-white/6 backdrop-blur rounded-lg p-4 relative overflow-hidden shadow ${!sessionMission ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="font-sans font-bold text-[14px] text-white/30 uppercase tracking-[0.3em] mb-6 flex justify-between">
              <span>Intercepted Ciphertext</span>
              <Shield className="w-4 h-4 text-[var(--current-theme-color)]" />
            </div>
            
              <div className="font-mono text-[80px] leading-[1] text-[var(--current-theme-color)] tracking-[0em] break-all">
              <span className="text-white/10 select-none mr-2">&gt;</span>
              {sessionMission
                ? <ScrambleText text={sessionMission.encryptedText} />
                : <span className="opacity-20">AWAITING_INPUT...</span>
              }
            </div>
            
            {hintsCount >= 1 && (
               <div className="mt-8 border-t border-white/10 pt-6">
                 <span className="text-[12px] font-mono uppercase opacity-40 block mb-2 tracking-widest text-white">Partial_Reconstruction</span>
                 <div className="font-mono text-3xl tracking-[0.4em] text-white font-bold">{getRevealedWord()}</div>
               </div>
            )}
          </div>

              <div className={`glass-panel p-4 relative shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition-all duration-500 rounded-lg ${!sessionMission && feedback !== 'success' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="font-sans font-bold text-[14px] uppercase tracking-[0.25em] mb-4 flex justify-between text-[var(--current-theme-color)]">
              <span>Decryption Input</span>
              {feedback === 'success' ? <span>[DECRYPTED]</span> : sessionMission ? <span className="animate-pulse">[AWAITING ANSWER]</span> : null}
            </div>

            <form onSubmit={handleSubmit}>
               <div
                className="relative flex items-center bg-[#050505]/80 rounded-lg p-4 border border-white/6 focus-within:border-[var(--current-theme-color)]/40 transition-colors cursor-text"
                onClick={() => inputRef.current?.focus()}
              >
                <span className="font-mono text-[34px] text-white/20 select-none mr-3">&gt;</span>
                <div className="relative flex-1 flex items-center flex-wrap gap-[3px] min-h-[60px]">
                  {userInput.length === 0 && (
                    <span className="font-mono text-[60px] text-white/10 select-none absolute left-0 pointer-events-none">ENTER PLAINTEXT...</span>
                  )}
                  {userInput.split('').map((char, i) => (
                    <span
                      key={i}
                      className="font-mono text-[60px] leading-none"
                      style={{
                        color: 'var(--current-theme-color)',
                        textShadow: '0 0 8px var(--current-theme-color), 0 0 20px var(--current-theme-color)',
                        display: 'inline-block',
                        transition: 'all 0.05s',
                      }}
                    >
                      {char}
                    </span>
                  ))}
                  {feedback !== 'success' && (
                    <span
                      className="font-mono text-[60px] leading-none animate-pulse select-none"
                      style={{ color: 'var(--current-theme-color)', opacity: 0.8 }}
                    >▋</span>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value.toUpperCase())}
                    disabled={feedback === 'success' || !sessionMission}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div className="h-8 mt-3 flex items-center">
                 {feedback === 'error' && (
                   <p className="font-mono text-[14px] font-bold text-red-500 tracking-[0.2em] flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded border border-red-500/20">
                     <AlertTriangle className="w-4 h-4" /> INTEGRITY FAILURE: MISMATCH DETECTED.
                   </p>
                 )}
                 {feedback === 'success' && (
                   <p className="font-mono text-[14px] font-bold text-green-500 tracking-[0.2em] flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded border border-green-500/20">
                     <CheckCircle2 className="w-4 h-4" /> BREACH SUCCESSFUL.
                   </p>
                 )}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="font-mono text-[15px] text-white/60 tracking-widest uppercase">
                  {sessionMission && `Time Stability: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                </div>
                
                {feedback !== 'success' ? (
                  <button type="submit" disabled={!sessionMission} className="relative group overflow-hidden bg-transparent border-2 border-[var(--current-theme-color)] text-[var(--current-theme-color)] font-mono font-bold uppercase tracking-[0.2em] text-[18px] py-3 px-10 rounded-sm transition-all duration-300 hover:bg-[var(--current-theme-color)] hover:text-black hover:shadow-[0_0_25px_var(--current-theme-color)] hover:-translate-y-1 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                    <span className="relative z-10">SUBMIT</span>
                    <div className="absolute inset-0 h-full w-full bg-[var(--current-theme-color)]/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out"></div>
                  </button>
                ) : (
                  <button type="button" onClick={startNewMission} className="relative overflow-hidden text-black font-sans font-bold uppercase tracking-[0.12em] text-[16px] py-3 px-8 rounded hover:bg-white transition-all duration-300 bg-[var(--current-theme-color)] shadow-[0_0_20px_color-mix(in_srgb,var(--current-theme-color)_40%,transparent)]">
                    CONTINUE
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Removed rules from here */}

      </div>
    </motion.div>
  );
}


// --- Leaderboard ---
function Leaderboard({ user, entries, onExit }: { user: UserData, entries: LeaderboardEntry[], onExit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="cq-subtitle mb-2">Global Operational Standings</h2>
          <h1 className="cq-title">Leaderboard</h1>
        </div>
        <button onClick={onExit} className="cyber-button text-xs py-2">Back to Dash</button>
      </header>

      <div className="glass-panel rounded-lg overflow-hidden">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="p-6 text-xs uppercase opacity-50 tracking-widest">Rank</th>
              <th className="p-6 text-xs uppercase opacity-50 tracking-widest">Operative</th>
              <th className="p-6 text-xs uppercase opacity-50 tracking-widest text-right">XP_Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.uid} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${entry.uid === user.uid ? 'bg-white/10' : ''}`}>
                <td className="p-6">
                  <span className={`text-xl font-display ${idx < 3 ? 'font-bold text-[var(--current-theme-color)]' : 'opacity-40'}`}>
                    {idx + 1 < 10 ? '0' : ''}{idx + 1}
                  </span>
                </td>
                <td className="p-6 font-bold tracking-tight">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 opacity-30" />
                    {entry.callsign}
                    {entry.uid === user.uid && <span className="text-[9px] px-1 bg-white/20 rounded">YOU</span>}
                  </div>
                </td>
                <td className={`p-6 text-right font-display text-lg ${idx < 3 ? 'text-[var(--current-theme-color)]' : ''}`}>
                  {entry.points.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="p-24 text-center text-white/20 font-mono text-sm animate-pulse uppercase tracking-[0.2em]">
            SYNCHRONIZING_GLOBAL_DATA...
          </div>
        )}
      </div>
    </motion.div>
  );
}
