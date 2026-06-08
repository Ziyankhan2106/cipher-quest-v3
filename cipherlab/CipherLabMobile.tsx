import React from 'react';
import { Shield, Zap, Lightbulb, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CipherMission } from '../src/lib/cipherUtils';

// We import the ScrambleText component inline or pass it as prop, wait I'll just copy it or we can extract it.
// To keep it simple, we assume the parent passes it, or we can just render the raw text in mobile for now, or copy the simple ScrambleText.

const CipherLabMobile = ({
  sessionMission, hintsCount, userInput, setUserInput, feedback, isShaking, inputRef,
  globalXp, startNewMission, revealHint, handleSkip, handleSubmit, getRevealedWord, navigate,
  ScrambleText
}: any) => {

  return (
    <div className="min-h-[100dvh] w-full bg-[#020205] text-white flex flex-col font-sans">
      <div className="sticky top-0 z-50 bg-[#020205]/90 backdrop-blur-md border-b border-[#00f2ff]/20 px-4 pt-10 pb-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 border border-[#00f2ff]/30 rounded bg-[#00f2ff]/10 text-[#00f2ff]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="cq-title text-xl uppercase tracking-widest text-white m-0">Cipher Lab</h1>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6 pb-20">
        <div className="bg-[#0a0a0f] border border-[#00f2ff]/30 p-4 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(0,242,255,0.1)]">
          <span className="font-mono text-xs uppercase text-white/50 tracking-widest">Global XP</span>
          <span className="font-display font-bold text-[#00f2ff] text-xl">{globalXp.toLocaleString()}</span>
        </div>

        {sessionMission ? (
          <>
            <div className="bg-[#0a0a0c] border border-[var(--current-theme-color)]/20 rounded-xl p-5 shadow-[0_0_15px_rgba(0,242,255,0.05)]">
              <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                <Zap className="text-[var(--current-theme-color)]" size={18} />
                <span className="font-mono text-xs uppercase text-[var(--current-theme-color)] tracking-widest font-bold">Protocol Active</span>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-white/40 text-[10px] uppercase tracking-widest font-mono block mb-1">Algorithm</span>
                  <span className="text-[var(--current-theme-color)] font-mono text-lg">{sessionMission.type.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-white/40 text-[10px] uppercase tracking-widest font-mono block mb-1">Pattern</span>
                  <span className="text-white font-mono italic text-lg">{sessionMission.schemeHint}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden">
              <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono block mb-3">Intercepted Ciphertext</span>
              <div className="font-mono text-4xl text-[var(--current-theme-color)] break-all leading-tight">
                <ScrambleText text={sessionMission.encryptedText} />
              </div>
              {hintsCount >= 1 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono block mb-2">Partial Reconstruction</span>
                  <span className="font-mono text-xl tracking-widest text-white font-bold">{getRevealedWord()}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="bg-[#0a0a0f] border border-[var(--current-theme-color)]/30 rounded-xl p-5">
              <span className="text-[var(--current-theme-color)] text-[10px] uppercase tracking-widest font-mono block mb-3 font-bold">Decryption Input</span>
              <div className="relative bg-black/50 border border-white/10 rounded-lg p-4 mb-4 flex items-center" onClick={() => inputRef.current?.focus()}>
                <span className="text-white/30 font-mono text-xl mr-3">&gt;</span>
                <div className="flex-1 min-h-[30px] flex items-center flex-wrap">
                  {userInput.length === 0 ? (
                    <span className="text-white/20 font-mono text-xl select-none absolute">ENTER TEXT...</span>
                  ) : (
                    <span className="text-[var(--current-theme-color)] font-mono text-2xl tracking-[0.2em]">{userInput}</span>
                  )}
                  {feedback !== 'success' && <span className="text-[var(--current-theme-color)] font-mono text-2xl animate-pulse ml-1 opacity-80">▋</span>}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value.toUpperCase())}
                  disabled={feedback === 'success'}
                  className="absolute inset-0 opacity-0 w-full h-full"
                  spellCheck={false}
                />
              </div>

              {feedback === 'error' && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-2 text-red-500 text-xs font-mono uppercase">
                  <AlertTriangle size={14} /> Mismatch Detected
                </div>
              )}
              {feedback === 'success' && (
                <div className="mb-4 bg-[var(--current-theme-color)]/10 border border-[var(--current-theme-color)]/20 rounded p-2 flex items-center gap-2 text-[var(--current-theme-color)] text-xs font-mono uppercase">
                  <Shield size={14} /> Decryption Successful
                </div>
              )}

              <button type="submit" disabled={feedback === 'success' || userInput.length === 0} className="w-full bg-[var(--current-theme-color)] text-black font-bold uppercase tracking-widest py-3 rounded disabled:opacity-30">
                EXECUTE DECRYPTION
              </button>
            </form>

            <div className="flex gap-3">
              <button onClick={revealHint} disabled={hintsCount >= sessionMission.originalText.length || globalXp <= 0} className="flex-1 border border-[var(--current-theme-color)]/20 text-[var(--current-theme-color)] py-3 rounded text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2">
                <Lightbulb size={14}/> Hint (-5XP)
              </button>
              <button onClick={handleSkip} className="flex-1 border border-red-500/30 text-red-500 py-3 rounded text-[10px] font-bold uppercase tracking-widest flex items-center justify-center">
                Skip Sequence
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <button onClick={startNewMission} className="bg-[var(--current-theme-color)] text-black font-bold uppercase tracking-widest py-4 px-8 rounded shadow-[0_0_20px_rgba(0,242,255,0.4)]">
              Initialize Sequence
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isShaking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="fixed inset-0 z-[100] bg-red-500 pointer-events-none mix-blend-screen" />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CipherLabMobile;
