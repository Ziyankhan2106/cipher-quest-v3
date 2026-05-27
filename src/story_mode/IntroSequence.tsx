import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoryMode } from './lib/StoryModeContext';
import { Terminal, ShieldAlert, Zap } from 'lucide-react';

const DIALOGUE = [
  { speaker: 'SYSADMIN', text: 'CRITICAL ALERT. The Syndicate has breached our primary datacenter.', color: 'text-red-500' },
  { speaker: 'KNOX', text: 'Operator {NAME}, I am KNOX. Tactical AI Link established.', color: 'text-[var(--current-theme-color)]' },
  { speaker: 'SYSADMIN', text: 'We are losing ground. They are decrypting our core protocols faster than we can cycle the keys.', color: 'text-red-500' },
  { speaker: 'SYSADMIN', text: 'We can\'t defend the data by hiding it anymore.', color: 'text-red-500' },
  { speaker: 'KNOX', text: 'Correct. We must flood the network. We will encrypt outbound data packets using localized, bespoke ciphers.', color: 'text-[var(--current-theme-color)]' },
  { speaker: 'KNOX', text: 'If we encrypt our payloads effectively, their sniffers will choke on the noise.', color: 'text-[var(--current-theme-color)]' },
  { speaker: 'KNOX', text: 'Operator {NAME}, take command of the grid. Lock down Sector 1 immediately.', color: 'text-[var(--current-theme-color)]' },
];

const IntroSequence = () => {
  const navigate = useNavigate();
  const { operatorName } = useStoryMode();
  
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isBooting, setIsBooting] = useState(true);

  // Initial boot sequence
  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (isBooting || lineIndex >= DIALOGUE.length) return;
    
    const currentLine = DIALOGUE[lineIndex].text.replace('{NAME}', operatorName.toUpperCase());
    setIsTyping(true);
    setDisplayedText('');
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(currentLine.substring(0, i + 1));
      i++;
      if (i === currentLine.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30); // Typing speed
    
    return () => clearInterval(interval);
  }, [lineIndex, isBooting, operatorName]);

  // Handle Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (isTyping) {
          // Skip typing
          const currentLine = DIALOGUE[lineIndex].text.replace('{NAME}', operatorName.toUpperCase());
          setDisplayedText(currentLine);
          setIsTyping(false);
        } else if (lineIndex < DIALOGUE.length) {
          // Next line or finish
          if (lineIndex === DIALOGUE.length - 1) {
            completeIntro();
          } else {
            setLineIndex(lineIndex + 1);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineIndex, isTyping, operatorName]);

  const completeIntro = () => {
    localStorage.setItem('cq_story_intro_seen', 'true');
    navigate('/story/dashboard');
  };

  return (
    <div className="h-screen w-screen bg-[#020205] flex flex-col items-center justify-center font-mono text-white relative overflow-hidden">
      {/* Background Glitch Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-0 w-full h-[2px] bg-red-500/50 animate-pulse"></div>
        <div className="absolute top-2/3 left-0 w-full h-[1px] bg-[var(--current-theme-color)]/50 animate-pulse delay-100"></div>
      </div>

      <AnimatePresence mode="wait">
        {isBooting ? (
          <motion.div 
            key="boot"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            className="flex flex-col items-center"
          >
            <ShieldAlert size={64} className="text-red-500 animate-pulse mb-6" />
            <h1 className="text-3xl font-bold tracking-[0.5em] text-red-500">BREACH DETECTED</h1>
            <p className="mt-4 text-white/50 text-sm tracking-widest">INITIALIZING EMERGENCY PROTOCOLS...</p>
          </motion.div>
        ) : (
          <motion.div 
            key="dialogue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl px-8 z-10"
          >
            <div className="border border-red-500/30 bg-red-950/10 p-10 backdrop-blur-md rounded-lg shadow-[0_0_50px_rgba(255,0,0,0.1)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-[var(--current-theme-color)] to-red-500 opacity-50"></div>
              
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <Terminal size={20} className="text-[var(--current-theme-color)]" />
                <span className="text-sm font-bold tracking-[0.3em] uppercase text-white/50">SECURE COMMS LINK</span>
                <span className="ml-auto text-xs text-red-500 animate-pulse flex items-center gap-2">
                  <Zap size={14} /> LIVE
                </span>
              </div>

              <div className="min-h-[150px]">
                {lineIndex < DIALOGUE.length && (
                  <motion.div 
                    key={lineIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2"
                  >
                    <span className={`text-xs tracking-[0.2em] font-bold ${DIALOGUE[lineIndex].color}`}>
                      {DIALOGUE[lineIndex].speaker} ::
                    </span>
                    <p className="text-2xl leading-relaxed tracking-wide text-white/90">
                      {displayedText}
                      <span className={`inline-block w-3 h-6 ml-2 bg-[var(--current-theme-color)] ${isTyping ? 'animate-pulse' : 'animate-bounce'}`}></span>
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="mt-12 flex justify-between items-center text-xs text-white/30 tracking-[0.2em]">
                <span>ENCRYPTION NETWORK : OFFLINE</span>
                <span className={isTyping ? 'opacity-0' : 'opacity-100 animate-pulse text-[var(--current-theme-color)]'}>
                  {lineIndex === DIALOGUE.length - 1 ? '[PRESS ENTER TO INITIATE LOCKDOWN]' : '[PRESS ENTER TO CONTINUE]'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IntroSequence;
