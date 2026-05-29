import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import { X as XIcon, Users, Home, User, Radar, Lock, AlertTriangle, AlertCircle, Trophy, Hourglass, Zap, Settings, ArrowRightLeft, Send, Award, Skull, Handshake } from 'lucide-react';
import confetti from 'canvas-confetti';


const Multiplayer = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const storyCompleted = (user?.storyData?.completedMissions?.length || 0) >= 20;

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
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lastConfettiMatch, setLastConfettiMatch] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

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
      const fetchStart = Date.now();
      const data = await api(`/api/multiplayer/match/${encodeURIComponent(match.matchId)}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer }),
      });
      const fetchEnd = Date.now();
      if (data.match) {
        if (data.serverNowMs) {
          const latency = (fetchEnd - fetchStart) / 2;
          const adjustedServerNow = data.serverNowMs + latency;
          const clockSkew = fetchEnd - adjustedServerNow;
          data.match.localRoundStartAt = data.match.roundStartAt ? data.match.roundStartAt + clockSkew : 0;
        }
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
      setAnswer('');
      setShowFinalResults(false);
      refreshUser();
      refreshMatch();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const confirmSurrender = async () => {
    if (!match || !match.matchId) return;
    setShowSurrenderConfirm(false);
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
      const fetchStart = Date.now();
      const data = await api('/api/multiplayer/active-match');
      const fetchEnd = Date.now();
      if (data.match && data.serverNowMs) {
        const latency = (fetchEnd - fetchStart) / 2;
        const adjustedServerNow = data.serverNowMs + latency;
        const clockSkew = fetchEnd - adjustedServerNow;
        data.match.localRoundStartAt = data.match.roundStartAt ? data.match.roundStartAt + clockSkew : 0;
      }
      setMatch(data.match);
    } catch {}
  };

  const refreshLeaderboard = async () => {
    try {
      const data = await api('/api/cipherlab/leaderboard');
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
    const invInterval = setInterval(refreshInvites, 3000);
    const matchInterval = setInterval(refreshMatch, 1000);
    
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
      const winnerName = match.lastRoundWinner ? (match.usernames[match.lastRoundWinner]?.toUpperCase() || 'CALLSIGN') : 'None (Draw)';
      setRoundFeedback({ winner: winnerName, correct: match.lastRoundCorrectAnswer });
      // Keep results visible for a while
      const timer = setTimeout(() => setRoundFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [match?.currentRound, match?.status]);

  // Round Transition Flow Logic
  useEffect(() => {
    if (!match) return;

    if (match.status === 'done' && !showFinalResults) {
      const finishMatch = async () => {
        // If the match ended normally (not forfeit), pause to show last round results
        if (match.lastRoundCorrectAnswer && match.resultReason !== 'forfeit') {
          await new Promise(r => setTimeout(r, 6000));
          setRoundFeedback(null);
        }
        setShowFinalResults(true);
      };
      finishMatch();
    }
  }, [match?.status, showFinalResults]);

  const isWaitingForStart = match?.status === 'open' && match?.localRoundStartAt && match.localRoundStartAt > now;
  const timeRemainingMs = isWaitingForStart ? Math.max(0, match.localRoundStartAt - now) : 0;
  const timeRemainingSec = Math.ceil(timeRemainingMs / 1000);

  let duelStatus = '';
  if (match && match.status === 'open') {
    if (match.myAnswered) {
      duelStatus = match.opponentAnswered ? "Both answers locked. Resolving…" : "Answer locked in. Waiting for opponent…";
    } else {
      duelStatus = match.opponentAnswered ? "⚡ Your opponent has already answered! Hurry up!" : "";
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
      if (match.resultReason === 'forfeit') {
        resultSub = "Opponent surrendered.";
      } else if (myRow && myRow.correct) {
        resultSub = "You decoded it first! Well done, operative.";
      } else {
        resultSub = "Correct decode — you take the match.";
      }
      resultXp = `+${xpReward} XP earned`;
    } else if (w) {
      resultClass = "mp-result-line--lose";
      resultTitle = "You lose";
      const names = match.usernames || {};
      const name = names[w] || "Opponent";
      const myRow = match.answers && match.answers[user?.uid || ''];
      if (match.resultReason === 'forfeit') {
        resultSub = "You surrendered.";
      } else if (myRow && !myRow.correct) {
        resultSub = `Wrong decode. ${name} had the correct answer.`;
      } else {
        resultSub = `${name} decoded it first.`;
      }
      resultXp = "0 XP";
    } else {
      resultClass = "text-yellow-400";
      resultTitle = "Draw";
      resultSub = match.resultReason === 'none_correct' ? "Round limit reached. No clear winner." : "Outcome could not be determined.";
      resultXp = "0 XP";
    }
    
    if (w === user?.uid && match.matchId !== lastConfettiMatch) {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: ['var(--current-theme-color)', '#ffffff'] });
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
    <div className="h-screen w-screen bg-[#020205] flex flex-col text-white relative overflow-hidden font-sans selection:bg-[var(--current-theme-color)]/30">
      {/* Standardized Background */}
      <div className="absolute inset-0 z-0 bg-[#050505] overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full mb-12">
        {/* Left corner back arrow */}
        <button onClick={() => navigate('/dashboard')} className="fixed top-0 left-0 w-28 h-28 bg-[#00f2ff] hover:bg-white transition-colors cursor-pointer group pointer-events-auto z-50 flex items-start justify-start pl-6 pt-6 shadow-[0_0_30px_#00f2ff] outline-none" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
           <div className="w-8 h-8 flex items-center justify-center">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-black group-hover:stroke-[#00f2ff] group-hover:-translate-x-1 transition-transform">
               <path d="m15 18-6-6 6-6"/>
             </svg>
           </div>
        </button>

        {/* Right side module name */}
        <div className="absolute top-6 right-10 flex flex-col items-end pointer-events-auto z-40">
          <h1 className="cq-title tracking-widest uppercase text-right mb-4">Multiplayer</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-4 hide-scrollbar">
        <div className="w-full space-y-6">

          {/* Lobby (always visible when no active match) */}
          {!match && (
            <>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Search Panel */}
                <div className="glass-panel p-6 border border-[var(--current-theme-color)]/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--current-theme-color)]/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--current-theme-color)]/10 blur-[80px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <Radar size={16} className="text-[var(--current-theme-color)] animate-pulse" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--current-theme-color)]">&gt; Challenge Friend</span>
                    </div>
                    <h2 className="cq-subheading mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Find Callsign</h2>
                    <p className="text-white/40 text-xs mb-5">Enter a callsign to find your friend. Send a duel invite and wait for them to accept.</p>

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
                             className="flex-1 bg-[#0a0a0f] border border-white/20 focus:border-[var(--current-theme-color)] focus:shadow-[0_0_15px_color-mix(in_srgb,var(--current-theme-color)_30%,transparent)] text-white font-mono tracking-widest uppercase p-5 rounded outline-none transition-all placeholder:text-white/10"
                             placeholder="USERNAME..." maxLength={24} autoComplete="off" />
                      <button onClick={() => runSearch(searchQuery)} className="px-10 py-5 bg-[var(--current-theme-color)]/10 border border-[var(--current-theme-color)]/50 text-[var(--current-theme-color)] hover:bg-[var(--current-theme-color)] hover:text-black font-bold font-mono text-[12px] uppercase tracking-[0.3em] hover:shadow-[0_0_20px_var(--current-theme-color)] transition-all rounded">Search</button>
                    </div>

                    {searchResults.length > 0 && (
                      <>
                      <div className="mb-4">
                        <div className="flex items-center gap-4 mb-4 p-4 bg-[#0a0a0f]/50 border border-white/10 rounded">
                          <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest whitespace-nowrap">Rounds:</span>
                          <div className="flex gap-2">
                            {[1, 3, 5, 7].map(r => (
                              <button key={r} onClick={() => setMatchFormat(r)} className={`px-4 py-2 font-mono text-sm font-bold rounded transition-all ${matchFormat === r ? 'bg-[var(--current-theme-color)] text-black shadow-[0_0_15px_var(--current-theme-color)]' : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'}`}>Best of {r}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        {searchResults.map(u => (
                          <div key={u.uid} className="flex items-center justify-between bg-black/40 border border-[var(--current-theme-color)]/20 px-6 py-4 rounded group hover:border-[var(--current-theme-color)]/60 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-[var(--current-theme-color)]/20 flex items-center justify-center border border-[var(--current-theme-color)]/30">
                                <User size={16} className="text-[var(--current-theme-color)]" />
                              </div>
                              <span className="font-mono tracking-widest uppercase text-base text-white/90 group-hover:text-white transition-colors">{u.username.toUpperCase()}</span>
                            </div>
                            <button onClick={() => sendInvite(u.uid)} className="px-6 py-3 border border-[var(--current-theme-color)]/50 text-[var(--current-theme-color)] hover:bg-[var(--current-theme-color)] hover:text-black font-bold font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded shadow-[inset_0_0_10px_color-mix(in_srgb,var(--current-theme-color)_10%,transparent)]">Challenge ({matchFormat}R)</button>
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
                  <div className="glass-panel p-6 border border-[var(--current-theme-color)]/20 relative overflow-hidden group">
                     <h2 className="cq-subheading mb-3">Sent Signals</h2>
                     <div className="space-y-3">
                       {outgoingInvites.map(inv => (
                         <div key={inv.inviteId} className="flex items-center justify-between bg-black/40 border border-white/10 px-6 py-4 rounded">
                           <span className="font-mono text-sm tracking-widest uppercase text-white/80">To <strong className="text-[var(--current-theme-color)]">{inv.toUsername.toUpperCase()}</strong>: {inv.status === 'declined' ? <span className="text-red-500">DECLINED</span> : 'Pending...'}</span>
                           <button onClick={() => clearInvite(inv.inviteId)} className="px-4 py-2 border border-white/20 text-white/50 text-[10px] font-mono tracking-widest uppercase hover:text-white hover:border-white/50 transition-all rounded">Cancel</button>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* Incoming Invites */}
                {invites.length > 0 && (
                  <div className="glass-panel p-6 border border-red-500/50 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={16} className="text-red-500 animate-[pulse_1s_infinite]" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-red-500">&gt; Incoming Signal</span>
                      </div>
                      <h2 className="cq-subheading mb-4">Challenge Received</h2>
                      <div className="space-y-3">
                        {invites.map(inv => (
                          <div key={inv.inviteId} className="flex flex-col md:flex-row md:items-center justify-between bg-black/50 border border-red-500/30 px-6 py-5 rounded gap-4 shadow-inner">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded bg-red-500/20 flex items-center justify-center border border-red-500/50">
                                <AlertCircle size={20} className="text-red-500 animate-pulse" />
                              </div>
                              <span className="font-mono text-base"><strong className="text-red-500 tracking-widest uppercase">{inv.fromUsername?.toUpperCase() || 'CALLSIGN'}</strong> has challenged you. <span className="text-white/40 text-xs">(Best of {inv.matchFormat})</span></span>
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

              {/* Leaderboard and Operator Stats */}
              <div className="lg:col-span-1 flex flex-col gap-8">
                
                {/* Operator Stats */}
                <div className="glass-panel p-4 border border-[var(--current-theme-color)]/20 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-black/60 backdrop-blur">
                   <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-3 pb-2 border-b border-white/10 text-left">Operator Stats</div>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 tactical-panel bg-white/5 p-1 flex-shrink-0">
                        <img src={`/assets/badge${user?.level || 1}.png`} alt={`Level ${user?.level || 1}`} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className={`text-sm font-bold uppercase tracking-widest ${storyCompleted ? 'rainbow-text' : 'text-white/90'}`}>{user?.username?.toUpperCase() || 'UNASSIGNED'}</span>
                        <span className="font-mono text-xs text-[var(--current-theme-color)] mt-1">{user?.xp?.toLocaleString() || 0} XP</span>
                      </div>
                   </div>
                </div>

                <div className="glass-panel border border-[var(--current-theme-color)]/30 overflow-hidden relative flex flex-col h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--current-theme-color)]/10 blur-[50px] pointer-events-none opacity-50"></div>
                  <div className="p-6 border-b border-white/10 relative z-10 flex items-center justify-between bg-[#0a0a0f]">
                    <div className="flex items-center gap-3">
                      <Trophy className="text-[var(--current-theme-color)]" size={20} />
                      <h3 className="cq-subheading tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Top Callsigns</h3>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex flex-col gap-1 p-4">
                      {leaderboard.slice(0, 5).map((lb, i) => (
                        <div key={lb.uid} className={`flex items-center justify-between py-3 px-4 rounded transition-colors group relative overflow-hidden ${i < 3 ? 'bg-[var(--current-theme-color)]/10 border border-[var(--current-theme-color)]/30' : 'hover:bg-white/5'}`}>
                          <div className="flex items-center gap-4 relative z-10">
                            <span className={`font-display text-xl font-bold w-6 ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_#facc15]' : (i === 1 ? 'text-gray-300' : (i === 2 ? 'text-amber-600' : 'text-white/30'))}`}>#{i+1}</span>
                            <span className="font-mono text-sm tracking-widest uppercase text-white/90 group-hover:text-white">{lb.callsign}</span>
                          </div>
                          <span className="font-mono text-xs text-[var(--current-theme-color)] font-bold relative z-10">{lb.points} XP</span>
                        </div>
                      ))}
                      {leaderboard.length === 0 && (
                        <div className="text-center py-4">
                           <Hourglass size={36} className="text-white/20 mx-auto mb-2" />
                           <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest">No intel acquired yet.</p>
                        </div>
                      )}
                      
                      {/* Your Rank as bottom row */}
                      {(() => {
                        const myRank = leaderboard.findIndex((lb: any) => lb.uid === user?.uid);
                        if (myRank < 0) return null;
                        const myEntry = leaderboard[myRank];
                        return (
                          <div className="flex items-center justify-between py-3 px-4 rounded transition-colors group relative overflow-hidden mt-2" style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.3)' }}>
                            <div className="flex items-center gap-4 relative z-10">
                              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/50 w-24">YOUR RANK</span>
                              <span className="font-display text-xl font-bold w-6" style={{ color: '#00f2ff', textShadow: '0 0 10px rgba(0,242,255,0.5)' }}>#{myRank + 1}</span>
                              <span className="font-mono text-sm tracking-widest uppercase text-white font-bold ml-2">{user?.username || ''}</span>
                            </div>
                            <span className="font-mono text-xs text-[var(--current-theme-color)] font-bold relative z-10">{myEntry ? `${myEntry.points} XP` : `${user?.xp || 0} XP`}</span>
                          </div>
                        );
                      })()}
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
            {isWaitingForStart && (
              <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                <div className="font-mono text-sm tracking-[0.4em] text-[var(--current-theme-color)] uppercase mb-4">Initializing Round</div>
                <div className="cq-title tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">ROUND {match.currentRound || 1}</div>
                <div className="font-display text-8xl text-white mt-6 mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">{timeRemainingSec}</div>
                <div className="w-48 h-1 bg-[var(--current-theme-color)] mt-8 animate-pulse shadow-[0_0_20px_var(--current-theme-color)]"></div>
              </div>
            )}
            
            {!isWaitingForStart && (
            <div className="glass-panel border border-[var(--current-theme-color)]/30 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--current-theme-color)]/5 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--current-theme-color)]/10 blur-[100px] pointer-events-none"></div>
              
              <div className="p-8 pb-4 flex flex-col gap-4 border-b border-white/10 relative z-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-[var(--current-theme-color)] animate-[pulse_2s_infinite]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--current-theme-color)]">Live Duel</span>
                    <span className="font-mono text-[10px] px-3 py-1 bg-[var(--current-theme-color)]/20 border border-[var(--current-theme-color)]/30 rounded text-[var(--current-theme-color)]">Round {match.currentRound || 1} / {match.matchFormat || 1}</span>
                  </div>

                  {/* Score Display */}
                  <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/10 shadow-inner">
                    <span className="font-display text-xl uppercase flex items-center gap-2 text-[var(--current-theme-color)]">
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
                    <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${r.status === 'won' ? 'bg-[var(--current-theme-color)] text-black shadow-[0_0_10px_var(--current-theme-color)]' : (r.status === 'lost' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : (r.status === 'draw' ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' : (r.status === 'active' ? 'bg-white/20 text-white border-2 border-[var(--current-theme-color)] animate-pulse' : 'bg-white/5 text-white/20 border border-white/10')))}`}>
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
                    <div className="font-sans font-bold text-[10px] text-[var(--current-theme-color)] uppercase tracking-[0.3em] mb-6 flex justify-between">
                      <span>Target Payload (Encrypted)</span>
                      <Zap size={16} className="animate-[pulse_2s_infinite]" />
                    </div>
                    <div className="font-mono text-[42px] leading-[1.2] text-white tracking-[0.1em] break-all drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      <span className="text-white/10 select-none mr-4">&gt;</span>{match.question}
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="flex flex-col items-center justify-center -my-6 z-20 h-20 relative">
                     <div className="w-[2px] h-full bg-gradient-to-b from-[var(--current-theme-color)]/0 via-[var(--current-theme-color)] to-[var(--current-theme-color)]/0 absolute opacity-50"></div>
                     <div className="w-1.5 h-6 bg-[var(--current-theme-color)] absolute animate-[bounce_2s_infinite] shadow-[0_0_15px_var(--current-theme-color)] rounded-full z-10"></div>
                     <div className="px-6 py-2 bg-[#0a0a0f] border border-[var(--current-theme-color)]/50 rounded-full relative z-20 flex items-center gap-3 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        <Settings size={16} className="text-[var(--current-theme-color)] animate-[spin_4s_linear_infinite]" />
                        <span className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Processing Node</span>
                        <ArrowRightLeft size={16} className="text-[var(--current-theme-color)]" />
                     </div>
                  </div>

                  {/* Plaintext Input Area */}
                  <div className="glass-panel p-10 relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 rounded-xl border border-[var(--current-theme-color)]/30">
                    <div className="absolute left-0 top-0 h-full w-1 transition-colors duration-500 bg-[var(--current-theme-color)]"></div>

                    <div className="font-sans font-bold text-[10px] uppercase tracking-[0.3em] mb-8 flex justify-between text-[var(--current-theme-color)]">
                      <span>Encryption Protocol: {match.cipherType}</span>
                      <span className="animate-pulse">[AWAITING DECRYPTION]</span>
                    </div>

                    {match.cipherHint && (
                      <div className="mb-6 font-mono text-[11px] text-white/70 bg-[#0a0a0f]/50 p-4 border border-white/5 rounded">
                        <span className="text-[var(--current-theme-color)] font-bold uppercase">&gt; Intel:</span> {match.cipherHint}
                      </div>
                    )}

                    <div className="relative flex items-center bg-[#0a0a0f]/50 rounded-lg p-6 border border-white/5 focus-within:border-white/20 transition-colors">
                      <span className="font-mono text-[32px] text-white/20 select-none mr-4">&gt;</span>
                      <input 
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && !match.myAnswered && !isWaitingForStart && submitAnswer()}
                        disabled={match.myAnswered || isWaitingForStart}
                        className="w-full bg-transparent text-white font-mono text-[40px] tracking-[0.1em] outline-none uppercase placeholder:text-white/10 disabled:opacity-40 disabled:border-white/5"
                        placeholder="ENTER PLAINTEXT..."
                        spellCheck="false"
                      />
                    </div>

                    <div className="mt-8 flex justify-between items-center">
                       <button onClick={() => setShowSurrenderConfirm(true)} className="px-6 py-3 border border-red-500/30 text-red-500/70 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/10 hover:text-red-500 transition-all rounded">
                         Surrender
                       </button>
                       <button onClick={submitAnswer} disabled={match.myAnswered || isWaitingForStart}
                               className="px-10 py-5 bg-[var(--current-theme-color)] text-black font-bold font-mono text-[12px] uppercase tracking-[0.3em] hover:bg-white hover:shadow-[0_0_30px_var(--current-theme-color)] transition-all disabled:opacity-20 rounded shadow-[0_0_15px_color-mix(in_srgb,var(--current-theme-color)_50%,transparent)] flex items-center gap-3">
                         Execute Decryption <Send size={16} />
                       </button>
                    </div>

                    {duelStatus && (
                      <div className="mt-6 flex justify-center">
                        <p className={`font-mono text-[11px] px-4 py-2 rounded uppercase tracking-widest transition-colors ${match.myAnswered ? 'bg-[var(--current-theme-color)]/20 text-[var(--current-theme-color)]' : 'bg-white/5 text-white/50'}`}>{duelStatus}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
            </>
          )}

          {/* Match Results */}
          {match && match.status === 'done' && showFinalResults && (
            <div className={`glass-panel p-16 text-center border overflow-hidden relative ${match.winnerUid === user?.uid ? 'border-[var(--current-theme-color)]' : 'border-red-500/50'}`}>
              <div className={`absolute inset-0 bg-radial from-transparent ${match.winnerUid === user?.uid ? 'to-[var(--current-theme-color)]/10' : 'to-red-500/10'}`}></div>
              
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
                <div className={`relative z-10 font-mono text-3xl font-bold mb-12 py-4 px-8 inline-block border rounded bg-black/40 shadow-inner ${resultXp.includes('+') ? 'text-[var(--current-theme-color)] border-[var(--current-theme-color)]/30' : 'text-white/40 border-white/10'}`}>
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
            <div className="tactical-panel bg-[#0a0a0f]/98 border-[var(--current-theme-color)] p-6 shadow-[0_0_50px_rgba(0,229,255,0.3)] animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--current-theme-color)]">Round Transmission Intercepted</span>
                <button onClick={() => setRoundFeedback(null)} className="text-white/20 hover:text-white"><XIcon size={16}/></button>
              </div>
              <div className="space-y-4 text-center">
                <div>
                  <p className="font-mono text-[10px] text-white/40 uppercase mb-1">Round Winner</p>
                  <p className="font-sans text-xl text-[var(--current-theme-color)] font-bold">
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

          {/* Surrender Confirmation Modal */}
          {showSurrenderConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="glass-panel p-8 max-w-sm w-full text-center border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-200">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4 animate-[pulse_2s_infinite]" />
                <h3 className="font-display text-2xl uppercase mb-2 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Confirm Surrender</h3>
                <p className="font-mono text-[11px] text-white/70 mb-8 uppercase tracking-wider leading-relaxed">Are you sure you want to abort this mission?<br/>You will forfeit the duel.</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowSurrenderConfirm(false)} className="flex-1 py-4 border border-white/20 text-white/70 font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all rounded outline-none focus-visible:ring-2 focus-visible:ring-white">Cancel</button>
                  <button onClick={confirmSurrender} className="flex-1 py-4 bg-red-500 text-white font-mono text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all rounded outline-none focus-visible:ring-2 focus-visible:ring-red-400">Surrender</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Multiplayer;
