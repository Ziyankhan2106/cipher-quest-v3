import { Chapter } from './game-data';

export const generateCertificate = (chapter: Chapter | null, operatorName: string, themeColor: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  const isMaster = !chapter;
  const primaryColor = isMaster ? '#ffffff' : themeColor;

  // Dark void background
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, 1000, 700);
  
  // Grid background
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 1000; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 700); ctx.stroke();
  }
  for (let i = 0; i < 700; i += 40) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1000, i); ctx.stroke();
  }
  
  // Outer Tech Border
  ctx.strokeStyle = '#1a1a24';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 960, 660);
  
  // Inner Neon Box with glow
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10;
  ctx.strokeRect(40, 40, 920, 620);
  ctx.shadowBlur = 0;
  
  // Corner accents
  ctx.fillStyle = primaryColor;
  ctx.fillRect(35, 35, 30, 6); ctx.fillRect(35, 35, 6, 30); // Top Left
  ctx.fillRect(935, 35, 30, 6); ctx.fillRect(959, 35, 6, 30); // Top Right
  ctx.fillRect(35, 659, 30, 6); ctx.fillRect(35, 635, 6, 30); // Bottom Left
  ctx.fillRect(935, 659, 30, 6); ctx.fillRect(959, 635, 6, 30); // Bottom Right

  // Crosshairs
  const drawTarget = (x: number, y: number) => {
    ctx.strokeStyle = primaryColor;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 25, y); ctx.lineTo(x + 25, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x, y + 25); ctx.stroke();
    ctx.globalAlpha = 1.0;
  };
  drawTarget(100, 100);
  drawTarget(900, 100);
  
  // Fake Barcode
  ctx.fillStyle = primaryColor;
  for (let i = 0; i < 30; i++) {
    const width = Math.random() * 6 + 1;
    ctx.fillRect(780 + i * 4, 60, width, 30);
  }
  ctx.font = '10px monospace';
  ctx.fillText('AUTH_HASH: 0x' + Math.random().toString(16).substr(2, 10).toUpperCase(), 780, 105);
  
  // Top Security Header
  ctx.textAlign = 'center';
  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 16px monospace';
  ctx.letterSpacing = '2px';
  if (isMaster) {
    ctx.fillText('// TOTAL SYNDICATE COLLAPSE // GLOBAL CLEARANCE GRANTED //', 500, 90);
  } else {
    ctx.fillText('// SYNDICATE NETWORK DEFEATED // SECTOR SECURED //', 500, 90);
  }
  ctx.letterSpacing = '0px';
  
  // Hex decorative elements behind text
  ctx.fillStyle = isMaster ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)';
  ctx.beginPath(); ctx.arc(500, 320, 220, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(500, 320, 180, 0, Math.PI * 2); ctx.fill();
  
  // Title
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(isMaster ? 'CIPHER MASTER' : 'PROTOCOL MASTERY', 500, 240);
  ctx.shadowBlur = 0;
  
  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'italic 28px sans-serif';
  ctx.fillText(isMaster ? 'Ultimate Neural Transcendence' : 'Official Resistance Clearance', 500, 300);
  
  // Chapter Info
  if (isMaster) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px sans-serif';
    ctx.fillText('ALL PHASES CLEAR', 500, 440);
    ctx.font = '24px monospace';
    ctx.fillText('STORY MODE: COMPLETED', 500, 490);
  } else {
    ctx.fillStyle = themeColor;
    ctx.font = 'bold 90px sans-serif';
    ctx.fillText(`SECTOR 0${chapter!.id}`, 500, 440);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.fillText(chapter!.title.split(':')[1].trim().toUpperCase(), 500, 490);
  }
  
  // Operative details frame
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.strokeRect(80, 520, 840, 100);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(80, 520, 840, 100);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '18px monospace';
  ctx.fillText('OPERATIVE CALLSIGN:', 110, 555);
  ctx.fillText('TIMESTAMP OF CLEARANCE:', 110, 595);
  
  ctx.fillStyle = primaryColor;
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(operatorName.toUpperCase(), 890, 555);
  ctx.fillText(new Date().toLocaleString(), 890, 595);
  
  // Fingerprint / Data node motif
  for(let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255,255,255,${0.1 - i*0.02})`;
    ctx.arc(500, 680, 50 + i*15, Math.PI, 0);
    ctx.stroke();
  }
  
  return canvas.toDataURL('image/png');
};
