import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import Auth from './auth/Auth';
import CipherLab from '../cipherlab/CipherLab';
import Dashboard from './dashboard/Dashboard';
import Multiplayer from '../multiplayer/Multiplayer';
import StoryMode from './story_mode/StoryMode';
import BootLoader from './components/BootLoader';
import AppIntro from './components/AppIntro';
import { RefreshCw } from 'lucide-react';

const PortraitOverlay = () => {
  return (
    <div className="fixed inset-0 z-[999999] bg-[#020205] text-white flex-col items-center justify-center p-8 text-center hidden portrait:flex md:portrait:hidden">
       <RefreshCw size={64} className="text-[#00f2ff] mb-6 animate-spin-slow" />
       <h1 className="text-3xl font-bold tracking-widest text-white mb-4">Rotate Device</h1>
       <p className="font-mono text-sm text-white/60 tracking-wider">Please rotate your device to landscape mode to access the tactical terminal.</p>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/account?mode=login" />;
  return <>{children}</>;
};

function App() {
  const [showIntro, setShowIntro] = React.useState(() => {
    if (sessionStorage.getItem('cq_intro_seen')) return false;
    sessionStorage.setItem('cq_intro_seen', 'true');
    return true;
  });

  React.useEffect(() => {
    const buildCursorUrl = (color: string) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 3.5V18.5L8.7 14.2L11.8 20.1L15.1 18.7L11.9 12.8H17.5L4 3.5Z" fill="${color}" stroke="#ffffff" stroke-width="1.1" stroke-linejoin="round"/><path d="M7.4 6.5L14.9 11.7" stroke="rgba(255,255,255,0.35)" stroke-width="0.8" stroke-linecap="round"/></svg>`;
      return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 4 4, auto`;
    };
    const saved = '#00f2ff';
    document.documentElement.style.setProperty('--current-theme-color', saved);
    document.documentElement.style.setProperty('--theme-cursor', buildCursorUrl(saved));
  }, []);

  React.useEffect(() => {
    // Keep Vercel serverless functions warm
    const interval = setInterval(() => {
      fetch('/api/ping').catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthProvider>
      <AudioProvider>
        <PortraitOverlay />
        {showIntro && <AppIntro onComplete={() => setShowIntro(false)} />}
        <Router>
          <BootLoader />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/account" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/cipherlab" element={<ProtectedRoute><CipherLab /></ProtectedRoute>} />
            <Route path="/multiplayer" element={<ProtectedRoute><Multiplayer /></ProtectedRoute>} />
            <Route path="/story/*" element={<ProtectedRoute><StoryMode /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AudioProvider>
    </AuthProvider>
  );
}

export default App;
