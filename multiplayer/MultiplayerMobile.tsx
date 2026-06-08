import React from 'react';
import { Shield, Radar, Lock, AlertTriangle, AlertCircle, Trophy, Hourglass, Zap, Settings, ArrowRightLeft, Send, Award, Skull, Handshake, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MultiplayerMobile = ({
  user, navigate, match, searchQuery, setSearchQuery, handleSearchChange, runSearch,
  searchResults, searchHint, errorMsg, invites, outgoingInvites, sendInvite, cancelInvite,
  acceptInvite, declineInvite, answer, setAnswer, submitAnswer, showSurrenderConfirm,
  setShowSurrenderConfirm, confirmSurrender, roundFeedback, setRoundFeedback,
  showFinalResults, ackMatch, leaderboard, now, storyCompleted
}: any) => {

  const isWaitingForStart = match && match.status === 'starting';
  const duelStatus = match ? (isWaitingForStart ? 'INITIATING LINK...' : 'DUEL IN PROGRESS') : '';

  return (
    <div className="min-h-[100dvh] w-full bg-[#020205] text-white flex flex-col font-sans pb-10">
      <div className="sticky top-0 z-50 bg-[#020205]/90 backdrop-blur-md border-b border-[#00f2ff]/20 px-4 pt-10 pb-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 border border-[#00f2ff]/30 rounded bg-[#00f2ff]/10 text-[#00f2ff]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="cq-title text-xl uppercase tracking-widest text-[#00f2ff] m-0">Warzone</h1>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6">
        {!match ? (
          <>
            <div className="bg-[#0a0a0f] border border-[var(--current-theme-color)]/20 rounded-xl p-5 shadow-[0_0_15px_rgba(0,242,255,0.05)]">
              <div className="flex items-center gap-3 mb-4">
                <Radar size={18} className="text-[var(--current-theme-color)] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--current-theme-color)] font-bold">Challenge Friend</span>
              </div>

              {!user && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-red-500" />
                    <span className="font-mono text-[11px] text-white/70 uppercase">Sign in to challenge</span>
                  </div>
                  <button onClick={() => navigate('/auth')} className="w-full py-2 bg-red-500/20 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white rounded">Sign In</button>
                </div>
              )}

              {user && !storyCompleted && (
                 <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500/80 text-[10px] font-mono tracking-widest uppercase">
                    WARNING: Complete 20 story missions before entering the Warzone to ensure survival.
                 </div>
              )}

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={handleSearchChange}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch(searchQuery)}
                  placeholder="ENTER CALLSIGN..."
                  className="flex-1 bg-black/50 border border-white/10 rounded px-4 py-3 font-mono text-sm text-white focus:border-[var(--current-theme-color)]/50 outline-none uppercase"
                />
                <button onClick={() => runSearch(searchQuery)} className="bg-[var(--current-theme-color)]/10 border border-[var(--current-theme-color)]/30 text-[var(--current-theme-color)] px-4 rounded hover:bg-[var(--current-theme-color)] hover:text-black">
                  <Radar size={20} />
                </button>
              </div>

              {searchHint && <div className="mt-2 text-[10px] font-mono text-white/40 uppercase">{searchHint}</div>}

              {searchResults.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {searchResults.map(res => (
                    <div key={res.uid} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                      <span className="font-mono text-[12px] font-bold uppercase text-[var(--current-theme-color)]">{res.callsign}</span>
                      <button onClick={() => sendInvite(res.uid)} className="px-3 py-1.5 bg-[var(--current-theme-color)] text-black text-[10px] font-bold uppercase tracking-widest rounded hover:shadow-[0_0_15px_rgba(0,242,255,0.5)]">Invite</button>
                    </div>
                  ))}
                </div>
              )}

              {outgoingInvites.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-white/50 uppercase">Outgoing Invites</span>
                  {outgoingInvites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-[var(--current-theme-color)]/5 border border-[var(--current-theme-color)]/20 rounded">
                       <span className="font-mono text-[11px] uppercase text-white">To: {inv.receiverCallsign}</span>
                       <button onClick={() => cancelInvite(inv.id)} className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Cancel</button>
                    </div>
                  ))}
                </div>
              )}

              {invites.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-[#00f2ff] uppercase font-bold animate-pulse">Incoming Invites</span>
                  {invites.map(inv => (
                    <div key={inv.id} className="flex flex-col gap-3 p-4 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded">
                       <div className="flex justify-between items-center">
                         <span className="font-mono text-[12px] uppercase text-white font-bold">{inv.senderCallsign} <span className="text-white/40 font-normal">challenges you</span></span>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => acceptInvite(inv.id)} className="flex-1 py-2 bg-[#00f2ff] text-black text-[10px] font-bold uppercase tracking-widest rounded shadow-[0_0_15px_rgba(0,242,255,0.4)]">Accept</button>
                         <button onClick={() => declineInvite(inv.id)} className="flex-1 py-2 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded border border-red-500/50">Decline</button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0a0a0f] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Trophy className="text-[#00f2ff]" size={18} />
                <span className="font-mono text-[10px] text-[#00f2ff] tracking-[0.3em] uppercase font-bold">Global Rankings</span>
              </div>
              <div className="flex flex-col gap-3">
                {leaderboard.length === 0 ? (
                  <div className="text-center text-white/30 font-mono text-[10px] uppercase py-4">No data available</div>
                ) : (
                  leaderboard.slice(0, 10).map((entry, idx) => (
                    <div key={idx} className="flex items-center p-3 border border-white/5 bg-white/5 rounded gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center font-bold font-mono text-[10px] ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-white/10 text-white/50'}`}>#{idx + 1}</div>
                      <div className="flex-1 font-mono text-[11px] font-bold text-white uppercase">{entry.callsign}</div>
                      <div className="font-mono text-[11px] text-[#00f2ff] font-bold">{entry.points} pts</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Match Header */}
            <div className="bg-[#0a0a0f] border border-[var(--current-theme-color)]/30 rounded-xl p-4 flex justify-between items-center shadow-[0_0_15px_rgba(0,242,255,0.1)]">
               <div className="flex flex-col items-center flex-1">
                 <span className="font-mono text-[10px] text-[var(--current-theme-color)] uppercase">You</span>
                 <span className="font-bold text-lg font-mono text-white">{match.players[user?.uid]?.score || 0}</span>
               </div>
               <div className="flex flex-col items-center px-4 font-mono font-bold text-[var(--current-theme-color)]">
                 <span className="text-[10px] tracking-[0.3em] uppercase">Round</span>
                 <span className="text-xl">{match.round}/{match.totalRounds}</span>
               </div>
               <div className="flex flex-col items-center flex-1">
                 <span className="font-mono text-[10px] text-red-500 uppercase">Enemy</span>
                 <span className="font-bold text-lg font-mono text-white">{Object.values(match.players).find((p: any) => p.callsign !== user?.username)?.score || 0}</span>
               </div>
            </div>

            {/* Main Game Area */}
            {!showFinalResults ? (
              <div className="bg-[#0a0a0f] border border-[var(--current-theme-color)]/30 rounded-xl p-5 flex flex-col relative overflow-hidden shadow-[0_0_15px_rgba(0,242,255,0.05)]">
                 <div className="absolute top-0 left-0 w-full h-1 bg-[var(--current-theme-color)]" />
                 
                 <div className="flex justify-between items-center mb-6 text-[var(--current-theme-color)]">
                   <span className="font-bold text-[10px] font-mono tracking-[0.2em] uppercase">Protocol: {match.cipherType}</span>
                   {isWaitingForStart && <span className="animate-pulse text-[10px] font-mono tracking-[0.2em] uppercase">[AWAITING START]</span>}
                 </div>

                 {match.cipherHint && (
                   <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded font-mono text-[10px] text-white/70 uppercase">
                     <span className="text-[var(--current-theme-color)] font-bold">&gt; Intel:</span> {match.cipherHint}
                   </div>
                 )}

                 <div className="mb-6 bg-black/50 border border-white/10 rounded p-4 text-center">
                    <span className="text-white/30 text-[10px] font-mono uppercase block mb-2 tracking-widest">Intercepted Data</span>
                    <div className="font-mono text-2xl text-[var(--current-theme-color)] break-all">{match.encryptedText || 'AWAITING_DATA...'}</div>
                 </div>

                 <div className="flex flex-col gap-3">
                   <div className="relative bg-black/50 border border-white/10 rounded p-3 flex items-center">
                     <span className="font-mono text-xl text-white/30 mr-2">&gt;</span>
                     <input 
                        type="text"
                        value={answer}
                        onChange={e => setAnswer(e.target.value.toUpperCase())}
                        disabled={match.myAnswered || isWaitingForStart}
                        placeholder="ENTER PLAINTEXT"
                        className="flex-1 bg-transparent border-none outline-none font-mono text-xl text-[var(--current-theme-color)] uppercase placeholder:text-white/20"
                        spellCheck={false}
                     />
                   </div>
                   
                   <button 
                     onClick={submitAnswer} 
                     disabled={match.myAnswered || isWaitingForStart || answer.length === 0}
                     className="w-full py-4 bg-[var(--current-theme-color)] text-black font-bold uppercase tracking-widest text-[12px] rounded shadow-[0_0_15px_rgba(0,242,255,0.3)] disabled:opacity-30 flex items-center justify-center gap-2"
                   >
                     Execute Decryption <Send size={14} />
                   </button>
                   
                   <button onClick={() => setShowSurrenderConfirm(true)} className="w-full py-3 border border-red-500/30 text-red-500/70 font-mono text-[10px] uppercase tracking-widest rounded hover:bg-red-500/10 transition-colors">
                     Surrender
                   </button>
                 </div>
              </div>
            ) : (
              <div className="bg-[#0a0a0f] border border-[var(--current-theme-color)]/30 rounded-xl p-8 flex flex-col items-center text-center shadow-[0_0_20px_rgba(0,242,255,0.1)]">
                 <Trophy size={48} className="text-[var(--current-theme-color)] mb-4" />
                 <h2 className="font-display text-3xl uppercase text-white mb-2">Match Concluded</h2>
                 <p className="font-mono text-sm text-[var(--current-theme-color)] mb-8 uppercase tracking-widest">
                   Winner: {match.winnerCallsign === user?.username ? 'YOU' : match.winnerCallsign}
                 </p>
                 <button onClick={ackMatch} className="w-full py-4 bg-[var(--current-theme-color)] text-black font-bold uppercase tracking-widest text-[12px] rounded shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                   Return to Network
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Surrender Modal */}
      <AnimatePresence>
        {showSurrenderConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-4">
            <div className="bg-[#0a0a0f] border border-red-500/50 p-6 rounded-xl max-w-sm w-full text-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertTriangle size={40} className="text-red-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-display uppercase text-white mb-2">Confirm Surrender</h3>
              <p className="font-mono text-[10px] text-white/60 uppercase tracking-widest mb-6">You will forfeit the duel. Proceed?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSurrenderConfirm(false)} className="flex-1 py-3 border border-white/20 text-white/70 font-mono text-[10px] uppercase tracking-widest rounded">Cancel</button>
                <button onClick={confirmSurrender} className="flex-1 py-3 bg-red-500 text-white font-mono text-[10px] uppercase tracking-widest rounded">Surrender</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiplayerMobile;
