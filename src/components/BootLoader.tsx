import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function BootLoader() {
  const location = useLocation();
  const prevPathRef = React.useRef(location.pathname);
  const isFirstMount = React.useRef(true);
  const [isBooting, setIsBooting] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = location.pathname;
    
    let shouldTrigger = false;
    const paths = ['/dashboard', '/cipherlab', '/multiplayer', '/story'];
    const isMajorRoute = paths.some(p => location.pathname.startsWith(p));

    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Only trigger on first mount if we came from Training Academy
      if (document.referrer.includes('training_academy') && isMajorRoute) {
        shouldTrigger = true;
      }
    } else {
      // Not first mount. Trigger if we didn't come from /account or root
      if (prevPath !== '/account' && prevPath !== '/' && isMajorRoute) {
        shouldTrigger = true;
      }
    }

    if (shouldTrigger) {
      setIsBooting(true);
      setShouldRender(true);
      const timer = setTimeout(() => {
        setIsBooting(false);
        setTimeout(() => setShouldRender(false), 200); // fade out duration
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  if (!shouldRender) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center pointer-events-auto"
      style={{
        opacity: isBooting ? 1 : 0,
        transition: 'opacity 0.2s ease-out'
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-[#00f2ff] font-mono text-xl md:text-2xl tracking-[0.4em] font-bold uppercase animate-pulse">
          Booting Up
        </h2>
        <div className="w-64 md:w-80 h-2 bg-white/10" style={{ transform: 'skewX(-20deg)' }}>
          <div
            className="h-full bg-[#00f2ff] shadow-[0_0_15px_#00f2ff]"
            style={{
              animation: 'bootProgress 0.5s linear forwards'
            }}
          />
        </div>
      </div>
      <style>
        {`
          @keyframes bootProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}
      </style>
    </div>
  );
}
