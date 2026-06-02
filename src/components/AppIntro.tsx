import React, { useEffect, useRef, useState } from 'react';

export default function AppIntro({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    
    function resize() {
      if (canvas) {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }
    window.addEventListener('resize', resize);
    resize();

    const W = canvas.width;
    const H = canvas.height;

    const drops = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.4 + Math.random() * 1.2,
      len: 10 + Math.random() * 40,
      color: ['#ff003c','#bf00ff','#0080ff','#ff0099','#7700ff','#ff2266'][Math.floor(Math.random()*6)]
    }));

    let frame = 0;

    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // glitch blocks in first 140 frames
      if (frame < 140 && Math.random() < 0.28) {
        const gx = Math.random() * canvas.width;
        const gy = Math.random() * canvas.height;
        const gw = 20 + Math.random() * 220;
        const gh = 2 + Math.random() * 8;
        const c = ['255,0,60','191,0,255','0,128,255','255,0,153','119,0,255'][Math.floor(Math.random()*5)];
        ctx.fillStyle = `rgba(${c},${0.15 + Math.random() * 0.35})`;
        ctx.fillRect(gx, gy, gw, gh);
      }

      // rain drops
      drops.forEach(d => {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.strokeStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y + d.len);
        ctx.stroke();
        ctx.restore();

        d.y += d.speed;
        if (d.y > canvas.height + d.len) {
          d.y = -d.len;
          d.x = Math.random() * canvas.width;
        }
      });

      frame++;
      raf = requestAnimationFrame(draw);
    }

    draw();

    // trigger title after 500ms
    const titleTimer = setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.classList.add('animate');
        titleRef.current.style.opacity = '1';
      }
    }, 500);

    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 3500);

    const completeTimer = setTimeout(() => {
       onComplete();
    }, 4000);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      clearTimeout(titleTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[99999] bg-black pointer-events-auto overflow-hidden transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
          
          .cq-intro-font {
            font-family: 'Orbitron', sans-serif;
          }
          .scanlines-overlay {
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(180,0,255,0.03) 2px,
              rgba(180,0,255,0.03) 4px
            );
            pointer-events: none;
            z-index: 5;
          }
          .cq-title {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: clamp(36px, 8vw, 96px);
            font-weight: 900;
            letter-spacing: 0.15em;
            color: #fff;
            z-index: 10;
            text-align: center;
            white-space: nowrap;
            opacity: 0;
          }
          .cq-title.animate {
            animation: glitchReveal 0.7s steps(1) forwards;
          }
          @keyframes glitchReveal {
            0%   { opacity: 0; clip-path: inset(50% 0 50% 0); transform: translate(-50%,-50%); }
            15%  { opacity: 1; clip-path: inset(20% 0 60% 0); transform: translate(-50%,-50%) skewX(-5deg); color: #ff003c; text-shadow: 0 0 30px #ff003c; }
            30%  { clip-path: inset(60% 0 10% 0); transform: translate(-48%,-50%) skewX(3deg); color: #bf00ff; text-shadow: 0 0 30px #bf00ff; }
            50%  { clip-path: inset(0 0 0 0); transform: translate(-50%,-50%) skewX(0deg); color: #0080ff; text-shadow: 0 0 20px #0080ff; }
            70%  { clip-path: inset(30% 0 30% 0); transform: translate(-52%,-50%); color: #ff0099; }
            100% { opacity: 1; clip-path: inset(0 0 0 0); transform: translate(-50%,-50%); color: #fff; text-shadow: 0 0 40px #bf00ff, 0 0 80px #ff003c, 0 0 120px #0080ff; }
          }
        `}
      </style>
      
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="scanlines-overlay"></div>
      
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in ${fading ? 'scale-[15] opacity-0' : 'scale-100 opacity-100'}`}>
        <div ref={titleRef} className="cq-title cq-intro-font">CIPHERQUEST</div>
      </div>
    </div>
  );
}
