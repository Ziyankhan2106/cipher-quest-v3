
let speedMultiplier = 1.0;
const AL='ABCDEFGHIJKLMNOPQRSTUVWXYZ',MSG='CIPHER',KEY='KITE',MAXP=30;
let running=false,ct={c:false},rTimer=null,cdn=2;
const $=id=>document.getElementById(id);

let isPaused = false;
async function slp(ms) {
    let elapsed = 0;
    while (elapsed < (ms / speedMultiplier)) {
        if (ct.c) return;
        if (!isPaused) elapsed += 20;
        await new Promise(r => setTimeout(r, 20));
    }
}
const vis=(el,on=true)=>el.classList.toggle('vis',on);
const setSt=(t,col='var(--ap)')=>{$('st').textContent=t;document.querySelector('.status').style.color=col;};
const pct=n=>(Math.min(n,MAXP)/MAXP)*100;

function compute(){
  return MSG.split('').map((ch,i)=>{
    const mi=AL.indexOf(ch),kch=KEY[i%KEY.length],ki=AL.indexOf(kch);
    const sum=mi+ki,dst=sum%26,wraps=sum>=26;
    return{ch,mi,kch,ki,sum,dst,enc:AL[dst],wraps,isRep:i>=KEY.length,i};
  });
}

function buildRows(res){
  ['msgRow','keyRow','outRow'].forEach(id=>$(id).innerHTML='');
  res.forEach((r,i)=>{
    // msg
    const mc=document.createElement('div');mc.className='mchip';mc.id='mc'+i;
    mc.innerHTML=`<span class="chip-letter" id="ml${i}">${r.ch}</span><span class="chip-sub">pos ${r.mi}</span>`;
    $('msgRow').appendChild(mc);
    // key
    const kc=document.createElement('div');kc.className='kchip'+(r.isRep?' is-repeat':'');kc.id='kc'+i;
    kc.innerHTML=`<span class="chip-letter" id="kl${i}">${r.kch}</span><span class="chip-sub">pos ${r.ki}</span>`;
    $('keyRow').appendChild(kc);
    // out
    const oc=document.createElement('div');oc.className='ochip';oc.id='oc'+i;
    oc.innerHTML=`<span class="chip-letter" id="ol${i}"></span><span class="chip-sub">[${i}]</span>`;
    $('outRow').appendChild(oc);
  });
}

function buildTicks(mi,ki,dst,wraps){
  $('nt').querySelectorAll('.ntick').forEach(t=>t.remove());
  [0,5,10,15,20,25].forEach(n=>{
    const t=document.createElement('div');t.className='ntick';t.style.left=pct(n)+'%';
    t.innerHTML=`<div class="ntick-line"></div><div class="ntick-lbl">${n===0?'A':n===25?'Z':n}</div>`;
    $('nt').appendChild(t);
  });
  [{n:mi,c:'tm'},{n:ki,c:'tk'},{n:dst,c:wraps?'trw':'tr'}].forEach(({n,c})=>{
    if([0,5,10,15,20,25].includes(n)) return;
    const t=document.createElement('div');t.className='ntick '+c;t.style.left=pct(n)+'%';
    t.innerHTML=`<div class="ntick-line"></div><div class="ntick-lbl">${AL[n]||n}</div>`;
    $('nt').appendChild(t);
  });
}

function drawArc(p1,p2,wraps,prog){
  const svg=$('arcSvg');svg.innerHTML='';
  const W=$('nt').offsetWidth||700,H=72;
  const x1=p1/100*W,x2=p2/100*W,mid=(x1+x2)/2,ctrl=H*0.6;
  const col=wraps?'rgba(255,159,67,.7)':'rgba(185,127,255,.6)';
  const len=Math.hypot(x2-x1,ctrl)*1.5||1;
  const ns='http://www.w3.org/2000/svg';
  const path=document.createElementNS(ns,'path');
  path.setAttribute('d',`M${x1},${H/2} Q${mid},${H/2+ctrl} ${x2},${H/2}`);
  path.setAttribute('fill','none');path.setAttribute('stroke',col);
  path.setAttribute('stroke-width','2');path.setAttribute('stroke-linecap','round');
  path.setAttribute('stroke-dasharray',len);path.setAttribute('stroke-dashoffset',len*(1-prog));
  svg.appendChild(path);
  if(prog>0.8){
    const arr=document.createElementNS(ns,'polygon');
    arr.setAttribute('points',`${x2-6},${H/2+8} ${x2+6},${H/2+8} ${x2},${H/2}`);
    arr.setAttribute('fill',col);svg.appendChild(arr);
  }
}

async function flyTo(srcEl,tx,ty,txt,col,glow){
  const BL=$('BL');
  const sr=srcEl.getBoundingClientRect();
  BL.textContent=txt;BL.style.fontSize='32px';BL.style.width='50px';BL.style.height='50px';
  BL.style.color=col;BL.style.border=`2px solid ${col}`;BL.style.boxShadow=`0 0 20px ${glow}`;
  BL.style.background='rgba(2,6,23,0.95)';BL.style.transition='none';BL.style.opacity='0';
  BL.style.left=(sr.left+sr.width/2-25)+'px';BL.style.top=(sr.top+sr.height/2-25)+'px';
  BL.style.transform='scale(0.4)';
  await slp(30);if(ct.c){BL.style.opacity='0';return;}
  BL.style.transition='opacity .15s,transform .2s cubic-bezier(0.34,1.56,0.64,1)';
  BL.style.opacity='1';BL.style.transform='scale(1)';
  await slp(200);if(ct.c){BL.style.opacity='0';return;}
  const ms=360;
  BL.style.transition=`left ${ms}ms cubic-bezier(0.6,0,0.4,1),top ${ms}ms cubic-bezier(0.6,0,0.4,1),width ${ms}ms,height ${ms}ms,font-size ${ms}ms`;
  BL.style.left=(tx-16)+'px';BL.style.top=(ty-16)+'px';BL.style.width='32px';BL.style.height='32px';BL.style.fontSize='11px';
  await slp(ms+40);BL.style.opacity='0';
}

async function flyOut(fromPct,dstEl,txt,col,glow){
  const BL=$('BL');const tr=$('nt').getBoundingClientRect();const dr=dstEl.getBoundingClientRect();
  const sx=tr.left+fromPct/100*tr.width,sy=tr.top+tr.height/2;
  BL.textContent=txt;BL.style.fontSize='11px';BL.style.width='32px';BL.style.height='32px';
  BL.style.color=col;BL.style.border=`2px solid ${col}`;BL.style.boxShadow=`0 0 18px ${glow}`;
  BL.style.background='rgba(2,6,23,0.95)';BL.style.transition='none';BL.style.opacity='1';
  BL.style.left=(sx-16)+'px';BL.style.top=(sy-16)+'px';BL.style.transform='scale(1)';
  await slp(40);if(ct.c){BL.style.opacity='0';return;}
  const ms=400;
  BL.style.transition=`left ${ms}ms cubic-bezier(0.4,0,0.2,1),top ${ms}ms cubic-bezier(0.4,0,0.2,1),width ${ms}ms,height ${ms}ms,font-size ${ms}ms`;
  BL.style.left=(dr.left+dr.width/2-30)+'px';BL.style.top=(dr.top+dr.height/2-30)+'px';
  BL.style.width='60px';BL.style.height='60px';BL.style.fontSize='36px';
  await slp(ms-60);if(ct.c){BL.style.opacity='0';return;}
  BL.style.opacity='0';
}

function resetMath(){
  for(let i=1;i<=7;i++){$('m'+i)?.classList.remove('active','done','wr');const v=$('mv'+i);if(v)v.textContent='—';}
  $('m6').style.display='none';$('msmod').style.opacity='.2';vis($('wp'),false);
}
function actM(s){for(let i=1;i<=7;i++)$('m'+i)?.classList.remove('active');$('m'+s)?.classList.add('active');for(let i=1;i<s;i++)$('m'+i)?.classList.add('done');}


let currentStep = -1;
let isAnimating = false;
let res = [];
let enc = '';
let wc = 0;
let n = 0;

function resetDemo() {
    n = MSG.length;
    res = MSG.split('').map((ch, i) => {
        const mi = AL.indexOf(ch), kch = KEY[i % KEY.length], ki = AL.indexOf(kch);
        const sum = mi + ki, dst = sum % 26;
        return { ch, mi, kch, ki, sum, dst, enc: AL[dst], wraps: sum >= 26, i };
    });
    encoded = res.map(r => r.enc).join('');
    wc = res.filter(r => r.wraps).length;

    vis($('ip'), false);
    $('ig').innerHTML = '';
    $('msgRow').innerHTML = '';
    $('keyRow').innerHTML = '';
    $('outRow').innerHTML = '';
    $('BL').style.opacity = '0';
    resetMath();
    $('bM').style.opacity = '0';
    $('bK').style.opacity = '0';
    $('bR').style.display = 'none';
    $('arcSvg').innerHTML = '';
    $('pe').classList.remove('lit');
    $('px').classList.remove('lit');
    $('plbl').classList.remove('lit');

    // build chips
    res.forEach((r, i) => {
        const mc = document.createElement('div'); mc.className = 'mchip'; mc.id = 'mc' + i;
        mc.innerHTML = `<span class="c-l">${r.ch}</span><span class="c-i">[${i}]</span>`;
        $('msgRow').appendChild(mc);

        const kc = document.createElement('div'); kc.className = 'kchip'; kc.id = 'kc' + i;
        kc.innerHTML = `<span class="c-l">${r.kch}</span><span class="c-i">k[${i}]</span>`;
        $('keyRow').appendChild(kc);

        const oc = document.createElement('div'); oc.className = 'ochip'; oc.id = 'oc' + i;
        oc.innerHTML = `<span id="ol${i}"> </span>`;
        $('outRow').appendChild(oc);
    });

    $('zs').style.width = (25 / MAXP * 100) + '%';
    $('pe').style.left = (25 / MAXP * 100) + '%';
    $('plbl').style.left = (25 / MAXP * 100) + '%';
    buildTicks(null, null, null, false);
}

async function renderStep(step) {
    if (isAnimating) return;
    isAnimating = true;
    const prevBtn = $('prevStep');
    const nextBtn = $('nextStep');

    if (step === -1) {
        setSt('Vigenère loading onto the number line...', 'var(--ap)');
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = false;
        isAnimating = false;
        return;
    }

    $('BL').style.opacity = '1';

    if (step >= 0 && step < n) {
        const r = res[step];
        const mcEl = $('mc' + step), kcEl = $('kc' + step), ocEl = $('oc' + step);

        document.querySelectorAll('.mchip').forEach(c => c.classList.remove('mc-active'));
        document.querySelectorAll('.kchip').forEach(c => c.classList.remove('kc-active'));
        mcEl.classList.add('mc-active'); kcEl.classList.add('kc-active');
        resetMath(); $('pe').classList.remove('lit'); $('px').classList.remove('lit'); $('plbl').classList.remove('lit');
        $('bM').style.opacity = '0'; $('bK').style.opacity = '0'; $('bR').style.display = 'none'; $('arcSvg').innerHTML = '';
        buildTicks(r.mi, r.ki, r.dst, r.wraps);
        setSt(`"${r.ch}"(${r.mi}) + "${r.kch}"(${r.ki}) = ${r.sum}${r.wraps ? ' → portal! → ' + r.dst : ''} → "${r.enc}"`, r.wraps ? 'var(--orange)' : 'var(--ap)');

        actM(1); $('mv1').textContent = `"${r.ch}"`;
        await slp(300);

        actM(2); $('mv2').textContent = r.mi;
        const tr = $('nt').getBoundingClientRect();
        const mtx = tr.left + pct(r.mi) / 100 * tr.width, mty = tr.top + tr.height / 2;
        flyTo(mcEl, mtx, mty, r.ch, '#59f2ff', 'rgba(89,242,255,.8)');
        await slp(420);
        $('bM').style.transition = 'none'; $('bM').style.left = pct(r.mi) + '%'; $('bM').textContent = r.ch; $('bM').style.opacity = '1';
        await slp(250);

        actM(3); $('mv3').textContent = `"${r.kch}"`;
        await slp(300);

        actM(4); $('mv4').textContent = r.ki;
        const ktx = tr.left + pct(r.ki) / 100 * tr.width, kty = tr.top + tr.height / 2;
        flyTo(kcEl, ktx, kty, r.kch, '#ffdd57', 'rgba(255,221,87,.8)');
        await slp(420);
        $('bK').style.transition = 'none'; $('bK').style.left = pct(r.ki) + '%'; $('bK').textContent = r.kch; $('bK').style.opacity = '1';
        await slp(280);

        actM(5); $('mv5').textContent = `${r.mi}+${r.ki}=${r.sum}`;
        $('msmod').style.opacity = r.wraps ? '1' : '.2';
        for (let s = 0; s <= 20; s++) { drawArc(pct(r.mi), pct(r.ki), r.wraps, s / 20); await slp(28); }
        await slp(280);

        if (r.wraps) {
            actM(6); $('m6').style.display = 'flex'; $('mv6').textContent = r.sum + '%26→portal!';
            $('pe').classList.add('lit'); $('plbl').classList.add('lit');
            $('bM').classList.add('bw'); $('bK').classList.add('bw');
            vis($('wp'), true); $('wpt').textContent = r.sum + ' % 26 = ' + r.dst + ' → "' + r.enc + '"';
            await slp(600);
            $('px').classList.add('lit');
            $('bM').style.opacity = '0'; $('bK').style.opacity = '0'; $('arcSvg').innerHTML = '';
            await slp(150);
            $('bR').style.display = 'flex'; $('bR').className = 'nball bw';
            $('bR').style.width = '36px'; $('bR').style.height = '36px';
            $('bR').style.transition = 'none'; $('bR').style.left = pct(r.dst) + '%'; $('bR').textContent = r.enc; $('bR').style.opacity = '1';
            await slp(200);
            $('pe').classList.remove('lit'); $('px').classList.remove('lit'); $('plbl').classList.remove('lit');
        } else {
            const midP = (pct(r.mi) + pct(r.ki)) / 2;
            $('bR').style.display = 'flex'; $('bR').className = 'nball'; $('bR').style.background = 'rgba(185,127,255,0.12)';
            $('bR').style.border = '2px solid var(--purple)'; $('bR').style.color = 'var(--purple)'; $('bR').style.boxShadow = '0 0 16px rgba(185,127,255,.5)';
            $('bR').style.width = '36px'; $('bR').style.height = '36px'; $('bR').style.fontSize = '13px';
            $('bR').style.transition = 'none'; $('bR').style.left = midP + '%'; $('bR').textContent = '?'; $('bR').style.opacity = '1';
            $('bM').style.opacity = '0'; $('bK').style.opacity = '0'; $('arcSvg').innerHTML = '';
            await slp(80);
            const sMs = 380 + r.dst * 12;
            $('bR').style.transition = `left ${sMs}ms cubic-bezier(0.25,0.1,0.25,1)`;
            $('bR').style.left = pct(r.dst) + '%'; $('bR').textContent = r.enc;
            await slp(sMs + 80);
        }

        actM(7); $('m7').classList.toggle('wr', r.wraps); $('mv7').textContent = `"${r.enc}"`;
        for (let j = 1; j < 7; j++) $('m' + j)?.classList.add('done');
        await slp(300);

        const col = r.wraps ? '#ff9f43' : '#b97fff', glow = r.wraps ? 'rgba(255,159,67,.8)' : 'rgba(185,127,255,.8)';
        await flyOut(pct(r.dst), ocEl, r.enc, col, glow);

        ocEl.classList.add('oc-land', 'filled');
        if (r.wraps) ocEl.classList.add('oc-wrap');
        const ol = $('ol' + step); if (ol) ol.textContent = r.enc;
        mcEl.classList.remove('mc-active'); mcEl.classList.add('mc-done');
        kcEl.classList.remove('kc-active'); kcEl.classList.add('kc-done');
        $('bR').style.opacity = '0';
        await slp(320);
    }

    if (step === n) {
        $('BL').style.opacity = '0';
        setSt(`Done → CIPHER + KITE = ${encoded}${wc > 0 ? ' → ' + wc + ' portal wrap' + (wc > 1 ? 's' : '') : ''}`, wc > 0 ? 'var(--orange)' : 'var(--ag)');
        res.forEach((r, i) => { const o = $('oc' + i); if (o) o.style.boxShadow = r.wraps ? '0 0 22px rgba(255,159,67,.7)' : '0 0 18px rgba(185,127,255,.5)'; });
        await slp(380);
        res.forEach((r, i) => { const o = $('oc' + i); if (o) o.style.boxShadow = ''; });

        const keyExpanded = MSG.split('').map((_, i) => KEY[i % KEY.length]).join('');
        $('ig').innerHTML = `
          <div class="irow"><div class="irow-lbl">Message</div><div class="irow-val fc">CIPHER</div></div>
          <div class="irow"><div class="irow-lbl">Key</div><div class="irow-val fk">KITE</div></div>
          <div class="irow"><div class="irow-lbl">Key expanded</div><div class="irow-val fk">${keyExpanded}</div></div>
          <div class="irow"><div class="irow-lbl">Encoded</div><div class="irow-val fp">${encoded}</div></div>
          <div class="formula">
      <span class="fm">Formula :</span>  encoded[i] = ( msg[i] + key[i <span class="fp">mod</span> keyLen] ) <span class="fp">mod 26</span>
      <span class="fm">Step 1 →</span> Expand key to match message length:
        <span class="fk">K I T E</span> → repeated → <span class="fk">${keyExpanded.split('').join(' ')}</span>
      <span class="fm">Step 2 →</span> Add both positions on the number line:
      ${res.map(r => `  <span class="fc">${r.ch}</span>(${r.mi}) + <span class="fk">${r.kch}</span>(${r.ki}) = ${r.sum}${r.wraps ? ' mod 26 = ' + r.dst : ''} → <span class="${r.wraps ? 'fw' : 'fp'}">"${r.enc}"</span>`).join('<br>')}
      <span class="fg">Why harder than Caesar?</span>
      <span class="fm">Caesar uses ONE shift for every letter.
      Vigenère uses a different key letter each time -
      the same "C" in the message can encode to a
      completely different letter based on its position.</span></div>`;
        vis($('ip'), true);
    }

    if (prevBtn) prevBtn.disabled = step < 0;
    if (nextBtn) nextBtn.disabled = step >= n;
    isAnimating = false;
}

const replayBtn = $('replayBtn');
if (replayBtn) {
    replayBtn.addEventListener('click', () => {
        currentStep = -1;
        resetDemo();
        renderStep(currentStep);
    });
}

const prevStepBtn = $('prevStep');
if (prevStepBtn) {
    prevStepBtn.addEventListener('click', () => {
        if (currentStep > -1) {
            currentStep--;
            renderStep(currentStep);
        }
    });
}

const nextStepBtn = $('nextStep');
if (nextStepBtn) {
    nextStepBtn.addEventListener('click', () => {
        if (currentStep < n) {
            currentStep++;
            renderStep(currentStep);
        }
    });
}

const nextBtn = $('btn-next');
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        window.location.href = "level3.3.html";
    });
}

resetDemo();
renderStep(-1);

