import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAPTERS, AVATAR_VARIANTS, AvatarVariant, Chapter } from './lib/game-data';
import { fetchMission, fetchHint } from './lib/api';
import { StoryModeProvider, useStoryMode } from './lib/StoryModeContext';
import { generateCertificate } from './lib/certificate';
import { Download, FileText, X as XIcon, ChevronRight, ChevronLeft, Settings, Lock, Shield, Radar, CheckCircle2, AlertCircle, MoveHorizontal, Terminal, Lightbulb, Unlock, Verified, ShieldX, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

const Dashboard = () => {
  const { operatorName, selectedAvatar, completedMissions, earnedBadges, setAvatar, progress, xp, completedChapters } = useStoryMode();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showCertificates, setShowCertificates] = useState(false);
  const navigate = useNavigate();

  const cycleAvatar = () => {
    const idx = AVATAR_VARIANTS.findIndex(v => v.id === selectedAvatar.id);
    const nextIdx = (idx + 1) % AVATAR_VARIANTS.length;
    setAvatar(AVATAR_VARIANTS[nextIdx]);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const stopDragging = () => setIsDragging(false);

  const onWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY * 2;
    }
  };

  const getChapterProgress = (chapterId: number) => {
    const chapter = CHAPTERS.find(c => c.id === chapterId);
    if (!chapter) return 0;
    const completed = chapter.missions.filter(m => completedMissions.has(m.id)).length;
    return Math.round((completed / chapter.missions.length) * 100);
  };

  const isChapterLocked = (chapterId: number) => {
    if (chapterId === 1) return false;
    const prevChapter = CHAPTERS.find(c => c.id === chapterId - 1);
    if (!prevChapter) return false;
    return !prevChapter.missions.every(m => completedMissions.has(m.id));
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#020205] text-white font-sans selection:bg-[var(--current-theme-color)]/30">
      {/* Standardized Background */}
      <div className="absolute inset-0 z-0 bg-[#050505] overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
        {/* Left corner back arrow */}
        <button onClick={() => navigate('/dashboard')} className="fixed top-0 left-0 w-28 h-28 bg-[#00f2ff] hover:bg-white transition-colors cursor-pointer group pointer-events-auto z-50 flex items-start justify-start pl-6 pt-6 shadow-[0_0_30px_#00f2ff] outline-none" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
           <div className="w-8 h-8 flex items-center justify-center">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-black group-hover:stroke-[#00f2ff] group-hover:-translate-x-1 transition-transform">
               <path d="m15 18-6-6 6-6"/>
             </svg>
           </div>
        </button>

        {/* Certificate button beside arrow */}
        <div className="absolute top-8 left-32 flex items-center gap-6 pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCertificates(true); }}
            className="flex items-center gap-3 tactical-panel px-6 py-2 text-[var(--current-theme-color)] border-[var(--current-theme-color)]/30 hover:bg-[var(--current-theme-color)]/10 transition-all group"
          >
            <Shield className="w-4 h-4" />
            <span className="font-mono uppercase tracking-widest text-[10px]">Show_Certificates</span>
          </button>
        </div>

        {/* Right side module name */}
        <div className="absolute top-6 right-10 flex flex-col items-end pointer-events-auto">
          <h1 className="cq-title tracking-widest uppercase text-right">Story Mode</h1>
        </div>
      </div>

      {/* Node Map Layout */}
      <div 
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onWheel={onWheel}
        className="absolute inset-0 flex items-center overflow-x-auto overflow-y-hidden gap-x-24 px-[10vw] hide-scrollbar z-10 pt-12 pb-24 cursor-grab active:cursor-grabbing"
      >
        <div className="absolute top-[50%] left-0 right-0 min-w-max h-[1px] bg-gradient-to-r from-transparent via-[var(--current-theme-color)]/20 to-transparent -translate-y-1/2 z-0 pointer-events-none"></div>

        {CHAPTERS.map((chapter) => {
          const locked = isChapterLocked(chapter.id);
          
          return (
            <div key={chapter.id} className={`relative flex items-center flex-shrink-0 min-w-[70vw] lg:min-w-[55vw] ${locked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="grid grid-cols-[auto_1fr] gap-16 w-full h-full">
                
                {/* Chapter Header Module */}
                <div className="relative z-20 flex flex-col justify-center h-[500px] w-[340px]">
                  <div className="absolute -top-12 -left-12 font-display text-[220px] font-bold text-[var(--current-theme-color)] opacity-[0.03] leading-none select-none z-0 pointer-events-none">
                     0{chapter.id}
                  </div>
                  <div className="tactical-panel p-10 relative overflow-hidden group transition-all duration-700 z-10 w-full h-[360px] flex flex-col justify-between border-white/5 shadow-2xl">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-sm">
                        {locked ? <Lock className="text-white/20" size={24} /> : <Shield className={getChapterProgress(chapter.id) === 100 ? 'text-[var(--current-theme-color)]' : 'text-white/20'} size={24} />}
                      </div>
                      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[var(--current-theme-color)]/60">
                        {locked ? 'SEC_LOCKED' : `SEC_ID: 0${chapter.id}`}
                      </span>
                    </div>
                    <div>
                      <h2 className="cq-heading mb-2 leading-[0.85]">
                        {chapter.title.split(':')[0]}<br/>
                        <span className="text-[var(--current-theme-color)]/40 text-3xl">{chapter.title.split(':')[1]}</span>
                      </h2>
                      <div className="mt-8">
                        <div className="flex justify-between text-[9px] font-mono uppercase tracking-[0.2em] mb-3 text-white/30">
                           <span>Neutralization_Rate</span>
                           <span className="text-[var(--current-theme-color)]">{getChapterProgress(chapter.id)}%</span>
                        </div>
                        <div className="w-full h-[2px] bg-white/5 overflow-hidden rounded-full mb-4">
                           <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${getChapterProgress(chapter.id)}%` }}
                            className="h-full bg-[var(--current-theme-color)] shadow-[0_0_15px_var(--current-theme-color)]"
                           />
                        </div>
                        {getChapterProgress(chapter.id) === 100 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = generateCertificate(chapter, operatorName, selectedAvatar.colorHex);
                              link.download = `cipherquest-clearance-phase${chapter.id}.png`;
                              link.click();
                            }}
                            className="w-full mt-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 px-4 py-2 flex items-center justify-center gap-2 rounded transition-all outline-none border text-[var(--current-theme-color)] bg-[var(--current-theme-color)]/10 cursor-pointer"
                            style={{
                              borderColor: 'var(--current-theme-color)',
                            }}
                          >
                             <Download size={12} /> Download Certificate
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--current-theme-color)]/30 to-transparent" />
                  </div>
                </div>

                {/* Mission Gallery */}
                <div className="relative z-10 flex items-center gap-8 overflow-visible h-[500px] w-max pr-12">
                  {chapter.missions.map((mission, i) => (
                    <Link key={mission.id} to={locked ? '#' : `mission/${mission.id}`} onClick={(e) => locked && e.preventDefault()}>
                      <div className={`relative group cursor-pointer outline-none w-[280px] h-[380px] flex-shrink-0 transition-transform duration-500 hover:scale-[1.02] ${['translate-y-4', 'translate-y-[-8px]', 'translate-y-12', 'translate-y-0', 'translate-y-[-4px]'][i % 5]}`}>
                        <div className={`absolute inset-0 tactical-panel bg-[#0a0a0f]/95 border-white/5 flex flex-col group-hover:border-[var(--current-theme-color)]/40 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all ${completedMissions.has(mission.id) ? 'border-[var(--current-theme-color)]/20' : ''}`}>
                          <div className="h-40 bg-white/5 relative overflow-hidden flex items-center justify-center p-8 border-b border-white/5">
                             {completedMissions.has(mission.id) && (
                               <div className="absolute top-4 right-4 text-[var(--current-theme-color)] z-20 flex items-center gap-2">
                                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase">Verified</span>
                                  <CheckCircle2 size={14} />
                               </div>
                             )}
                             <Radar className={`h-20 w-20 text-white/5 group-hover:text-[var(--current-theme-color)]/20 transition-all duration-700 ${completedMissions.has(mission.id) ? 'text-[var(--current-theme-color)]/20' : ''}`} />
                          </div>
                          <div className="flex-1 p-8 flex flex-col justify-between">
                            <div className="space-y-3">
                               <div className="flex items-center gap-2">
                                 <div className="w-1 h-1 bg-[var(--current-theme-color)] rounded-full animate-pulse" />
                                 <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--current-theme-color)]">
                                   Mission_Protocol
                                 </span>
                               </div>
                               <h3 className="cq-subheading leading-[0.9] group-hover:text-white group-hover:glow-text-theme transition-all">{mission.name}</h3>
                               <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest line-clamp-2">{mission.description}</p>
                            </div>
                            <div className="pt-6 flex items-center justify-between border-t border-white/5">
                               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                                 {completedMissions.has(mission.id) ? 'Re-Intercept' : 'Begin_Breach'}
                               </span>
                               <ChevronRight className="text-white/20 group-hover:text-[var(--current-theme-color)] group-hover:translate-x-1 transition-all" size={16} />
                            </div>
                          </div>
                          {/* Dynamic Scanning Border */}
                          <div className="absolute top-0 left-0 w-0 h-[1px] bg-[var(--current-theme-color)] group-hover:w-full transition-all duration-500" />
                          <div className="absolute bottom-0 right-0 w-0 h-[1px] bg-[var(--current-theme-color)] group-hover:w-full transition-all duration-500" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        
        {/* Capstone Ascent */}
        <div className="flex-shrink-0 ml-12 pr-40 z-20 flex items-center h-[500px]">
          <div 
            onClick={() => progress === 100 && navigate('quantum-ascent')}
            className={`tactical-panel w-[420px] h-[360px] flex flex-col justify-center items-center relative overflow-hidden group transition-all duration-1000 ${progress === 100 ? 'cursor-pointer hover:border-[var(--current-theme-color)] shadow-2xl' : 'opacity-40 grayscale'}`}
          >
             <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-full group-hover:animate-spin-slow group-hover:border-[var(--current-theme-color)]/20"></div>
             <div className="z-10 flex flex-col items-center text-center p-12">
                {progress === 100 ? <Unlock className="mb-6 text-[var(--current-theme-color)] glow-theme" size={72} /> : <Lock className="mb-6 text-white/10" size={72} />}
                <h3 className="cq-title tracking-widest mb-3">Quantum<br/><span className="text-[var(--current-theme-color)]">Ascent</span></h3>
                <p className={`font-mono text-[10px] tracking-[0.3em] uppercase ${progress === 100 ? 'text-[var(--current-theme-color)] animate-pulse' : 'text-white/20'}`}>
                  {progress === 100 ? 'Protocol_Authorized' : 'Sector_Clearance_Required'}
                </p>
             </div>
             <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-white/10 group-hover:border-[var(--current-theme-color)] transition-colors" />
             <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-white/10 group-hover:border-[var(--current-theme-color)] transition-colors" />
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent h-32 flex items-end px-12 pb-8 z-50 pointer-events-none">
        <div className="w-full flex justify-between items-end">
          <div className="flex flex-col gap-2 items-start pointer-events-auto">
            <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em]">Global Completion</span>
            <div className="flex items-center gap-6 bg-surface-dark/90 backdrop-blur-md border border-white/10 px-8 py-4 rounded-full">
              <div className="flex items-baseline gap-1">
                 <span className="font-display text-4xl font-bold text-white">{progress}</span>
                 <span className="font-display text-xl text-white/50">%</span>
              </div>
              <div className="w-64 h-1.5 bg-surface-highlight rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-white" 
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 pointer-events-auto">
             <div className="font-sans text-xs text-white/40 tracking-wider uppercase">Drag or scroll to explore sectors</div>
             <MoveHorizontal className="text-white/20 animate-bounce" />
          </div>
        </div>
      </div>

      {/* Certificate Gallery Modal */}
      <AnimatePresence>
        {showCertificates && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
          >
            <div className="w-full max-w-6xl h-full flex flex-col">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-4xl font-display font-black uppercase tracking-tighter text-white">Neural_Clearance_Archive</h2>
                  <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.4em] mt-2">CALLSIGN: {operatorName.toUpperCase()}</p>
                </div>
                <button onClick={() => setShowCertificates(false)} className="w-12 h-12 tactical-panel flex items-center justify-center hover:bg-white/5 transition-colors">
                  <XIcon size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pr-4 custom-scrollbar">
                {progress === 100 && (
                  <div className="tactical-panel p-6 bg-[#0a0a0f] border-[var(--current-theme-color)]/30 group hover:border-[var(--current-theme-color)] transition-all flex flex-col gap-6">
                    <div className="aspect-[10/7] bg-black/40 border border-[var(--current-theme-color)]/20 flex items-center justify-center overflow-hidden relative">
                       <img 
                         src={generateCertificate(null, operatorName, '#ffffff')} 
                         alt="Master Certificate"
                         className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                       />
                    </div>
                    <a 
                      href={generateCertificate(null, operatorName, '#ffffff')}
                      download={`CipherQuest_Master_Certificate.png`}
                      className="w-full h-12 tactical-panel flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[var(--current-theme-color)] hover:bg-[var(--current-theme-color)]/10 transition-all cursor-pointer"
                      style={{ borderColor: 'var(--current-theme-color)', borderWidth: '1px' }}
                    >
                      <Download size={16} /> Download Master Certificate
                    </a>
                  </div>
                )}
                {completedChapters.length > 0 ? (
                  CHAPTERS.filter(c => completedChapters.includes(c.id)).map(chap => (
                    <div 
                      key={chap.id} 
                      className="tactical-panel p-6 bg-[#0a0a0f] border-white/5 group hover:border-[var(--current-theme-color)] transition-all flex flex-col gap-6"
                    >
                      <div className="aspect-[10/7] bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden relative">
                         <img 
                           src={generateCertificate(chap, operatorName, selectedAvatar.colorHex)} 
                           alt={`Chapter ${chap.id} Certificate`}
                           className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                         />
                      </div>
                      <a 
                        href={generateCertificate(chap, operatorName, selectedAvatar.colorHex)}
                        download={`CipherQuest_Certificate_Sector_${chap.id}.png`}
                        className="w-full h-12 tactical-panel flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[var(--current-theme-color)] hover:bg-[var(--current-theme-color)]/10 transition-all cursor-pointer"
                        style={{ borderColor: 'var(--current-theme-color)', borderWidth: '1px' }}
                      >
                        <Download size={16} /> Download Sector clearance
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full h-full flex flex-col items-center justify-center text-white/20 py-20">
                    <AlertCircle size={48} className="mb-4 opacity-10" />
                    <span className="font-mono text-xs uppercase tracking-[0.4em]">No_Certificates_Earned</span>
                    <p className="mt-2 text-[10px] text-white/10 uppercase tracking-widest">Complete sectors to generate neural clearance certificates</p>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MissionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { completeMission, operatorName, xp, selectedAvatar } = useStoryMode();
  
  const [missionState, setMissionState] = useState<'intercept' | 'cipher' | 'failed'>('intercept');
  const [mission, setMission] = useState<any>(null);
  const [input, setInput] = useState('');
  const [integrity, setIntegrity] = useState(100);
  const [error, setError] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedChapterId, setCompletedChapterId] = useState<number | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const missionData = useMemo(() => {
    for (const chapter of CHAPTERS) {
      const found = chapter.missions.find(m => m.id === id);
      if (found) return found;
    }
    return null;
  }, [id]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    loadMission();
  }, [id]);

  const loadMission = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setLoading(true);
    setMissionState('intercept');
    setInput('');
    setIntegrity(100);
    setHints([]);
    setCurrentHintIndex(-1);
    setError(false);
    setIsSuccess(false);
    setCompletedChapterId(null);
    
    try {
      const data = await fetchMission(id!);
      setMission(data);
      setLoading(false);
      
      timeoutRef.current = setTimeout(() => {
        setMissionState('cipher');
      }, 1500);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const checkAnswer = async () => {
    if (!mission) return;
    if (input.toUpperCase() === mission.expectedCiphertext.toUpperCase()) {
      setIsSuccess(true);
      confetti({ particleCount: 150, spread: 70, colors: ['var(--current-theme-color)', '#ff00ff', '#ffffff'] });
      
      const result = await completeMission(id!);
      if (result?.chapterComplete) {
         const chapId = parseInt(id!.split('-')[0]);
         setCompletedChapterId(chapId);
      } else {
         setTimeout(() => navigate('/story'), 2500);
      }
    } else {
      setError(true);
      const nextIntegrity = Math.max(0, integrity - 34);
      setIntegrity(nextIntegrity);
      setInput('');
      
      if (nextIntegrity === 0) {
        setMissionState('failed');
      } else {
        setTimeout(() => setError(false), 800);
        if (hints.length === 0) requestHint();
      }
    }
  };

  const requestHint = async () => {
    if (!mission) return;
    if (hints.length === 0) {
      try {
        const data = await fetchHint({
          plaintext: mission.plaintext,
          expectedCiphertext: mission.expectedCiphertext,
          rule: mission.rule,
          userInput: input
        });
        if (data.hints?.length) {
          setHints(data.hints);
          setCurrentHintIndex(0);
        }
      } catch (e) {
        console.error('Hint fetch error', e);
      }
    } else {
      setCurrentHintIndex((prev) => (prev + 1) % hints.length);
    }
  };

  if (loading) return null;

  return (
    <div className="h-screen w-screen bg-[#020205] flex flex-col font-sans text-white relative overflow-hidden">
      {/* Standardized Background */}
      <div className="absolute inset-0 z-0 bg-[#050505] overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[120px] bg-[#00f2ff]" />
      </div>
      
      {/* Left corner back arrow */}
      <button onClick={() => navigate('/story')} className="fixed top-0 left-0 w-28 h-28 hover:bg-white transition-colors cursor-pointer group pointer-events-auto z-50 flex items-start justify-start pl-6 pt-6 outline-none bg-[#00f2ff]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
         <div className="w-8 h-8 flex items-center justify-center">
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-black group-hover:stroke-[#00f2ff] group-hover:-translate-x-1 transition-transform">
             <path d="m15 18-6-6 6-6"/>
           </svg>
         </div>
      </button>

      {mission && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden z-10 flex flex-col items-center py-12 relative hide-scrollbar">
          <div className="w-full max-w-[1400px] px-8 flex flex-col xl:flex-row gap-16 items-stretch min-h-full">
            
            {missionState === 'intercept' && (
                <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
                   <div className="bg-[#0a0a0f]/90 border border-white/10 rounded-xl p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                       
                       {missionState === 'intercept' && (
                           <div className="flex flex-col items-center justify-center py-20 text-center">
                              <Radar size={64} className="text-white/20 animate-spin mb-6" />
                              <h2 className="cq-subheading text-white/50 tracking-[0.3em]">Intercepting Comms...</h2>
                              <p className="font-mono text-xs text-[var(--current-theme-color)] mt-4 animate-pulse">&gt; Routing through proxy...</p>
                           </div>
                       )}
                   </div>
                </div>
            )}

            {missionState === 'failed' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center max-w-2xl mx-auto w-full animate-in zoom-in fade-in duration-500">
                    <ShieldX size={120} className="text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.6)] mb-8" />
                    <h1 className="cq-title tracking-widest mb-4">Integrity Compromised</h1>
                    <p className="font-mono text-white/50 tracking-wider mb-12 leading-relaxed">The Syndicate breached our defenses. Data package stolen. We must fortify and try again.</p>
                    
                    <div className="flex gap-6">
                       <button onClick={() => navigate('/story')} className="border border-white/10 hover:border-white/30 hover:bg-white/5 text-white py-4 px-8 tracking-widest uppercase text-xs font-bold transition-all w-48">Abandon</button>
                       <button onClick={() => loadMission()} className="bg-red-500 hover:bg-red-600 text-white py-4 px-8 tracking-widest uppercase text-xs font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] w-48">Re-Deploy</button>
                    </div>
                </div>
            )}

            {missionState === 'cipher' && (
                <>
                {/* Left Column: Mission Brief & Tactical logs */}
                <div className="flex-1 flex flex-col gap-8 max-w-[500px]">
                  
                  <div>
                    <div className="font-mono text-[var(--current-theme-color)] text-[10px] tracking-[0.3em] mb-3 flex items-center gap-3 uppercase">
                       <span className="w-2 h-2 bg-[var(--current-theme-color)] animate-pulse rounded-full shadow-[0_0_8px_var(--current-theme-color)]"></span>
                       Active Operation_
                    </div>
                    <h1 className="cq-title tracking-wide leading-[0.9] drop-shadow-2xl">{mission.name}</h1>
                    <p className="text-white/60 font-sans text-base mt-8 border-l-2 border-l-[var(--current-theme-color)]/50 pl-5 leading-relaxed tracking-wide">{mission.description}</p>
                  </div>

                  {/* Terminal Output (Helper Logs) */}
                  <div className="flex-1 min-h-[300px] glass-panel p-6 flex flex-col relative overflow-hidden group border border-white/5 shadow-2xl rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--current-theme-color)]/5 to-transparent opacity-50 z-0 pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6 relative z-10">
                       <div className="flex items-center gap-3">
                         <Terminal size={18} className="text-white/50" />
                         <span className="font-sans font-bold tracking-[0.2em] text-white/50 uppercase text-[12px]">Command Feed</span>
                       </div>
                       <span className="font-mono text-white/20 text-[10px] tracking-widest">&gt;&gt;SYS:ROOT</span>
                    </div>
                    
                    <div className="relative z-10 space-y-3 font-mono text-[11px] leading-relaxed flex flex-col h-full">
                      <p className="text-[var(--current-theme-color)]/40">&gt;&gt; Firewall online.</p>
                      
                      <div className="mt-2 border border-[var(--current-theme-color)]/20 bg-[var(--current-theme-color)]/5 p-4 rounded mb-4">
                         <span className="text-[var(--current-theme-color)] font-bold tracking-[0.2em] uppercase text-[12px]">&gt; Known Protocol Parameters:</span>
                         <div className="text-white mt-2 font-mono text-[14px] whitespace-pre-wrap">{mission.rule}</div>
                         
                         {mission.fullMapping && (
                           <div className="mt-4 border-t border-[var(--current-theme-color)]/20 pt-4">
                             <span className="text-[var(--current-theme-color)] font-bold tracking-[0.2em] uppercase text-[11px] mb-3 block">&gt; Decryption Key:</span>
                             <div className="grid grid-cols-6 gap-2">
                                {Object.entries(mission.fullMapping).map(([k, v]: [any, any]) => (
                                  <div key={k} className="flex gap-1 items-center bg-black/40 px-2 py-1.5 border border-[var(--current-theme-color)]/10 text-[12px]">
                                     <span className="text-white/30">{k}</span>
                                     <span className="font-bold text-[var(--current-theme-color)]">→{v}</span>
                                  </div>
                                ))}
                             </div>
                           </div>
                         )}
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-white/5">
                         {hints.length > 0 && currentHintIndex >= 0 && (
                             <div className="bg-[#0a0a0f] border border-[var(--current-theme-color)]/30 p-4 rounded mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
                                <div className="absolute inset-0 bg-[var(--current-theme-color)]/5 opacity-50"></div>
                                <div className="relative z-10 flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                                  <p className="text-[var(--current-theme-color)] uppercase tracking-widest font-bold flex items-center gap-2 text-[12px]"><Lightbulb size={16} /> Tactical Intel [{currentHintIndex + 1}/{hints.length}]</p>
                                  <button onClick={requestHint} className="text-[11px] font-bold uppercase tracking-widest text-[var(--current-theme-color)] px-3 py-1.5 bg-[var(--current-theme-color)]/10 hover:bg-[var(--current-theme-color)]/20 border border-[var(--current-theme-color)]/30 rounded transition-colors shadow-[0_0_10px_var(--current-theme-color)] relative z-20 cursor-pointer">Follow Up Intel</button>
                                </div>
                                <p className="text-white/80 font-mono text-[14px] leading-relaxed relative z-10">{hints[currentHintIndex]}</p>
                             </div>
                         )}
                         
                         {!isSuccess && hints.length === 0 && (
                             <button onClick={requestHint} className="text-xs uppercase tracking-widest text-white/50 hover:text-[var(--current-theme-color)] border border-white/10 hover:border-[var(--current-theme-color)] bg-[#0a0a0f] px-4 py-2 w-full text-left transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">&gt;&gt; REQUEST FOR HINT</button>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: The "Engine" / I/O */}
                <div className="flex-[1.5] flex flex-col gap-6 w-full">
                  
                  {/* Input Data Display */}
                  <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl p-10 relative overflow-hidden shadow-xl">
                    <div className="absolute left-0 top-0 h-full w-1 bg-white/20 animate-pulse"></div>
                    
                    <div className="font-sans font-bold text-[10px] text-white/30 uppercase tracking-[0.3em] mb-6 flex justify-between">
                      <span>Intercepted Feed (Plaintext)</span>
                      <AlertTriangle size={16} className="text-red-500" />
                    </div>
                    
                    <div className="font-mono text-[42px] leading-[1.2] text-white tracking-[0.1em] break-all">
                      <span className="text-white/10 select-none mr-4">&gt;</span>{mission.plaintext}
                    </div>
                  </div>

                  {/* Data Transfer Connector */}
                  <div className="flex flex-col items-center justify-center -my-6 z-20 h-20 relative">
                     {/* Data Stream Line */}
                     <div className="w-[2px] h-full bg-gradient-to-b from-[var(--current-theme-color)]/0 via-[var(--current-theme-color)] to-[var(--current-theme-color)]/0 absolute opacity-50"></div>
                     {/* Data Packet */}
                     <div className="w-1.5 h-6 bg-[var(--current-theme-color)] absolute animate-[bounce_2s_infinite] shadow-[0_0_15px_var(--current-theme-color)] rounded-full z-10"></div>
                     
                     <div className="px-6 py-2 bg-[#0a0a0f] border border-[var(--current-theme-color)]/50 rounded-full relative z-20 flex items-center gap-3 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        <Settings size={16} className="text-[var(--current-theme-color)] animate-[spin_4s_linear_infinite]" />
                        <span className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Processing Node</span>
                        <ArrowRightLeft size={16} className="text-[var(--current-theme-color)]" />
                     </div>
                  </div>

                  {/* Ciphertext Input Area */}
                  <div className={`glass-panel p-10 relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 rounded-xl ${isSuccess ? 'border shadow-none' : 'border border-[var(--current-theme-color)]/30'}`}
                       style={{ 
                         borderColor: isSuccess ? 'color-mix(in srgb, var(--current-theme-color) 50%, transparent)' : '',
                         boxShadow: isSuccess ? '0 0 50px color-mix(in srgb, var(--current-theme-color) 10%, transparent)' : '' 
                       }}>
                    
                    <div className={`absolute left-0 top-0 h-full w-1 transition-colors duration-500 ${isSuccess ? 'bg-[var(--current-theme-color)]' : 'bg-[var(--current-theme-color)]'}`}></div>

                    <div className={`font-sans font-bold text-[10px] uppercase tracking-[0.3em] mb-8 flex justify-between text-[var(--current-theme-color)]`}>
                      <span>Encryption Protocol</span>
                      {isSuccess ? <span>[PROTOCOL SECURED]</span> : <span className="animate-pulse">[AWAITING ENCRYPTION]</span>}
                    </div>

                    <div className="relative flex items-center bg-[#0a0a0f]/50 rounded-lg p-6 border border-white/5 focus-within:border-white/20 transition-colors">
                      <span className="font-mono text-[32px] text-white/20 select-none mr-4">&gt;</span>
                      <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && !isSuccess && checkAnswer()}
                        disabled={isSuccess}
                        className="w-full bg-transparent text-white font-mono text-[40px] tracking-[0.1em] outline-none uppercase placeholder:text-white/10"
                        placeholder="ENTER CIPHER..."
                        spellCheck="false"
                      />
                    </div>

                    {/* Error Display */}
                    <div className="h-8 mt-6 flex items-center">
                       {error && (
                         <p className="font-mono text-[12px] font-bold text-red-500 tracking-[0.2em] flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded border border-red-500/20 animate-in fade-in">
                           <AlertCircle size={16} />
                           INTEGRITY FAILURE: MISMATCH DETECTED.
                         </p>
                       )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-8 flex justify-end">
                      {!isSuccess ? (
                        <button onClick={checkAnswer} className="cyber-button !bg-[#00f2ff] hover:!bg-white !text-black hover:!text-[#00f2ff] text-[18px] py-3 px-10 hover:shadow-[0_0_25px_rgba(255,255,255,0.8)] border-none outline-none group transition-colors duration-300">
                          <span className="relative z-10 font-bold group-hover:!text-[#00f2ff]">EXECUTE CIPHER</span>
                        </button>
                      ) : (
                        <button onClick={() => navigate('/story')} className="relative overflow-hidden text-[#0a0a0f] font-sans font-bold uppercase tracking-[0.2em] text-[14px] py-5 px-14 rounded hover:bg-white transition-all duration-300 outline-none group"
                                style={{
                                  backgroundColor: 'var(--current-theme-color)',
                                  boxShadow: '0 0 30px color-mix(in srgb, var(--current-theme-color) 40%, transparent)'
                                }}>
                          <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                          RESUME OPERATIONS
                        </button>
                      )}
                    </div>
                    
                    {isSuccess && (
                      <div className="absolute inset-0 bg-[var(--current-theme-color)]/5 mix-blend-screen pointer-events-none rounded-xl"></div>
                    )}
                  </div>

                </div>
                </>
            )}
          </div>
        </div>
      )}

      {/* Chapter Complete Popup */}
      <AnimatePresence>
        {completedChapterId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-5xl flex flex-col items-center gap-12"
            >
              <div className="text-center space-y-4">
                <h2 className="cq-title">Sector_Secured</h2>
                <p className="font-mono text-sm text-[var(--current-theme-color)] uppercase tracking-[0.5em] animate-pulse">Authentication_Clearance_Generated</p>
              </div>

              <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">
                <img 
                  src={generateCertificate(CHAPTERS.find(c => c.id === completedChapterId)!, operatorName, selectedAvatar.colorHex)} 
                  alt="Chapter Completion Certificate"
                  className="max-w-full h-auto"
                />
              </div>

              <div className="flex gap-8">
                <a 
                  href={generateCertificate(CHAPTERS.find(c => c.id === completedChapterId)!, operatorName, selectedAvatar.colorHex)}
                  download={`CipherQuest_Certificate_Sector_${completedChapterId}.png`}
                  className="cyber-button px-16 h-16 text-lg bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-4"
                >
                  <Download size={24} /> DOWNLOAD_CLEARANCE
                </a>
                <button 
                  onClick={() => navigate('/story')}
                  className="cyber-button px-16 h-16 text-lg border-white/10 hover:bg-white/5"
                >
                  RETURN_TO_HQ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Quantum Ascent Component ──────────────────────────────────── */
const KNOX_DIALOGUES = [
  "KNOX: Operator, the Syndicate mainframe is shielded by RSA-2048 asymmetric encryption.",
  "KNOX: Conventional decryption would take approximately 300 million years.",
  "KNOX: ...Wait. I am detecting an experimental quantum co-processor attached to your terminal.",
  "KNOX: If you can manually align its qubits into harmonic resonance, I can execute Shor's Algorithm.",
  "KNOX: Probability of cryptographic collapse: 100%. Awaiting qubit alignment.",
];

const QuantumAscent = () => {
  const navigate = useNavigate();
  const { operatorName, selectedAvatar, progress, completedChapters } = useStoryMode();
  
  const [dialoguePhase, setDialoguePhase] = useState(true);
  const [dialogueIndex, setDialogueIndex] = useState(-1);
  const [quantumGrid, setQuantumGrid] = useState<boolean[]>(Array(9).fill(true));
  const [quantumSolved, setQuantumSolved] = useState(false);
  const [hintText, setHintText] = useState('');
  const [fetchingHint, setFetchingHint] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // Initialize puzzle
  useEffect(() => {
    if (progress < 100) {
      navigate('/story');
      return;
    }

    // Start Knox dialogue sequence
    let idx = 0;
    setDialogueIndex(0);
    const interval = setInterval(() => {
      idx++;
      if (idx < KNOX_DIALOGUES.length) {
        setDialogueIndex(idx);
      } else {
        clearInterval(interval);
        setTimeout(() => setDialoguePhase(false), 1500);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Shuffle puzzle when dialogue ends
  useEffect(() => {
    if (!dialoguePhase) {
      const grid = Array(9).fill(true);
      const click = (idx: number, g: boolean[]) => {
        const x = idx % 3;
        const y = Math.floor(idx / 3);
        const targets: [number, number][] = [[x, y], [x-1, y], [x+1, y], [x, y-1], [x, y+1]];
        targets.forEach(([tx, ty]) => {
          if (tx >= 0 && tx < 3 && ty >= 0 && ty < 3) {
            const tidx = ty * 3 + tx;
            g[tidx] = !g[tidx];
          }
        });
      };
      for (let i = 0; i < 7; i++) {
        click(Math.floor(Math.random() * 9), grid);
      }
      if (grid.every(v => v)) click(4, grid);
      setQuantumGrid([...grid]);
    }
  }, [dialoguePhase]);

  const toggleNode = (idx: number) => {
    if (quantumSolved) return;
    const grid = [...quantumGrid];
    const x = idx % 3;
    const y = Math.floor(idx / 3);
    const targets: [number, number][] = [[x, y], [x-1, y], [x+1, y], [x, y-1], [x, y+1]];
    targets.forEach(([tx, ty]) => {
      if (tx >= 0 && tx < 3 && ty >= 0 && ty < 3) {
        const tidx = ty * 3 + tx;
        grid[tidx] = !grid[tidx];
      }
    });
    setQuantumGrid(grid);

    if (grid.every(v => v)) {
      setQuantumSolved(true);
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: [selectedAvatar.colorHex, '#ffffff', 'var(--current-theme-color)'] });
        setTimeout(() => setShowCompletion(true), 1000);
      }, 200);
    }
  };

  const requestHint = async () => {
    if (fetchingHint) return;
    setFetchingHint(true);
    try {
      const gridState = quantumGrid.map(b => b ? '1' : '0').join('');
      const res = await fetch('/api/quantum-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gridState })
      });
      const data = await res.json();
      setHintText(data.hint || 'Realignment is complex. Trial and error often reveals the pattern.');
    } catch {
      setHintText('Try focusing on the corners first to clear the center.');
    } finally {
      setFetchingHint(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#020205] flex flex-col font-sans text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 grid-bg opacity-[0.05] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020205_95%)] pointer-events-none"></div>
      </div>

      <header className="h-20 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-2xl flex justify-between items-center px-10 z-20 relative">
        <button onClick={() => navigate('/story')} className="flex items-center gap-4 group tactical-panel px-4 py-2 border-white/10 hover:border-[var(--current-theme-color)] transition-all">
          <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={18} />
          <span className="font-bold tracking-[0.2em] text-[10px] uppercase text-white/50 group-hover:text-white">Return_to_HQ</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[var(--current-theme-color)] rounded-full animate-pulse" />
          <span className="font-mono text-[10px] text-[var(--current-theme-color)] uppercase tracking-[0.4em] font-bold">Quantum_Protocol_Active</span>
        </div>
      </header>

      <div className="flex-1 z-10 flex flex-col items-center justify-center relative overflow-y-auto">
        <AnimatePresence mode="wait">
          {dialoguePhase ? (
            <motion.div key="dialogue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-2xl px-8">
              <div className="tactical-panel p-12 bg-[#0a0a0f]/95 border-[var(--current-theme-color)]/20">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-3 h-3 bg-[var(--current-theme-color)] rounded-full animate-ping" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--current-theme-color)] font-bold">KNOX_SYSTEM_LINK</span>
                </div>
                <div className="space-y-4 font-mono text-sm leading-relaxed">
                  {KNOX_DIALOGUES.map((line, i) => (
                    <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= dialogueIndex ? 1 : 0.1, x: 0 }} transition={{ delay: 0.1 }}
                      className={`${i <= dialogueIndex ? 'text-[var(--current-theme-color)]' : 'text-white/10'}`}
                    >{line}</motion.p>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="puzzle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-10">
              <div className="text-center">
                <h2 className="cq-title mb-3">Qubit_Alignment</h2>
                <p className="font-mono text-[10px] text-[var(--current-theme-color)] uppercase tracking-[0.4em]">Toggle all qubits to ON state</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {quantumGrid.map((on, idx) => (
                  <motion.button key={idx} whileTap={{ scale: 0.9 }}
                    onClick={() => toggleNode(idx)}
                    className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center font-mono text-lg font-bold transition-all duration-300 ${
                      on ? 'bg-[var(--current-theme-color)] border-[var(--current-theme-color)] text-black shadow-[0_0_25px_var(--current-theme-color)]' : 'bg-white/5 border-white/10 text-white/30'
                    }`}
                  >
                    {on ? '|1⟩' : '|0⟩'}
                  </motion.button>
                ))}
              </div>

              {!quantumSolved && (
                <div className="flex flex-col items-center gap-4 w-full max-w-md">
                  <button onClick={requestHint} disabled={fetchingHint}
                    className="tactical-panel px-8 py-3 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-[var(--current-theme-color)] hover:border-[var(--current-theme-color)] transition-all"
                  >{fetchingHint ? 'Analyzing...' : 'Request_KNOX_Intel'}</button>
                  {hintText && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="tactical-panel p-6 bg-[var(--current-theme-color)]/5 border-[var(--current-theme-color)]/20 w-full"
                    >
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--current-theme-color)] mb-2 block font-bold">KNOX_INTEL::</span>
                      <p className="font-mono text-xs text-white/70 leading-relaxed">{hintText}</p>
                    </motion.div>
                  )}
                </div>
              )}

              {quantumSolved && !showCompletion && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <p className="font-mono text-[var(--current-theme-color)] uppercase tracking-[0.4em] text-sm animate-pulse">
                    Shor's Algorithm Executing...
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Story Mode Completion Popup */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-4xl flex flex-col items-center gap-10">
              <div className="text-center space-y-4">
                <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="cq-title"
                >STORY_MODE<br/><span className="text-[var(--current-theme-color)]">COMPLETE</span></motion.h2>
                <p className="font-mono text-sm text-[var(--current-theme-color)] uppercase tracking-[0.5em] animate-pulse">
                  All Sectors Neutralized • Quantum Ascent Achieved
                </p>
              </div>

              <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-[var(--current-theme-color)]/30">
                <img 
                  src={generateCertificate({ id: 5, title: 'FINAL: QUANTUM ASCENT', missions: [] }, operatorName, selectedAvatar.colorHex)}
                  alt="Story Mode Completion Certificate"
                  className="max-w-full h-auto"
                />
              </div>

              <div className="flex gap-8">
                <a 
                  href={generateCertificate({ id: 5, title: 'FINAL: QUANTUM ASCENT', missions: [] }, operatorName, selectedAvatar.colorHex)}
                  download="CipherQuest_Story_Mode_Complete.png"
                  className="cyber-button px-16 h-16 text-lg bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-4"
                >
                  <Download size={24} /> DOWNLOAD_CERTIFICATE
                </a>
                <button onClick={() => navigate('/story')}
                  className="cyber-button px-16 h-16 text-lg border-white/10 hover:bg-white/5"
                >RETURN_TO_HQ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function StoryMode() {
  return (
    <StoryModeProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="mission/:id" element={<MissionView />} />
        <Route path="quantum-ascent" element={<QuantumAscent />} />
      </Routes>
    </StoryModeProvider>
  );
}

export default StoryMode;

