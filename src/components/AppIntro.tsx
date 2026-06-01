import React from 'react';

type AppIntroProps = {
  onComplete: () => void;
};

type Drop = {
  x: number;
  y: number;
  speed: number;
  len: number;
  color: string;
};

const DROP_COLORS = ['#ff003c', '#bf00ff', '#0080ff', '#ff0099', '#7700ff', '#ff2266'];
const GLITCH_COLORS = ['255,0,60', '191,0,255', '0,128,255', '255,0,153', '119,0,255'];
const INTRO_AUTO_CLOSE_MS = 4500;

export default function AppIntro({ onComplete }: AppIntroProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const titleRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const titleTimerRef = React.useRef<number | null>(null);
  const autoTimerRef = React.useRef<number | null>(null);
  const dropsRef = React.useRef<Drop[]>([]);
  const frameRef = React.useRef(0);

  const clearTimers = React.useCallback(() => {
    if (titleTimerRef.current !== null) {
      window.clearTimeout(titleTimerRef.current);
      titleTimerRef.current = null;
    }
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const startIntro = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    clearTimers();

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const titleEl = titleRef.current;
    if (titleEl) {
      titleEl.classList.remove('cq-intro__title--animate');
      titleEl.style.opacity = '0';
      void titleEl.offsetWidth;
    }

    dropsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.4 + Math.random() * 1.2,
      len: 10 + Math.random() * 40,
      color: DROP_COLORS[Math.floor(Math.random() * DROP_COLORS.length)],
    }));
    frameRef.current = 0;

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, width, height);

      if (frameRef.current < 140 && Math.random() < 0.28) {
        const gx = Math.random() * width;
        const gy = Math.random() * height;
        const gw = 20 + Math.random() * 220;
        const gh = 2 + Math.random() * 8;
        const c = GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)];
        ctx.fillStyle = `rgba(${c},${0.15 + Math.random() * 0.35})`;
        ctx.fillRect(gx, gy, gw, gh);
      }

      dropsRef.current.forEach((drop) => {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.strokeStyle = drop.color;
        ctx.shadowColor = drop.color;
        ctx.shadowBlur = 5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x, drop.y + drop.len);
        ctx.stroke();
        ctx.restore();

        drop.y += drop.speed;
        if (drop.y > height + drop.len) {
          drop.y = -drop.len;
          drop.x = Math.random() * width;
        }
      });

      frameRef.current += 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    titleTimerRef.current = window.setTimeout(() => {
      if (titleEl) {
        titleEl.classList.add('cq-intro__title--animate');
        titleEl.style.opacity = '1';
      }
    }, 500);

    autoTimerRef.current = window.setTimeout(() => onComplete(), INTRO_AUTO_CLOSE_MS);
  }, [clearTimers, onComplete]);

  React.useEffect(() => {
    startIntro();
    const handleResize = () => startIntro();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clearTimers();
    };
  }, [clearTimers, startIntro]);

  return (
    <div className="cq-intro" role="presentation">
      <canvas ref={canvasRef} className="cq-intro__canvas" />
      <div className="cq-intro__scanlines" aria-hidden="true" />
      <div ref={titleRef} className="cq-intro__title">CIPHERQUEST</div>
      <div className="cq-intro__controls">
        <button type="button" className="cq-intro__replay" onClick={startIntro}>REPLAY</button>
        <button type="button" className="cq-intro__skip" onClick={onComplete}>SKIP</button>
      </div>
    </div>
  );
}


