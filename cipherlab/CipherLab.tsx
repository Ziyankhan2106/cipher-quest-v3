import React, { useState, useEffect, useCallback } from 'react';
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
  callsign: string;
  theme: 'cyan' | 'green' | 'purple' | 'orange' | 'magenta';
  totalPoints: number;
  completedLevelIds: string[];
  usedWords?: string[];
}

interface LeaderboardEntry {
  uid: string;
  callsign: string;
  points: number;
}

const THEMES: Record<string, string> = {
  cyan: '#00e5ff',
  green: '#00ff88',
  purple: '#b200ff',
  orange: '#ff8800',
  magenta: '#ff00aa'
};

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

async function updateThemeAPI(theme: string) {
  try {
    await fetch('/api/cipherlab/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ theme }),
    });
  } catch {}
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
      setUser(profile);
      setLoading(false);
      setLeaderboard(await fetchLeaderboard());
      setGlobalXp(authUser.xp);
    })();
  }, [authUser]);

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

  const handleThemeChange = async (theme: UserData['theme']) => {
    if (!user) return;
    setUser(prev => prev ? ({ ...prev, theme }) : null);
    await updateThemeAPI(theme);
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-black">
      <motion.div 
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-[#00e5ff] font-mono text-xl tracking-[0.3em]"
      >
        BOOTING_SYSTEM...
      </motion.div>
    </div>
  );

  return (
    <div 
      className="relative min-h-screen terminal-grid selection:bg-white selection:text-black"
      style={{ '--current-theme-color': THEMES[user?.theme || 'cyan'] } as any}
    >
      <div className="scanline" />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] opacity-20 blur-[120px]" style={{ backgroundColor: THEMES[user?.theme || 'cyan'] }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] opacity-20 blur-[120px]" style={{ backgroundColor: THEMES[user?.theme || 'cyan'] }} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {view === 'dash' && user && (
            <Dashboard user={user} leaderboard={leaderboard} onStartLab={() => setView('lab')} onViewLeaderboard={() => setView('leaderboard')} onThemeChange={handleThemeChange} />
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
        <nav className="fixed top-0 left-0 w-full z-40 px-6 py-4 flex justify-between items-center glass-panel">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="w-10 h-10 flex items-center justify-center border border-white/20 rounded-sm hover:bg-white/10 transition-colors" title="Back to CipherQuest">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </a>
            <div className="w-10 h-10 flex items-center justify-center border border-white/20 rounded-sm" style={{ borderColor: THEMES[user.theme] }}>
              <Shield className="w-5 h-5" style={{ color: THEMES[user.theme] }} />
            </div>
            <div>
              <div className="text-xs font-mono uppercase opacity-50 tracking-widest">Operative</div>
              <div className="font-mono font-bold tracking-tight">{user.callsign}</div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-xs font-mono uppercase opacity-50 tracking-widest">TOTAL_XP</div>
              <div className="font-display text-xl font-bold" style={{ color: THEMES[user.theme] }}>{globalXp.toLocaleString()}</div>
            </div>
            <button onClick={() => setView('dash')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Terminal className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

// --- Dashboard ---
function Dashboard({ user, leaderboard, onStartLab, onViewLeaderboard, onThemeChange }: { 
  user: UserData, leaderboard: LeaderboardEntry[], onStartLab: () => void, onViewLeaderboard: () => void, onThemeChange: (t: UserData['theme']) => void
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-8">
        <header className="space-y-2">
          <div className="text-xs font-mono uppercase opacity-50 tracking-[0.4em]">Sector_01 // Missions</div>
          <h1 className="text-5xl font-display font-bold uppercase tracking-tighter">Cipher_Lab</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div onClick={onStartLab} className="glass-panel p-8 rounded-sm group cursor-pointer hover:border-current-theme transition-all duration-500" style={{ '--current-theme-color': THEMES[user.theme] } as any}>
            <div className="flex justify-between items-start mb-12">
              <Terminal className="w-10 h-10 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: THEMES[user.theme] }} />
              <div className="text-xs font-mono px-3 py-1 bg-white/10 rounded-full">ACTIVE_LAB</div>
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold mb-2 uppercase">Neural Lab</h3>
              <p className="text-white/40 text-sm font-mono leading-relaxed group-hover:text-white/60 transition-colors mb-6">
                EXECUTE DECRYPTION SEQUENCES. CHALLENGE YOUR NEURAL CAPACITY IN REAL-TIME.
              </p>
              <button onClick={(e) => { e.stopPropagation(); onStartLab(); }} className="cyber-button text-xs py-3 w-full group-hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(0,229,255,0.3)]" style={{ backgroundColor: THEMES[user.theme] }}>
                ENTER_LAB
              </button>
            </div>
            <div className="mt-8 h-1 w-0 bg-[var(--current-theme-color)] group-hover:w-full transition-all duration-700" />
          </div>

          <div onClick={onViewLeaderboard} className="glass-panel p-8 rounded-sm overflow-hidden cursor-pointer hover:border-white/40 transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-mono uppercase opacity-50 tracking-widest">Global Rankings</h3>
              <Globe className="w-4 h-4 opacity-30" />
            </div>
            <div className="space-y-4">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex justify-between items-center text-sm font-mono border-b border-white/5 pb-2">
                  <div className="flex items-center gap-4">
                    <span className="opacity-20 w-4">{i+1}</span>
                    <span className="truncate max-w-[120px]">{entry.callsign}</span>
                  </div>
                  <span className="font-bold tracking-wider" style={{ color: THEMES[user.theme] }}>{entry.points.toLocaleString()} XP</span>
                </div>
              ))}
              {leaderboard.length === 0 && <div className="text-[10px] opacity-30 text-center py-4">FETCHING_RANKINGS...</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <div className="glass-panel p-6 rounded-sm">
          <h4 className="text-xs font-mono uppercase opacity-50 mb-4 tracking-widest">Operative Logs</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm py-2 border-b border-white/5">
              <span className="text-white/40">COMPLETED_CIPHERS</span>
              <span className="font-mono">{user.completedLevelIds.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-white/40">SYSTEM_STATUS</span>
              <span className="font-mono text-green-500">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-sm">
          <h4 className="text-xs font-mono uppercase opacity-50 mb-4 tracking-widest">UI_Aesthetic</h4>
          <div className="flex gap-3">
            {(Object.keys(THEMES) as UserData['theme'][]).map(t => (
              <button key={t} onClick={() => onThemeChange(t)}
                className={`w-9 h-9 rounded-sm border-2 transition-all ${user.theme === t ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
                style={{ backgroundColor: THEMES[t], borderColor: user.theme === t ? 'white' : 'transparent' }}
              />
            ))}
          </div>
        </div>

        <a href="/dashboard" className="w-full flex items-center justify-center gap-2 p-4 text-xs font-mono uppercase text-white/40 hover:text-[#00e5ff] hover:bg-[#00e5ff]/10 transition-all border border-transparent hover:border-[#00e5ff]/20">
          <ArrowLeft className="w-4 h-4" /> Back to CipherQuest
        </a>
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

  const startNewMission = useCallback(() => {
    const level = user.completedLevelIds.length < 5 ? 1 : user.completedLevelIds.length < 12 ? 2 : 3;
    const mission = generateMission(level, user.usedWords || []);
    setSessionMission(mission);
    setUserInput('');
    setHintsCount(0);
    setTimeLeft(300);
    setIsActive(true);
    setStartTime(Date.now());
    setFeedback('none');
  }, [user.completedLevelIds]);

  useEffect(() => { startNewMission(); }, [startNewMission]);

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
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [THEMES[user.theme], '#ffffff'] });
    } else {
      setFeedback('error');
      setUserInput('');
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
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 w-full max-w-[1400px] mx-auto px-4 lg:px-8 py-8 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h1 className="text-3xl font-display font-bold uppercase tracking-[0.2em] text-[color:var(--current-theme-color)]">
          CipherLab
        </h1>
        <button onClick={onExit} className="text-white/40 hover:text-white flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest transition-colors">
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>

      <div className="w-full flex flex-col xl:flex-row gap-12 items-stretch min-h-full">
        {/* Left Column */}
        <div className="flex-1 flex flex-col w-full max-w-[400px] xl:max-w-none relative z-10">
          <div className="glass-panel p-8 flex-1 flex flex-col border border-[color:var(--current-theme-color)]/20 shadow-2xl relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--current-theme-color)]/5 to-transparent pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
              <Zap className="text-[color:var(--current-theme-color)] animate-[pulse_2s_infinite]" />
              <h2 className="font-sans text-xs tracking-[0.4em] uppercase text-[color:var(--current-theme-color)] font-bold">CipherLab Protocol</h2>
            </div>
            
            <div className="flex flex-col gap-8 mb-6 flex-1">
              <p className="font-mono text-sm leading-relaxed text-white/80 border-l-2 border-[color:var(--current-theme-color)] pl-4">
                Welcome to the Syndicate Core simulation. Each sequence demands focus.
              </p>
              
              {sessionMission ? (
                <>
                  <div className="mt-2 border border-[color:var(--current-theme-color)]/20 bg-[color:var(--current-theme-color)]/5 p-3 rounded">
                    <span className="text-[color:var(--current-theme-color)] font-bold tracking-[0.2em] uppercase text-[9px]">&gt; Target Algorithm:</span>
                    <div className="text-white mt-1 font-mono text-[11px]">{sessionMission.type.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="mt-2 border border-[color:var(--current-theme-color)]/20 bg-[color:var(--current-theme-color)]/5 p-3 rounded">
                    <span className="text-[color:var(--current-theme-color)] font-bold tracking-[0.2em] uppercase text-[9px]">&gt; Known Pattern:</span>
                    <div className="text-white mt-1 font-mono text-[11px] italic">{sessionMission.schemeHint}</div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3">
                    <button onClick={revealHint} disabled={hintsCount >= sessionMission.originalText.length || !isActive || globalXp <= 0}
                            className="w-full py-3 border border-[color:var(--current-theme-color)]/20 text-[color:var(--current-theme-color)] hover:bg-[color:var(--current-theme-color)]/10 transition-colors text-[10px] tracking-[0.2em] font-bold disabled:opacity-30 disabled:pointer-events-none rounded flex items-center justify-center gap-2">
                      <Lightbulb className="w-4 h-4" /> REVEAL INTEL (-20 XP)
                    </button>
                    <button onClick={handleSkip} disabled={!isActive}
                            className="w-full py-3 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black transition-colors text-[10px] tracking-[0.2em] font-bold disabled:opacity-30 disabled:pointer-events-none rounded">
                      SKIP SEQUENCE
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-10">
                  <button onClick={startNewMission} className="bg-[color:var(--current-theme-color)] text-black font-bold uppercase tracking-[0.2em] text-[12px] px-8 py-4 rounded hover:shadow-[0_0_20px_var(--current-theme-color)] transition-all">
                    Initialize Sequence
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-[1.5] flex flex-col gap-6 w-full">
          <div className={`bg-[#0a0a0c]/80 border border-white/10 backdrop-blur-xl rounded-xl p-10 relative overflow-hidden shadow-xl ${!sessionMission ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="font-sans font-bold text-[10px] text-white/30 uppercase tracking-[0.3em] mb-6 flex justify-between">
              <span>Intercepted Ciphertext</span>
              <Shield className="w-4 h-4 text-[color:var(--current-theme-color)]" />
            </div>
            
            <div className="font-mono text-[36px] leading-[1.2] text-[color:var(--current-theme-color)] tracking-[0.1em] break-all">
              <span className="text-white/10 select-none mr-4">&gt;</span>{sessionMission?.encryptedText || 'AWAITING_INPUT...'}
            </div>
            
            {hintsCount >= 1 && (
               <div className="mt-8 border-t border-white/10 pt-6">
                 <span className="text-[9px] font-mono uppercase opacity-40 block mb-2 tracking-widest text-white">Partial_Reconstruction</span>
                 <div className="font-mono text-2xl tracking-[0.4em] text-white font-bold">{getRevealedWord()}</div>
               </div>
            )}
          </div>

          <div className={`glass-panel p-10 relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 rounded-xl ${!sessionMission && feedback !== 'success' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="font-sans font-bold text-[10px] uppercase tracking-[0.3em] mb-8 flex justify-between text-[color:var(--current-theme-color)]">
              <span>Decryption Input</span>
              {feedback === 'success' ? <span>[DECRYPTED]</span> : sessionMission ? <span className="animate-pulse">[AWAITING ANSWER]</span> : null}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="relative flex items-center bg-[#050505]/80 rounded-lg p-6 border border-white/5 focus-within:border-white/20 transition-colors">
                <span className="font-mono text-[32px] text-white/20 select-none mr-4">&gt;</span>
                <input 
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value.toUpperCase())}
                  disabled={feedback === 'success' || !sessionMission}
                  className="w-full bg-transparent text-white font-mono text-[40px] tracking-[0.1em] outline-none uppercase placeholder:text-white/10"
                  placeholder="ENTER PLAINTEXT..."
                  spellCheck={false}
                />
              </div>

              <div className="h-8 mt-6 flex items-center">
                 {feedback === 'error' && (
                   <p className="font-mono text-[12px] font-bold text-red-500 tracking-[0.2em] flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded border border-red-500/20">
                     <AlertTriangle className="w-4 h-4" /> INTEGRITY FAILURE: MISMATCH DETECTED.
                   </p>
                 )}
                 {feedback === 'success' && (
                   <p className="font-mono text-[12px] font-bold text-green-500 tracking-[0.2em] flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded border border-green-500/20">
                     <CheckCircle2 className="w-4 h-4" /> BREACH SUCCESSFUL.
                   </p>
                 )}
              </div>

              <div className="mt-8 flex justify-between items-center">
                <div className="font-mono text-[10px] text-white/50 tracking-widest uppercase">
                  {sessionMission && `Time Stability: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                </div>
                
                {feedback !== 'success' ? (
                  <button type="submit" disabled={!sessionMission} className="bg-[color:var(--current-theme-color)] text-black font-sans font-bold uppercase tracking-[0.2em] text-[14px] py-4 px-12 rounded transition-all duration-300 hover:shadow-[0_0_30px_color-mix(in srgb, var(--current-theme-color) 40%, transparent)] hover:-translate-y-1 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                    SUBMIT
                  </button>
                ) : (
                  <button type="button" onClick={startNewMission} className="relative overflow-hidden text-black font-sans font-bold uppercase tracking-[0.2em] text-[14px] py-4 px-12 rounded hover:bg-white transition-all duration-300" style={{ backgroundColor: THEMES[user.theme], boxShadow: '0 0 30px color-mix(in srgb, var(--current-theme-color) 40%, transparent)' }}>
                    CONTINUE
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
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
          <h2 className="text-xs font-mono uppercase opacity-50 tracking-[0.4em] mb-2">Global Operational Standings</h2>
          <h1 className="text-4xl font-display font-bold uppercase tracking-tight">Leaderboard</h1>
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
                  <span className={`text-xl font-display ${idx < 3 ? 'font-bold' : 'opacity-40'}`} style={idx < 3 ? { color: THEMES[user.theme] } : {}}>
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
                <td className="p-6 text-right font-display text-lg" style={idx < 3 ? { color: THEMES[user.theme] } : {}}>
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
