import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { X as XIcon, Users, Home, User, Radar, Lock, AlertTriangle, AlertCircle, Trophy, Hourglass, Zap, Settings, ArrowRightLeft, Send, Award, Skull, Handshake } from 'lucide-react';
import confetti from 'canvas-confetti';


const Multiplayer = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchHint, setSearchHint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [matchFormat, setMatchFormat] = useState(1);

  const [invites, setInvites] = useState<any[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<any[]>([]);
  const [match, setMatch] = useState<any>(null);

  const [answer, setAnswer] = useState('');
  const [roundFeedback, setRoundFeedback] = useState<{winner: string|null, correct: string|null}|null>(null);
  const [localRound, setLocalRound] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [roundSplash, setRoundSplash] = useState<{show: boolean, num: number}>({show: false, num: 0});
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lastConfettiMatch, setLastConfettiMatch] = useState('');

  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const showError = (msg: string) => setErrorMsg(msg);

  const api = async (path: string, options: any = {}) => {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  const runSearch = async (q: string) => {
    showError('');
    if (q.length < 2) {
      setSearchHint('Type at least 2 characters.');
      setSearchResults([]);
      return;
    }
    try {
      const data = await api(`/api/multiplayer/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.users || []);
      if (!data.users || data.users.length === 0) {
        setSearchHint('No operatives match that callsign.');
      } else {
        setSearchHint('Select invite to send a duel signal.');
      }
    } catch (e: any) {
      showError(e.message);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (val.trim().length >= 2) runSearch(val.trim());
    }, 350);
  };

  const sendInvite = async (toUid: string) => {
    showError('');
    try {
      await api('/api/multiplayer/invite', {
        method: 'POST',
        body: JSON.stringify({ toUid, matchFormat }),
      });
      setSearchHint('Invite sent. Waiting for them to accept.');
    } catch (e: any) {
      showError(e.message);
    }
  };

  const acceptInvite = async (inviteId: string) => {
    showError('');
    try {
      const data = await api(`/api/multiplayer/invite/${encodeURIComponent(inviteId)}/accept`, {
        method: 'POST',
      });
      if (data.match) setMatch(data.match);
      refreshMatch();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const declineInvite = async (inviteId: string) => {
    showError('');
    // Optimistic UI: remove from local state immediately
    setInvites(prev => prev.filter(inv => inv.inviteId !== inviteId));
    try {
      await api(`/api/multiplayer/invite/${encodeURIComponent(inviteId)}/decline`, {
        method: 'POST',
      });
      // Backend update is handled, local state already updated
    } catch (e: any) {
      showError(e.message);
      refreshInvites(); // Revert on error
    }
  };

  const clearInvite = async (inviteId: string) => {
    // Optimistic UI: remove from local state immediately
    setOutgoingInvites(prev => prev.filter(inv => inv.inviteId !== inviteId));
    try {
      await api(`/api/multiplayer/invite/${encodeURIComponent(inviteId)}/clear`, {
        method: 'POST',
      });
    } catch {
      refreshInvites(); // Revert on error
    }
  };

  const submitAnswer = async () => {
    if (!match || !match.matchId) return;
    showError('');
    try {
      const data = await api(`/api/multiplayer/match/${encodeURIComponent(match.matchId)}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer }),
      });
      if (data.match) {
        setMatch(data.match);
        if (data.match.status === 'done') refreshUser();
      }
    } catch (e: any) {
      showError(e.message);
    }
  };

  const ackMatch = async () => {
    if (!match || !match.matchId) return;
    showError('');
    try {
      await api(`/api/multiplayer/match/${encodeURIComponent(match.matchId)}/ack`, {
        method: 'POST',
      });
      setMatch(null);
      setLocalRound(0);
      setAnswer('');
      setShowFinalResults(false);
      refreshUser();
      refreshMatch();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const forfeitMatch = async () => {
    if (!match || !match.matchId) return;
    if (!window.confirm("Are you sure you want to abort this mission? You will forfeit the duel.")) return;
    showError('');
    try {
      await api(`/api/multiplayer/match/${encodeURIComponent(match.matchId)}/forfeit`, {
        method: 'POST',
      });
      refreshMatch();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const refreshInvites = async () => {
    try {
      const incoming = await api('/api/multiplayer/invites/incoming');
      setInvites(incoming.invites || []);
      const outgoing = await api('/api/multiplayer/invites/outgoing');
      // Filter out 'accepted' since they are now matches
      setOutgoingInvites(outgoing.invites?.filter((i: any) => i.status !== 'accepted') || []);
    } catch {}
  };

  const refreshMatch = async () => {
    try {
      const data = await api('/api/multiplayer/active-match');
      setMatch(data.match);
    } catch {}
  };

  const refreshLeaderboard = async () => {
    try {
      const data = await api('/api/multiplayer/leaderboard');
      if (data.entries) setLeaderboard(data.entries);
    } catch {}
  };

  useEffect(() => {
    setSearchQuery('');
    setSearchHint('');
    refreshInvites();
    refreshMatch();
    refreshLeaderboard();
    // Reduce polling lag by checking more frequently or using focus events
    const invInterval = setInterval(refreshInvites, 5000);
    const matchInterval = setInterval(refreshMatch, 3000);
    
    // Add visibility change listener to refresh immediately when returning to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshInvites();
        refreshMatch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(invInterval);
      clearInterval(matchInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Clear answer textbox when round advances and show feedback
  useEffect(() => {
    setAnswer('');
    if (match?.lastRoundCorrectAnswer) {
      const winnerName = match.lastRoundWinner ? (match.usernames[match.lastRoundWinner] || 'Operative') : 'None (Draw)';
      setRoundFeedback({ winner: winnerName, correct: match.lastRoundCorrectAnswer });
      // Keep results visible for a while
      const timer = setTimeout(() => setRoundFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [match?.currentRound, match?.status]);

  // Round Transition Flow Logic
  useEffect(() => {
    if (!match) return;

    // Trigger flow if backend round is ahead of displayed round
    if (match.status === 'open' && match.currentRound > localRound && !isTransitioning) {
      const runRoundFlow = async () => {
        setIsTransitioning(true);
        
        // 1. If not the first round, allow time for round results to be viewed
        if (localRound > 0) {
          await new Promise(r => setTimeout(r, 4500));
          setRoundFeedback(null);
        }

        // 2. Show Round Start Splash
        setRoundSplash({ show: true, num: match.currentRound });
        await new Promise(r => setTimeout(r, 2000));
        setRoundSplash({ show: false, num: 0 });

        // 3. Finally show the new round's question
        setLocalRound(match.currentRound);
        setIsTransitioning(false);
      };
      runRoundFlow();
    } else if (match.status === 'done' && !showFinalResults && !isTransitioning) {
      const finishMatch = async () => {
        setIsTransitioning(true);
        // If the match ended normally (not forfeit), pause to show last round results
        if (match.lastRoundCorrectAnswer && match.resultReason !== 'forfeit') {
          await new Promise(r => setTimeout(r, 6000));
          setRoundFeedback(null);
        }
        setShowFinalResults(true);
        setIsTransitioning(false);
      };
      finishMatch();
    } else if (match.status === 'open' && localRound === 0) {
        // Catch-up for initial match load
        setLocalRound(0); // Ensure flow triggers
    }
  }, [match?.currentRound, match?.status, localRound, isTransitioning, showFinalResults]);

  let duelStatus = '';
  if (match && match.status === 'open') {
    if (match.myAnswered) {
      duelStatus = match.opponentAnswered ? "Both answers locked. Resolving…" : "Answer locked in. Waiting for opponent…";
    } else {
      duelStatus = match.opponentAnswered ? "⚡ Your opponent has already answered! Hurry up!" : "Decrypt and enter the original message below.";
    }
  }

  let resultTitle = '';
  let resultSub = '';
  let resultXp = '';
  let resultClass = '';

  if (match && match.status === 'done') {
    const reason = match.resultReason;
    const w = match.winnerUid;
    const xpReward = match.xpReward || 0;
    
    if (reason === "none_correct") {
      resultClass = "mp-result-line--tie";
      resultTitle = "No winner";
      resultSub = "Neither operative submitted the correct decode.";
    } else if (w === user?.uid) {
      resultClass = "mp-result-line--win";
      resultTitle = "You win!";
      const myRow = match.answers && match.answers[user?.uid];
      if (myRow && myRow.correct) {
        resultSub = "You decoded it first! Well done, operative.";
      } else {
        resultSub = "Correct decode — you take the round.";
      }
      resultXp = `+${xpReward} XP earned`;
    } else if (w) {
      resultClass = "mp-result-line--lose";
      resultTitle = "You lose";
      const names = match.usernames || {};
      const name = names[w] || "Opponent";
      const myRow = match.answers && match.answers[user?.uid || ''];
      if (myRow && !myRow.correct) {
        resultSub = `Wrong decode. ${name} had the correct answer.`;
      } else {
        resultSub = `${name} decoded it first.`;
      }
      resultXp = "0 XP";
    } else {
      resultClass = "text-yellow-400";
      resultTitle = "Draw";
      resultSub = "Outcome could not be determined.";
    }
    
    if (w === user?.uid && match.matchId !== lastConfettiMatch) {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['#59f2ff', '#ffffff'] });
        setLastConfettiMatch(match.matchId);
    }
  }

  const myScore = match?.scores?.[user?.uid || ''] || 0;
  const opUid = match?.uids?.find((u: string) => u !== user?.uid) || '';
  const opponentScore = match?.scores?.[opUid] || 0;

  const roundDots = () => {
    if (!match) return [];
    const dots = [];
    const uid = user?.uid || '';
    for (let i = 0; i < match.totalRounds; i++) {
      const result = match.roundResults?.find((r: any) => r.round === i);
      if (result) {
        if (result.winnerUid === uid) dots.push({ round: i, status: 'won' });
        else if (result.winnerUid === null) dots.push({ round: i, status: 'draw' });
        else dots.push({ round: i, status: 'lost' });
      } else if (i === match.currentRound && match.status === 'open') {
        dots.push({ round: i, status: 'active' });
      } else {
        dots.push({ round: i, status: 'pending' });
      }
    }
    return dots;
  };

  return (
    <div className="h-screen w-screen bg-[#020205] flex flex-col text-white relative overflow-hidden font-sans selection:bg-[color:var(--current-theme-color)]/30">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center opacity-15 mix-blend-luminosity"></div>
        <div className="absolute top-[10%] left-[5%] w-[35vw] h-[35vw] rounded-full mix-blend-screen opacity-40 pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--current-theme-color) 10%, transparent)', filter: 'blur(160px)' }}></div>
        <div className="absolute bottom-[5%] right-[5%] w-[40vw] h-[40vw] rounded-full mix-blend-screen opacity-30 pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--current-theme-color) 8%, transparent)', filter: 'blur(180px)' }}></div>
        <div className="absolute inset-0 grid-bg opacity-[0.08] pointer-events-none"></div>
        <div className="scanlines opacity-40"></div>
        <div className="absolute inset-0 bg-radial from-transparent to-black/90 pointer-events-none"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-10 pt-8">
        <div className="flex items-center gap-3">
          <Users className="text-[color:var(--current-theme-color)]" size={24} />
          <span className="font-display text-2xl uppercase tracking-widest">Multiplayer Duel</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right flex flex-col items-end">
            <div className="text-[10px] uppercase font-mono tracking-[0.3em] text-white/40 mb-1">Operator</div>
            <div className="font-display text-lg uppercase tracking-widest text-[color:var(--current-theme-color)] flex items-center gap-2">
              <span>{user?.username || 'UNASSIGNED'}</span>
              <User size={18} />
            </div>
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 transition-all rounded outline-none border border-[color:var(--current-theme-color)]/20 shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
                   onClick={() => navigate('/dashboard')}>
               <Home size={18} className="text-[color:var(--current-theme-color)]" />
               <span className="font-mono text-[10px] text-white tracking-widest uppercase">Return to Nexus</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8 hide-scrollbar">
        <div className="w-full space-y-8">

          {/* Lobby (always visible when no active match) */}
          {!match && (
            <>
            {/* Hero Banner */}
            <div className="glass-panel border border-[color:var(--current-theme-color)]/20 p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--current-theme-color)]/10 via-transparent to-red-500/5 pointer-events-none"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[color:var(--current-theme-color)] to-red-500 shadow-[0_0_15px_var(--current-theme-color)]"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[color:var(--current-theme-color)]/10 blur-[120px] pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#0a0a0f] border border-[color:var(--current-theme-color)]/50 flex items-center justify-center rounded-lg shadow-[0_0_25px_color-mix(in_srgb,var(--current-theme-color)_40%,transparent)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[color:var(--current-theme-color)]/10 animate-[pulse_3s_ease-in-out_infinite]"></div>
                    <User size={36} className="text-[color:var(--current-theme-color)] drop-shadow-[0_0_10px_var(--current-theme-color)]" />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[color:var(--current-theme-color)] mb-1 flex items-center gap-2">
                      &gt; Arena Operative
                    </div>
                    <h2 className="font-display text-4xl uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{user?.username || 'UNASSIGNED'}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="font-display text-3xl text-[color:var(--current-theme-color)] drop-shadow-[0_0_8px_var(--current-theme-color)]">{user?.xp || 0}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Total XP</div>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div className="text-center">
                    <div className="font-display text-3xl text-white">{user?.level || 1}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Level</div>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div className="text-center">
                    <div className="font-display text-3xl text-red-500">{invites.length}</div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">Pending</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Search Panel */}
                <div className="glass-panel p-8 border border-[color:var(--current-theme-color)]/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--current-theme-color)]/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[color:var(--current-theme-color)]/10 blur-[80px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <Radar size={16} className="text-[color:var(--current-theme-color)] animate-pulse" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[color:var(--current-theme-color)]">&gt; Challenge Friend</span>
                    </div>
                    <h2 className="font-display text-3xl uppercase mb-2 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Find Operative</h2>
                    <p className="text-white/40 text-xs mb-8">Enter a callsign to find your friend. Send a duel invite and wait for them to accept.</p>

                    {!user && (
                      <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Lock size={16} className="text-red-500 animate-pulse" />
                          <span className="font-mono text-[11px] text-white/70 uppercase tracking-widest">Sign in to challenge operatives</span>
                        </div>
                        <button onClick={() => navigate('/auth')} className="px-6 py-2 bg-red-500/20 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all rounded whitespace-nowrap">Sign In</button>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <input type="text" value={searchQuery} onChange={handleSearchChange} onKeyDown={(e) => e.key === 'Enter' && runSearch(searchQuery)}
                             className="flex-1 bg-[#0a0a0f] border border-white/20 focus:border-[color:var(--current-theme-color)] focus:shadow-[0_0_15px_color-mix(in_srgb,var(--current-theme-color)_30%,transparent)] text-white font-mono tracking-widest uppercase p-5 rounded outline-none transition-all placeholder:text-white/10"
                             placeholder="USERNAME..." maxLength={24} autoComplete="off" />
                      <button onClick={() => runSearch(searchQuery)} className="px-10 py-5 bg-[color:var(--current-theme-color)]/10 border border-[color:var(--current-theme-color)]/50 text-[color:var(--current-theme-color)] hover:bg-[color:var(--current-theme-color)] hover:text-black font-bold font-mono text-[12px] uppercase tracking-[0.3em] hover:shadow-[0_0_20px_var(--current-theme-color)] transition-all rounded">Search</button>
                    </div>

                    {searchResults.length > 0 && (
                      <>
                      <div className="mb-4">
                        <div className="flex items-center gap-4 mb-4 p-4 bg-[#0a0a0f]/50 border border-white/10 rounded">
                          <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest whitespace-nowrap">Rounds:</span>
                          <div className="flex gap-2">
                            {[1, 3, 5, 7].map(r => (
                              <button key={r} onClick={() => setMatchFormat(r)} className={`px-4 py-2 font-mono text-sm font-bold rounded transition-all ${matchFormat === r ? 'bg-[color:var(--current-theme-color)] text-black shadow-[0_0_15px_var(--current-theme-color)]' : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'}`}>Best of {r}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        {searchResults.map(u => (
                          <div key={u.uid} className="flex items-center justify-between bg-black/40 border border-[color:var(--current-theme-color)]/20 px-6 py-4 rounded group hover:border-[color:var(--current-theme-color)]/60 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-[color:var(--current-theme-color)]/20 flex items-center justify-center border border-[color:var(--current-theme-color)]/30">
                                <User size={16} className="text-[color:var(--current-theme-color)]" />
                              </div>
                              <span className="font-mono tracking-widest uppercase text-base text-white/90 group-hover:text-white transition-colors">{u.username}</span>
                            </div>
                            <button onClick={() => sendInvite(u.uid)} className="px-6 py-3 border border-[color:var(--current-theme-color)]/50 text-[color:var(--current-theme-color)] hover:bg-[color:var(--current-theme-color)] hover:text-black font-bold font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded shadow-[inset_0_0_10px_color-mix(in_srgb,var(--current-theme-color)_10%,transparent)]">Challenge ({matchFormat}R)</button>
                          </div>
                        ))}
                      </div>
                      </>
                    )}

                    {searchHint && (
                      <div className="mt-4 border-l-2 border-white/20 pl-4 py-1">
                        <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">{searchHint}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sent Invites */}
                {outgoingInvites.length > 0 && (
                  <div className="glass-panel p-8 border border-[color:var(--current-theme-color)]/20 relative overflow-hidden group">
                     <h2 className="font-display text-2xl uppercase mb-4 text-white">Sent Signals</h2>
                     <div className="space-y-3">
                       {outgoingInvites.map(inv => (
                         <div key={inv.inviteId} className="flex items-center justify-between bg-black/40 border border-white/10 px-6 py-4 rounded">
                           <span className="font-mono text-sm tracking-widest uppercase text-white/80">To <strong className="text-[color:var(--current-theme-color)]">{inv.toUsername}</strong>: {inv.status === 'declined' ? <span className="text-red-500">DECLINED</span> : 'Pending...'}</span>
                           <button onClick={() => clearInvite(inv.inviteId)} className="px-4 py-2 border border-white/20 text-white/50 text-[10px] font-mono tracking-widest uppercase hover:text-white hover:border-white/50 transition-all rounded">Cancel</button>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* Incoming Invites */}
                {invites.length > 0 && (
                  <div className="glass-panel p-8 border border-red-500/50 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={16} className="text-red-500 animate-[pulse_1s_infinite]" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-red-500">&gt; Incoming Signal</span>
                      </div>
                      <h2 className="font-display text-3xl uppercase mb-6 text-white">Challenge Received</h2>
                      <div className="space-y-4">
                        {invites.map(inv => (
                          <div key={inv.inviteId} className="flex flex-col md:flex-row md:items-center justify-between bg-black/50 border border-red-500/30 px-6 py-5 rounded gap-4 shadow-inner">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded bg-red-500/20 flex items-center justify-center border border-red-500/50">
                                <AlertCircle size={20} className="text-red-500 animate-pulse" />
                              </div>
                              <span className="font-mono text-base"><strong className="text-red-500 tracking-widest uppercase">{inv.fromUsername || 'Operative'}</strong> has challenged you. <span className="text-white/40 text-xs">(Best of {inv.roundCount})</span></span>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => acceptInvite(inv.inviteId)} className="px-8 py-3 bg-red-500 text-white font-bold font-mono text-[11px] uppercase tracking-[0.3em] hover:bg-white hover:text-black hover:shadow-[0_0_20px_#ef4444] transition-all rounded shadow-[0_0_10px_rgba(239,68,68,0.5)]">Accept</button>
                              <button onClick={() => declineInvite(inv.inviteId)} className="px-6 py-3 border border-white/20 text-white/50 font-mono text-[11px] uppercase tracking-[0.3em] hover:border-white/50 hover:text-white transition-all rounded">Decline</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div className="lg:col-span-1">
                <div className="glass-panel border border-[color:var(--current-theme-color)]/30 overflow-hidden relative flex flex-col h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--current-theme-color)]/10 blur-[50px] pointer-events-none opacity-50"></div>
                  <div className="p-6 border-b border-white/10 relative z-10 flex items-center justify-between bg-[#0a0a0f]">
                    <div className="flex items-center gap-3">
                      <Trophy className="text-[color:var(--current-theme-color)]" size={20} />
                      <h3 className="font-display text-xl uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Top Operatives</h3>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex flex-col gap-1 p-4">
                      {leaderboard.map((lb, i) => (
                        <div key={lb.uid} className={`flex items-center justify-between py-3 px-4 rounded transition-colors group relative overflow-hidden ${i < 3 ? 'bg-[color:var(--current-theme-color)]/10 border border-[color:var(--current-theme-color)]/30' : 'hover:bg-white/5'}`}>
                          <div className="flex items-center gap-4 relative z-10">
                            <span className={`font-display text-xl font-bold w-6 ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_#facc15]' : (i === 1 ? 'text-gray-300' : (i === 2 ? 'text-amber-600' : 'text-white/30'))}`}>#{i+1}</span>
                            <span className="font-mono text-sm tracking-widest uppercase text-white/90 group-hover:text-white">{lb.callsign}</span>
                          </div>
                          <span className="font-mono text-xs text-[color:var(--current-theme-color)] font-bold relative z-10">{lb.points} XP</span>
                        </div>
                      ))}
                      {leaderboard.length === 0 && (
                        <div className="text-center py-8">
                           <Hourglass size={36} className="text-white/20 mx-auto mb-2" />
                           <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest">No intel acquired yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}

          {/* Active Duel */}
          {match && match.status === 'open' && (
            <>
            {roundSplash.show && (
              <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                <div className="font-mono text-sm tracking-[0.4em] text-[color:var(--current-theme-color)] uppercase mb-4">Initializing Round</div>
                <div className="font-display text-8xl uppercase text-white tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">ROUND {roundSplash.num}</div>
                <div className="w-48 h-1 bg-[color:var(--current-theme-color)] mt-8 animate-pulse shadow-[0_0_20px_var(--current-theme-color)]"></div>
              </div>
            )}
            
            {!roundSplash.show && (
            <div className="glass-panel border border-[color:var(--current-theme-color)]/30 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--current-theme-color)]/5 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[color:var(--current-theme-color)]/10 blur-[100px] pointer-events-none"></div>
              
              <div className="p-8 pb-4 flex flex-col gap-4 border-b border-white/10 relative z-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-[color:var(--current-theme-color)] animate-[pulse_2s_infinite]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[color:var(--current-theme-color)]">Live Duel</span>
                    <span className="font-mono text-[10px] px-3 py-1 bg-[color:var(--current-theme-color)]/20 border border-[color:var(--current-theme-color)]/30 rounded text-[color:var(--current-theme-color)]">Round {(match.currentRound || 0) + 1} / {match.totalRounds}</span>
                  </div>
                  <button onClick={forfeitMatch} className="text-[10px] text-red-400/60 hover:text-red-400 font-mono uppercase tracking-tighter transition-colors border border-red-500/20 px-3 py-1 bg-red-500/5 rounded">[ Abort Mission ]</button>

                  {/* Score Display */}
                  <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/10 shadow-inner">
                    <span className="font-display text-xl uppercase flex items-center gap-2 text-[color:var(--current-theme-color)]">
                      {myScore} <span className="font-mono text-[9px] text-white/40">PTS</span>
                    </span>
                    <span className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em]">vs</span>
                    <span className="font-display text-xl uppercase flex items-center gap-2 text-red-500">
                      {opponentScore} <span className="font-mono text-[9px] text-white/40">PTS</span>
                    </span>
                  </div>
                </div>

                {/* Round Progress Dots */}
                <div className="flex items-center justify-center gap-2">
                  {roundDots().map((r, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${r.status === 'won' ? 'bg-[color:var(--current-theme-color)] text-black shadow-[0_0_10px_var(--current-theme-color)]' : (r.status === 'lost' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : (r.status === 'draw' ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' : (r.status === 'active' ? 'bg-white/20 text-white border-2 border-[color:var(--current-theme-color)] animate-pulse' : 'bg-white/5 text-white/20 border border-white/10')))}`}>
                      {r.round + 1}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 relative z-10">
                <div className="flex flex-col gap-6">
                  {/* Ciphertext Display */}
                  <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl p-10 relative overflow-hidden shadow-xl">
                    <div className="absolute left-0 top-0 h-full w-1 bg-white/20 animate-pulse"></div>
                    <div className="font-sans font-bold text-[10px] text-[color:var(--current-theme-color)] uppercase tracking-[0.3em] mb-6 flex justify-between">
                      <span>Target Payload (Encrypted)</span>
                      <Zap size={16} className="animate-[pulse_2s_infinite]" />
                    </div>
                    <div className="font-mono text-[42px] leading-[1.2] text-white tracking-[0.1em] break-all drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      <span className="text-white/10 select-none mr-4">&gt;</span>{match.question}
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="flex flex-col items-center justify-center -my-6 z-20 h-20 relative">
                     <div className="w-[2px] h-full bg-gradient-to-b from-[color:var(--current-theme-color)]/0 via-[color:var(--current-theme-color)] to-[color:var(--current-theme-color)]/0 absolute opacity-50"></div>
                     <div className="w-1.5 h-6 bg-[color:var(--current-theme-color)] absolute animate-[bounce_2s_infinite] shadow-[0_0_15px_var(--current-theme-color)] rounded-full z-10"></div>
                     <div className="px-6 py-2 bg-[#0a0a0f] border border-[color:var(--current-theme-color)]/50 rounded-full relative z-20 flex items-center gap-3 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        <Settings size={16} className="text-[color:var(--current-theme-color)] animate-[spin_4s_linear_infinite]" />
                        <span className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Processing Node</span>
                        <ArrowRightLeft size={16} className="text-[color:var(--current-theme-color)]" />
                     </div>
                  </div>

                  {/* Plaintext Input Area */}
                  <div className="glass-panel p-10 relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 rounded-xl border border-[color:var(--current-theme-color)]/30">
                    <div className="absolute left-0 top-0 h-full w-1 transition-colors duration-500 bg-[color:var(--current-theme-color)]"></div>

                    <div className="font-sans font-bold text-[10px] uppercase tracking-[0.3em] mb-8 flex justify-between text-[color:var(--current-theme-color)]">
                      <span>Encryption Protocol: {match.cipherType}</span>
                      <span className="animate-pulse">[AWAITING DECRYPTION]</span>
                    </div>

                    {match.cipherHint && (
                      <div className="mb-6 font-mono text-[11px] text-white/70 bg-[#0a0a0f]/50 p-4 border border-white/5 rounded">
                        <span className="text-[color:var(--current-theme-color)] font-bold uppercase">&gt; Intel:</span> {match.cipherHint}
                      </div>
                    )}

                    <div className="relative flex items-center bg-[#0a0a0f]/50 rounded-lg p-6 border border-white/5 focus-within:border-white/20 transition-colors">
                      <span className="font-mono text-[32px] text-white/20 select-none mr-4">&gt;</span>
                      <input 
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && !match.myAnswered && submitAnswer()}
                        disabled={match.myAnswered}
                        className="w-full bg-transparent text-white font-mono text-[40px] tracking-[0.1em] outline-none uppercase placeholder:text-white/10 disabled:opacity-40 disabled:border-white/5"
                        placeholder="ENTER PLAINTEXT..."
                        spellCheck="false"
                      />
                    </div>

                    <div className="mt-8 flex justify-end">
                       <button onClick={submitAnswer} disabled={match.myAnswered}
                               className="px-10 py-5 bg-[color:var(--current-theme-color)] text-black font-bold font-mono text-[12px] uppercase tracking-[0.3em] hover:bg-white hover:shadow-[0_0_30px_var(--current-theme-color)] transition-all disabled:opacity-20 disabled:cursor-not-allowed rounded shadow-[0_0_15px_color-mix(in_srgb,var(--current-theme-color)_50%,transparent)] flex items-center gap-3">
                         Execute Decryption <Send size={16} />
                       </button>
                    </div>

                    <div className="mt-6 flex justify-center">
                      <p className={`font-mono text-[11px] px-4 py-2 rounded uppercase tracking-widest transition-colors ${match.myAnswered ? 'bg-[color:var(--current-theme-color)]/20 text-[color:var(--current-theme-color)]' : 'bg-white/5 text-white/50'}`}>{duelStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
            </>
          )}

          {/* Match Results */}
          {match && match.status === 'done' && showFinalResults && (
            <div className={`glass-panel p-16 text-center border overflow-hidden relative ${match.winnerUid === user?.uid ? 'border-[color:var(--current-theme-color)]' : 'border-red-500/50'}`}>
              <div className={`absolute inset-0 bg-radial from-transparent ${match.winnerUid === user?.uid ? 'to-[color:var(--current-theme-color)]/10' : 'to-red-500/10'}`}></div>
              
              <div className="flex justify-center mb-6">
                {match.winnerUid === user?.uid ? (
                    <Award size={80} className={`drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-[bounce_2s_infinite] ${resultClass}`} />
                ) : match.winnerUid ? (
                    <Skull size={80} className={`drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-[bounce_2s_infinite] ${resultClass}`} />
                ) : (
                    <Handshake size={80} className={`drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-[bounce_2s_infinite] ${resultClass}`} />
                )}
              </div>
              
              <div className={`relative z-10 font-display text-7xl uppercase mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${resultClass}`}>{resultTitle}</div>
              <p className="relative z-10 text-white/80 text-lg mb-8 font-mono uppercase tracking-[0.2em]">{resultSub}</p>
              
              {resultXp && (
                <div className={`relative z-10 font-mono text-3xl font-bold mb-12 py-4 px-8 inline-block border rounded bg-black/40 shadow-inner ${resultXp.includes('+') ? 'text-[color:var(--current-theme-color)] border-[color:var(--current-theme-color)]/30' : 'text-white/40 border-white/10'}`}>
                  {resultXp}
                </div>
              )}
              
              <div className="relative z-10">
                <button onClick={ackMatch} className="px-12 py-5 border border-white/20 text-white uppercase tracking-[0.4em] font-mono text-[12px] font-bold hover:bg-white hover:text-black hover:shadow-[0_0_30px_#ffffff] transition-all duration-300 outline-none focus-visible:ring-2">Return to Network</button>
              </div>
            </div>
          )}

          {roundFeedback && (
          <div className="fixed top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4">
            <div className="tactical-panel bg-[#0a0a0f]/98 border-[color:var(--current-theme-color)] p-6 shadow-[0_0_50px_rgba(0,229,255,0.3)] animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                <span className="font-mono text-xs uppercase tracking-widest text-[color:var(--current-theme-color)]">Round Transmission Intercepted</span>
                <button onClick={() => setRoundFeedback(null)} className="text-white/20 hover:text-white"><XIcon size={16}/></button>
              </div>
              <div className="space-y-4 text-center">
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Round Winner</p>
                  <p className="font-sans text-xl text-[color:var(--current-theme-color)] font-bold">
                    {roundFeedback.winner === 'None (Draw)' ? 'NO WINNER (DRAW)' : roundFeedback.winner}
                  </p>
                </div>
                <div className="bg-white/5 p-3 rounded border border-white/5">
                  <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Decrypted Solution</p>
                  <p className="font-mono text-lg tracking-wider text-white">{roundFeedback.correct}</p>
                </div>
              </div>
            </div>
          </div>
          )}

          {errorMsg && (
            <div className="font-mono text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Multiplayer;
