import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CHAPTERS } from './lib/game-data';
import { useStoryMode } from './lib/StoryModeContext';
import { Lock, CheckCircle2, Radar } from 'lucide-react';

const StoryModeMobile = () => {
  const { completedMissions, progress } = useStoryMode();
  const navigate = useNavigate();

  const isChapterLocked = (chapterId: number) => {
    if (chapterId === 1) return false;
    const prevChapter = CHAPTERS.find(c => c.id === chapterId - 1);
    if (!prevChapter) return false;
    return !prevChapter.missions.every(m => completedMissions.has(m.id));
  };

  const getChapterProgress = (chapterId: number) => {
    const chapter = CHAPTERS.find(c => c.id === chapterId);
    if (!chapter) return 0;
    const completed = chapter.missions.filter(m => completedMissions.has(m.id)).length;
    return Math.round((completed / chapter.missions.length) * 100);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#020205] text-white flex flex-col font-sans">
       <div className="sticky top-0 z-50 bg-[#020205]/90 backdrop-blur-md border-b border-[#00f2ff]/20 px-4 pt-10 pb-4 flex items-center gap-4 shadow-md">
         <button onClick={() => navigate('/dashboard')} className="p-2 border border-[#00f2ff]/30 rounded bg-[#00f2ff]/10 text-[#00f2ff]">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
         </button>
         <h1 className="cq-title text-2xl uppercase tracking-widest text-[#00f2ff] m-0">Story Mode</h1>
       </div>

       <div className="p-4 flex-1 overflow-y-auto">
         <div className="mb-8 flex items-center justify-between bg-[#0a0a0f] border border-[#00f2ff]/20 p-4 rounded-lg shadow-[0_0_15px_rgba(0,242,255,0.1)]">
           <span className="font-mono text-xs text-white/60 uppercase tracking-widest">Global Progress</span>
           <span className="font-display text-3xl font-bold text-[#00f2ff]">{progress}%</span>
         </div>

         <div className="flex flex-col gap-10 pb-12">
           {CHAPTERS.map(chapter => {
             const locked = isChapterLocked(chapter.id);
             return (
               <div key={chapter.id} className={`flex flex-col gap-4 ${locked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                 <div className="border-l-4 border-[#00f2ff] pl-4">
                   <h2 className="cq-heading text-2xl leading-tight text-white m-0">Chapter 0{chapter.id}</h2>
                   <div className="text-[var(--current-theme-color)]/70 text-sm tracking-widest font-bold uppercase mt-1">{chapter.title.split(':')[1]}</div>
                   <div className="text-xs font-mono text-white/40 mt-2">Completion: {getChapterProgress(chapter.id)}%</div>
                 </div>

                 <div className="flex flex-col gap-4">
                   {chapter.missions.map(mission => (
                     <Link key={mission.id} to={locked ? '#' : `/story/mission/${mission.id}`} className="block">
                       <div className={`tactical-panel bg-[#0a0a0f] p-4 border ${completedMissions.has(mission.id) ? 'border-[#00f2ff]/30 bg-[#00f2ff]/5' : 'border-white/10'} rounded flex items-center gap-4`}>
                         <div className={`p-3 rounded-full ${completedMissions.has(mission.id) ? 'bg-[#00f2ff]/20 text-[#00f2ff]' : 'bg-white/5 text-white/20'}`}>
                           {completedMissions.has(mission.id) ? <CheckCircle2 size={24} /> : <Radar size={24} />}
                         </div>
                         <div className="flex-1">
                           <h3 className="cq-subheading text-base mb-1">{mission.name}</h3>
                           <p className="text-[10px] font-mono text-white/50 line-clamp-1">{mission.description}</p>
                         </div>
                       </div>
                     </Link>
                   ))}
                 </div>
               </div>
             )
           })}

           {/* Quantum Ascent */}
           <div className={`p-8 border border-[#00f2ff]/40 text-center rounded-lg shadow-lg ${progress === 100 ? 'bg-[#00f2ff]/10 cursor-pointer' : 'opacity-40 grayscale'}`} onClick={() => progress === 100 && navigate('/story/quantum-ascent')}>
             <Lock className="mx-auto mb-3 text-[#00f2ff]" size={36} />
             <h3 className="cq-title text-2xl uppercase tracking-widest">Quantum Ascent</h3>
             <p className="font-mono text-[10px] text-white/40 uppercase mt-2">{progress === 100 ? 'Protocol Authorized' : 'Clear all sectors to unlock'}</p>
           </div>
         </div>
       </div>
    </div>
  );
};

export default StoryModeMobile;
