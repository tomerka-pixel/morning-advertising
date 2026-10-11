/* מרכיב המודעות של v3, לפי קומפוננטת Ad Template של המעצב בפיגמה (node 22478:24034)
   וחוקי המבנה שלו. ארבע תבניות, קנבס בסיס ברוחב 540 שמיוצא ב-x2.
   נעול בתבנית: הגריד, מיקום האזורים, סולם הטיפוגרפיה, הרדיוסים והשוליים.
   ה-AI ממלא רק ארבעה שדות (כותרת, שורת משנה, כפתור, שם העסק), והם מוגבלים בתווים.
   טקסט ארוך מדי לא מוקטן: הוא נכתב מחדש קצר יותר (ובעריכה ידנית נחתך בשלוש נקודות).
   הצבעים, הלוגו והפונט הם של העסק של הלקוח. v2 ממשיך להשתמש ב-compose.js */
(function(){

const SIZES = { '4:5':[1080,1350], '1:1':[1080,1080], '9:16':[1080,1920], '16:9':[1920,1080],
                fb:[1200,628], li:[1200,627], reels:[1080,1920] };
const GEN_FORMATS = { '1:1':1, '4:5':0.8, '3:4':0.75, '9:16':0.5625, '16:9':1.7778 };

const TEMPLATES = [
  { v:'split',   t:'מפוצל',     d:'תמונה למעלה, טקסט למטה' },
  { v:'overlay', t:'על התמונה', d:'תמונה מלאה עם טקסט מעליה' },
  { v:'frame',   t:'מסגרת',     d:'תמונה ממוסגרת במרכז' },
  { v:'type',    t:'סולידי',    d:'לוגו וכותרת גדולה על צבע, בלי תמונה' }
];

/* מגבלות התווים מהחוקים של המעצב. h = כותרת, hl = שורות כותרת, s = שורת משנה, c = כפתור */
const LIMITS = {
  split:   { h:28, hl:2, s:60, sl:2, c:16 },
  overlay: { h:32, hl:3, s:70, sl:2, c:16 },
  frame:   { h:26, hl:2, s:60, sl:2, c:16 },
  type:    { h:24, hl:3, s:60, sl:2, c:16 }
};

/* פונטים עבריים חופשיים לשימוש מסחרי. ברירת המחדל Rubik, כמו בעיצוב */
const FONT_SETS = [
  { v:'warm',    t:'עגול וחם',      head:{f:'Rubik',w:700},            body:{f:'Rubik',w:500},     cta:{f:'Rubik',w:500} },
  { v:'clean',   t:'נקי ועכשווי',   head:{f:'Heebo',w:800},            body:{f:'Heebo',w:500},     cta:{f:'Heebo',w:500} },
  { v:'bold',    t:'בולט ואנרגטי',  head:{f:'Secular One',w:400},      body:{f:'Heebo',w:500},     cta:{f:'Secular One',w:400} },
  { v:'elegant', t:'קלאסי ויוקרתי', head:{f:'Frank Ruhl Libre',w:700}, body:{f:'Assistant',w:600}, cta:{f:'Assistant',w:600} },
  { v:'display', t:'צר ודרמטי',     head:{f:'Karantina',w:700},        body:{f:'Assistant',w:600}, cta:{f:'Assistant',w:600} }
];
const FONT_BY_TONE = { 'ידידותי וחם':'warm', 'מקצועי ומהוקצע':'clean', 'אנרגטי ומניע':'bold', 'יוקרתי ורגוע':'elegant' };
const MONO = { f:'Rubik', w:600 };

function fontSet(v){ return FONT_SETS.find(x=>x.v===v) || FONT_SETS[0] }
function fontForTone(tone){ return FONT_BY_TONE[tone] || 'warm' }
function css(spec,size){ return spec.w+' '+(Math.round(size*10)/10)+'px "'+spec.f+'", "Rubik", "Heebo", sans-serif' }
async function ensureFonts(v){
  const s=fontSet(v);
  try{ await Promise.all([s.head,s.body,s.cta,MONO].map(x=>document.fonts.load(css(x,64),'אבג SM'))) }catch(e){}
}

/* =================== צבעים =================== */
function rgb(h){ h=String(h||'#000').replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)||0) }
function hex(a){ return '#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('') }
function mix(a,b,t){ const x=rgb(a),y=rgb(b); return hex(x.map((v,i)=>v+(y[i]-v)*t)) }
function lum(h){ return rgb(h).map(v=>v/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4))
  .reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0) }
function contrast(a,b){ const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
function rgba(h,a){ const c=rgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')' }
const WHITE='#FFFFFF', INK='#141414';
function textOn(bg){ return contrast(bg,WHITE)>=contrast(bg,INK) ? WHITE : INK }

/* שני טוקנים בלבד, כמו בחוקים: primary (הצבע הראשי של העסק) ורקע (לא חובה).
   כל צירוף נבדק לניגודיות AA (4.5), ואם לא עומד מוחלף בגוון כהה או בהיר */
function palette(primary,bg){
  primary=primary||'#18534E';
  const deep=mix(primary,'#000',0.55);
  const ink=sf=>contrast(deep,sf)>=4.5?deep:textOn(sf);
  return {
    primary, deep, bg:bg||null,
    light: mix(primary,WHITE,0.9),
    ink,
    sub: sf=>{ const c=mix(ink(sf),sf,0.22); return contrast(c,sf)>=4.5?c:ink(sf) },
    /* הכפתור בצבע הראשי. אם הוא נבלע ברקע, גוון כהה שלו, ואם גם זה לא, לבן או שחור */
    btn: sf=>{ const b=contrast(primary,sf)>=3?primary:contrast(deep,sf)>=3?deep:textOn(sf); return {bg:b,fg:textOn(b)} }
  };
}

/* =================== טקסט בגודל קבוע =================== */
function wrap(ctx,text,w){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean), lines=[];
  let cur='';
  for(const wd of words){
    const t=cur?cur+' '+wd:wd;
    if(cur&&ctx.measureText(t).width>w){ lines.push(cur); cur=wd } else cur=t;
  }
  if(cur)lines.push(cur);
  return lines;
}
/* שורות מאוזנות בגודל קבוע. מעבר למספר השורות נחתך בשלוש נקודות, לעולם לא מוקטן */
function layout(ctx,text,spec,size,w,maxLines,lh){
  ctx.font=css(spec,size); ctx.letterSpacing='0px';
  let lines=wrap(ctx,text,w), over=false;
  if(lines.length>maxLines){
    over=true; lines=lines.slice(0,maxLines);
    let last=lines[maxLines-1];
    while(last.includes(' ')&&ctx.measureText(last+'…').width>w)last=last.slice(0,last.lastIndexOf(' '));
    lines[maxLines-1]=last+'…';
  }else if(lines.length>1){
    let lo=w*0.5, hi=w;
    for(let i=0;i<14;i++){ const m=(lo+hi)/2; if(wrap(ctx,text,m).length>lines.length)lo=m; else hi=m }
    lines=wrap(ctx,text,hi);
  }
  return { lines, size, lh, spec, over, h:lines.length*size*lh };
}
function drawLines(ctx,L,x,y,color,align,schematic){
  if(!L||!L.lines.length)return 0;
  ctx.font=css(L.spec,L.size); ctx.direction='rtl'; ctx.textAlign=align; ctx.textBaseline='alphabetic'; ctx.fillStyle=color;
  L.lines.forEach((ln,i)=>{
    const top=y+i*L.size*L.lh;
    if(schematic){
      const w=ctx.measureText(ln).width, bh=L.size*0.5, x0=align==='center'?x-w/2:align==='left'?x:x-w;
      rr(ctx,x0,top+(L.size*L.lh-bh)/2,w,bh,bh/2); ctx.fill();
    }else ctx.fillText(ln,x,top+L.size*(0.5*(L.lh-1)+0.84));
  });
  return L.h;
}

/* =================== צורות =================== */
function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2)) }
function placeholder(ctx,x,y,w,h){
  const g=ctx.createLinearGradient(x,y,x+w*0.3,y+h);
  g.addColorStop(0,'#BCC4CC'); g.addColorStop(1,'#949DA8');
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
}
/* איפה האנשים בתמונה: השורה העליונה שיש בה עור (בערך קצה הראש) ומרכז האנשים לרוחב.
   החיתוך שומר על הראש ולא חותך אותו, ובחיתוך לרוחב מתמרכז על האנשים */
const FOCUS=new WeakMap();
function focus(img){
  if(FOCUS.has(img))return FOCUS.get(img);
  let f=null;
  try{
    const n=64, c=document.createElement('canvas'); c.width=n; c.height=n;
    const x=c.getContext('2d'); x.drawImage(img,0,0,n,n);
    const d=x.getImageData(0,0,n,n).data, rows=new Array(n).fill(0);
    /* איזון לבן (gray world) לפני זיהוי העור: בתמונה עם תאורה חמה כל הקירות נראים כמו עור */
    let R=0,G=0,B=0; for(let o=0;o<d.length;o+=4){ R+=d[o]; G+=d[o+1]; B+=d[o+2] }
    const mean=(R+G+B)/3, kr=mean/(R||1), kg=mean/(G||1), kb=mean/(B||1);
    const skinAt=o=>{ const r=Math.min(255,d[o]*kr), g=Math.min(255,d[o+1]*kg), b=Math.min(255,d[o+2]*kb);
      return r>95&&g>40&&b>20&&r>g&&g>b&&(r-b)/r>0.18&&r-g>10&&r<250 };
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){ if(skinAt((j*n+i)*4))rows[j]++ }
    let top=-1; for(let j=0;j<n-1;j++) if(rows[j]>=n*0.08&&rows[j+1]>=n*0.08){ top=j; break }
    if(top>=0){
      let sx=0,cnt=0;
      for(let j=top;j<Math.min(n,top+18);j++)for(let i=0;i<n;i++){ if(skinAt((j*n+i)*4)){ sx+=i; cnt++ } }
      f={ top:Math.max(0,top/n-0.08), cx:cnt?(sx/cnt+.5)/n:0.5 };
    }
  }catch(e){}
  FOCUS.set(img,f); return f;
}
function cover(ctx,img,x,y,w,h,fy){
  if(!img){ placeholder(ctx,x,y,w,h); return }
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  const s=Math.max(w/iw,h/ih), sw=w/s, sh=h/s, f=focus(img);
  /* חיתוך מלמעלה ולמטה: מתחילים מעט מעל הראש. בלי אנשים, קרוב לחלק העליון */
  const want=f?f.top*ih-sh*0.05:(ih-sh)*(fy==null?0.2:Math.min(fy,0.2));
  const sy=Math.max(0,Math.min(ih-sh,want));
  const sx=Math.max(0,Math.min(iw-sw,f?f.cx*iw-sw/2:(iw-sw)/2));
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}

/* כפתור: גובה 49, ריפוד 32, רדיוס מלא, טקסט 20 (כמו בפיגמה). x = הקצה לפי align */
function button(ctx,o,F,x,y,align,col){
  if(!o.cta)return 0;
  ctx.font=css(F.cta,20); ctx.letterSpacing='0px';
  const w=ctx.measureText(o.cta).width+64, h=49;
  const x0=align==='center'?x-w/2:align==='left'?x:x-w;
  ctx.fillStyle=col.bg; rr(ctx,x0,y,w,h,h/2); ctx.fill();
  ctx.fillStyle=col.fg;
  if(o.schematic){ rr(ctx,x0+w*0.24,y+h*0.4,w*0.52,h*0.2,h*0.1); ctx.fill(); return w }
  ctx.direction='rtl'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(o.cta,x0+w/2,y+h/2+1);
  return w;
}

/* מונוגרם משם העסק. נשאר לייצוא, התבניות עצמן משתמשות בשם העסק כסימן כשאין לוגו */
function monogram(name,nameEn){
  const pick=s=>String(s||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('');
  return (pick(nameEn).toUpperCase()||pick(name)||'·');
}

/* =================== צבע מהתמונה ===================
   הלקוח לא בוחר צבע. כמו מעצב, לוקחים את הצבע הבולט בתמונה (הבגד, חפץ מרכזי), עם משקל למרכז
   ולרוויה, ובלי גווני עור. מזה בונים פאנל כהה (טקסט לבן) או פסטל (טקסט כהה) לפי הבהירות שלו */
function hsl2hex(h,s,l){
  const a=s*Math.min(l,1-l), f=n=>{ const k=(n+h/30)%12; return l-a*Math.max(-1,Math.min(k-3,9-k,1)) };
  return hex([f(0)*255,f(8)*255,f(4)*255]);
}
function photoColor(img){
  if(!img)return null;
  try{
    const n=48, c=document.createElement('canvas'); c.width=n; c.height=n;
    const x=c.getContext('2d'); x.drawImage(img,0,0,n,n);
    const d=x.getImageData(0,0,n,n).data, bins=Array.from({length:24},()=>({w:0,s:0,l:0,x:0,y:0}));
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const o=(j*n+i)*4, r=d[o]/255, g=d[o+1]/255, b=d[o+2]/255;
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, dl=mx-mn;
      if(dl<0.06)continue;
      const sat=dl/(1-Math.abs(2*l-1)||1);
      if(sat<0.12||l<0.1||l>0.92)continue;
      let h=mx===r?((g-b)/dl)%6:mx===g?(b-r)/dl+2:(r-g)/dl+4; h=(h*60+360)%360;
      /* עור, עץ ורצפה: כתומים-חומים לא רוויים. כמעט לא נספרים, אחרת הם תמיד מנצחים בתמונות של אנשים */
      const skin=h<=50;
      const cx=(i+.5)/n-.5, cy=(j+.5)/n-.5, center=1-Math.min(1,Math.hypot(cx,cy)*1.3)*0.6;
      const w=Math.pow(sat,0.8)*(1-Math.abs(l-0.5))*center*(skin?0.002:1);
      const bn=bins[Math.floor(h/15)%24];
      bn.w+=w; bn.s+=sat*w; bn.l+=l*w; bn.x+=Math.cos(h*Math.PI/180)*w; bn.y+=Math.sin(h*Math.PI/180)*w;
    }
    let best=null; bins.forEach((bn,k)=>{ const nb=bins[(k+1)%24].w*0.5+bins[(k+23)%24].w*0.5; if(!best||bn.w+nb>best.sc)best={bn,sc:bn.w+nb} });
    if(!best||best.bn.w<0.15)return null;
    const B=best.bn, h=(Math.atan2(B.y,B.x)*180/Math.PI+360)%360, sat=B.s/B.w, l=B.l/B.w;
    /* כהה ועמוק, או פסטל רך. שניהם כמו במודעות הדוגמה */
    return l<0.58 ? hsl2hex(h,Math.max(0.35,Math.min(0.7,sat)),Math.max(0.2,Math.min(0.34,l*0.75)))
                  : hsl2hex(h,Math.max(0.45,Math.min(0.8,sat)),0.86);
  }catch(e){ return null }
}

/* הלוגו מתאים את עצמו לרקע: החלקים הניטרליים (טקסט שחור או לבן) מתהפכים כשהם נבלעים בפאנל,
   והחלקים הצבעוניים נשארים. אם גם אז הלוגו לא נראה, הוא נצבע כולו בצבע הטקסט */
const ADAPT=new WeakMap();
function adaptLogo(img,surface){
  let m=ADAPT.get(img); if(!m){ m={}; ADAPT.set(img,m) }
  if(m[surface])return m[surface];
  let out=img;
  try{
    const w=img.width||img.naturalWidth, h=img.height||img.naturalHeight;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d'); x.drawImage(img,0,0);
    const D=x.getImageData(0,0,w,h), d=D.data, dark=textOn(surface)===WHITE, sl=lum(surface);
    const to=dark?[255,255,255]:rgb(TEXT_INK);
    let total=0, weak=0, changed=0;
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]<20)continue;
      const r=d[i],g=d[i+1],b=d[i+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b), sat=(mx-mn)/255, L=lum(hex([r,g,b]));
      total++;
      const neutral=sat<0.22;
      if(neutral&&(dark?L<0.3:L>0.75)){ d[i]=to[0]; d[i+1]=to[1]; d[i+2]=to[2]; changed++; continue }
      if((Math.max(L,sl)+.05)/(Math.min(L,sl)+.05)<1.6)weak++;
    }
    if(total&&weak/total>0.5){
      for(let i=0;i<d.length;i+=4) if(d[i+3]>=20){ d[i]=to[0]; d[i+1]=to[1]; d[i+2]=to[2] }
      changed=total;
    }
    if(changed){ x.putImageData(D,0,0); out=c }
  }catch(e){}
  m[surface]=out; return out;
}

/* =================== שפת העיצוב, לפי מודעות הדוגמה של מורנינג (11.10.2026) ===================
   פאנל צבע מלא שהטקסט ממלא אותו, בלי חללים ריקים: כותרת גדולה ומודגשת, שורת משנה רגילה מתחתיה,
   כפתור גלולה גדול, והלוגו כמו שהוא, בלי מסגרת ובלי עיגול. ביחידות של קנבס 540 (הצלע הקצרה) */
const TEXT_INK='#262626';
function scale(W,H){
  const story=H>W*1.5, land=W>H*1.25, tall=!story&&H>W*1.1;
  return { story, land,
    M: story?44:40,                                  /* שוליים */
    hs: story?56:land?50:tall?44:42,                  /* כותרת */
    ss: story?28:24,                                  /* שורת משנה */
    bh: story?64:60, bs: story?23:21,                 /* כפתור */
    T: story?120:0, B: story?140:0 };                 /* בסטורי הממשק של הרשת מכסה למעלה ולמטה */
}
/* הכפתור מנוגד לפאנל: על פאנל כהה גלולה בהירה בגוון של הצבע, על פאנל בהיר גלולה כהה */
function ctaColors(sf,p){
  if(textOn(sf)===WHITE){ const b=mix(p.primary,WHITE,0.82); return {bg:contrast(b,TEXT_INK)>=4.5?b:'#FFF6B8',fg:TEXT_INK} }
  return {bg:'#1F1F1F',fg:WHITE};
}
function inkOn(sf){ return textOn(sf)===WHITE?WHITE:TEXT_INK }
function ctaSpec(F){ return F.v==='display'?F.body:F.head }

/* הרבה קובצי לוגו מגיעים עם שוליים שקופים רחבים, והלוגו יוצא זעיר. חותכים אותם פעם אחת */
const TRIM=new WeakMap();
function trimmed(img){
  if(TRIM.has(img))return TRIM.get(img);
  let out=img;
  try{
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, k=Math.min(1,600/Math.max(iw,ih));
    const w=Math.max(1,Math.round(iw*k)), h=Math.max(1,Math.round(ih*k));
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d'); x.drawImage(img,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++)for(let i=0;i<w;i++) if(d[(y*w+i)*4+3]>12){ if(i<x0)x0=i; if(i>x1)x1=i; if(y<y0)y0=y; if(y>y1)y1=y }
    if(x1>=x0&&(x1-x0+1<w*0.97||y1-y0+1<h*0.97)){
      const t=document.createElement('canvas'); t.width=Math.round((x1-x0+1)/k); t.height=Math.round((y1-y0+1)/k);
      t.getContext('2d').drawImage(img,x0/k,y0/k,(x1-x0+1)/k,(y1-y0+1)/k,0,0,t.width,t.height);
      out=t;
    }
  }catch(e){}
  TRIM.set(img,out); return out;
}
/* הלוגו כמו שהוא, בתוך תיבה מקסימלית ובלי רקע. בלי לוגו: שם העסק בכתב מודגש במקומו */
function markSize(ctx,o,F,maxW,maxH){
  const L=o.logo&&o.logo.img?o.logo:null;
  if(L){ const im=trimmed(L.img), iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height, k=Math.min(maxW/iw,maxH/ih);
         return {w:iw*k,h:ih*k,img:im} }
  const name=o.name||''; if(!name)return {w:0,h:0};
  const size=Math.min(22,maxH*0.62); ctx.font=css(F.head,size);
  return {w:Math.min(maxW,ctx.measureText(name).width),h:size,size,text:name};
}
function drawMark(ctx,m,x,y,color,schematic,surface){
  if(!m.w)return;
  if(m.img){ if(schematic){ ctx.fillStyle=rgba(color,.5); rr(ctx,x,y,m.w,m.h,4); ctx.fill() }
             else ctx.drawImage(surface?adaptLogo(m.img,surface):m.img,x,y,m.w,m.h); return }
  ctx.fillStyle=color;
  if(schematic){ rr(ctx,x,y+m.h*.25,m.w,m.h*.5,m.h*.25); ctx.fill(); return }
  ctx.font=css(m.font,m.size); ctx.direction='rtl'; ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillText(m.text,x+m.w,y+m.h/2+1,m.w);
}
function mark(ctx,o,F,maxW,maxH){ const m=markSize(ctx,o,F,maxW,maxH); m.font=F.head; return m }

/* כפתור גלולה. x1 = הקצה הימני (תחילת השורה בעברית), w = הרוחב */
function pill(ctx,o,F,x1,y,w,S,col){
  if(!o.cta)return;
  const x0=x1-w;
  ctx.fillStyle=col.bg; rr(ctx,x0,y,w,S.bh,S.bh/2); ctx.fill();
  ctx.fillStyle=col.fg;
  if(o.schematic){ rr(ctx,x0+w*0.24,y+S.bh*0.4,w*0.52,S.bh*0.2,S.bh*0.1); ctx.fill(); return }
  ctx.font=css(ctaSpec(F),S.bs); ctx.direction='rtl'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(o.cta,x0+w/2,y+S.bh/2+1,w-40);
}
function pillWidth(ctx,o,F,S){ ctx.font=css(ctaSpec(F),S.bs); return o.cta?ctx.measureText(o.cta).width+S.bh*1.3:0 }

/* שורת הסיום: הכפתור מימין והלוגו משמאל באותה שורה (כמו בדוגמאות). full = כפתור לכל הרוחב, בלי לוגו */
function ctaRow(ctx,o,F,S,x0,x1,y,col,ink,full,sf){
  const cw=x1-x0;
  if(full){ pill(ctx,o,F,x1,y,cw,S,col); return S.bh }
  const m=mark(ctx,o,F,cw*0.4,S.bh*1.25);
  const w=Math.min(cw-(m.w?m.w+32:0),Math.max(pillWidth(ctx,o,F,S),cw*0.5));
  pill(ctx,o,F,x1,y,w,S,col);
  drawMark(ctx,m,x0,y+(S.bh-m.h)/2,ink,o.schematic,sf);
  return S.bh;
}

/* בלוק הטקסט: כותרת ומשנה. מחזיר את הגובה, ובלי y רק מודד */
function textBlock(ctx,o,F,S,lim,w){
  const hd=layout(ctx,o.headline,F.head,S.hs,w,lim.hl,1.12), sb=layout(ctx,o.sub,F.body,S.ss,w,lim.sl,1.3);
  return { hd, sb, h:hd.h+(sb.lines.length?12+sb.h:0) };
}
/* כותרת שמתאימה את עצמה לשטח: הגודל הכי גדול שנכנס ברוחב, במספר השורות המותר ובגובה שנשאר,
   כדי שהטקסט ימלא את הפאנל כמו אצל מעצב ולא ישאיר חלל. min/max ביחס לגודל הבסיס */
function fitText(ctx,o,F,S,lim,w,maxH,maxK){
  const base=S.hs, hi=Math.round(base*(maxK||1.6)), lo=Math.round(base*0.85);
  for(let hs=hi;hs>=lo;hs-=1){
    ctx.font=css(F.head,hs);
    if(wrap(ctx,o.headline,w).length>lim.hl)continue;
    const T=Object.assign({},S,{hs,ss:Math.max(S.ss,Math.min(Math.round(S.ss*1.3),Math.round(hs*0.48)))});
    const tb=textBlock(ctx,o,F,T,lim,w); tb.S=T;
    if(tb.h<=maxH)return tb;
  }
  const tb=textBlock(ctx,o,F,S,lim,w); tb.S=S; return tb;
}
function drawText(ctx,tb,x,y,ink,align,schematic){
  y+=drawLines(ctx,tb.hd,x,y,ink,align,schematic);
  if(tb.sb.lines.length) drawLines(ctx,tb.sb,x,y+12,ink===WHITE?'rgba(255,255,255,.9)':rgba(ink,.86),align,schematic);
}

/* =================== התבניות =================== */
/* מפוצל: פאנל צבע + תמונה. ריבוע ו-4:5 תמונה למעלה, סטורי פאנל למעלה ותמונה למטה, לרוחב תמונה משמאל.
   גובה הפאנל לפי התוכן (מינימום לפי היחסים של הדוגמאות), והתוכן במרכז שלו */
function split(ctx,W,H,o,p,F,lim){
  const S=scale(W,H), sf=p.bg||p.primary, ink=inkOn(sf), col=ctaColors(sf,p);
  ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
  if(S.land){
    /* לרוחב: תמונה משמאל 44%, ובעמודה הימנית הכל ממורכז: לוגו גדול למעלה, כותרת גדולה, משנה וכפתור */
    const iw=Math.round(W*0.44), x0=iw+S.M*1.5, x1=W-S.M*1.5, cw=x1-x0, xc=(x0+x1)/2;
    cover(ctx,o.img,0,0,iw,H,0.35);
    const m=mark(ctx,o,F,cw*0.5,H*0.2), lg=m.h?m.h+S.M*0.7:0;
    const avail=H-S.M*2.4-lg-34-S.bh;
    const tb=fitText(ctx,o,F,S,lim,cw,avail,1.5), total=lg+tb.h+34+S.bh;
    let y=(H-total)/2;
    if(m.w){ drawMark(ctx,m,xc-m.w/2,y,ink,o.schematic,sf); y+=lg }
    drawText(ctx,tb,xc,y,ink,'center',o.schematic); y+=tb.h+34;
    const pw=Math.max(pillWidth(ctx,o,F,tb.S),cw*0.78);
    pill(ctx,o,F,xc+pw/2,y,pw,tb.S,col);
    return;
  }
  const x0=S.M, x1=W-S.M, cw=x1-x0;
  if(S.story){
    /* סטורי: הפאנל למעלה (מתחת לאזור של הממשק), לוגו, כותרת, משנה וכפתור לכל הרוחב, התמונה למטה */
    const ph=Math.round(H*0.56), m=mark(ctx,o,F,cw*0.5,W*0.26), lg=m.h?m.h+30:0;
    const avail=ph-S.T-S.M-lg-36-S.bh;
    const tb=fitText(ctx,o,F,S,lim,cw,avail,1.35), total=lg+tb.h+36+S.bh;
    let y=S.T+(ph-S.T-total)/2;
    cover(ctx,o.img,0,ph,W,H-ph,0.3);
    if(m.w){ drawMark(ctx,m,(W-m.w)/2,y,ink,o.schematic,sf); y+=lg }
    drawText(ctx,tb,W/2,y,ink,'center',o.schematic); y+=tb.h+36;
    const pw=Math.max(pillWidth(ctx,o,F,tb.S),cw*0.8);
    pill(ctx,o,F,(W+pw)/2,y,pw,tb.S,col);
    return;
  }
  /* ריבוע ו-4:5: התמונה למעלה, ובפאנל הכל ממורכז כמו בלרוחב: לוגו גדול, כותרת, משנה וכפתור */
  /* בריבוע אין הרבה גובה, ולכן הכל קצת יותר צפוף כדי שהתמונה לא תהפוך לרצועה */
  const tall=H>W*1.1, ph=Math.round(H*(tall?0.52:0.56)), pad=S.M*(tall?0.9:0.62), xc=W/2;
  const B=tall?S:Object.assign({},S,{ss:21,bh:54,bs:20});
  const m=mark(ctx,o,F,cw*0.45,S.bh*(tall?1.45:1.1)), lg=m.h?m.h+(tall?18:12):0, g2=tall?26:20;
  const avail=ph-pad*2-lg-g2-B.bh;
  const tb=fitText(ctx,o,F,B,lim,cw,avail,tall?1.25:1.1), content=lg+tb.h+g2+tb.S.bh;
  const realPh=Math.max(ph,content+pad*2), ih=H-realPh;
  cover(ctx,o.img,0,0,W,ih,0.3);
  let y=ih+(realPh-content)/2;
  if(m.w){ drawMark(ctx,m,xc-m.w/2,y,ink,o.schematic,sf); y+=lg }
  drawText(ctx,tb,xc,y,ink,'center',o.schematic); y+=tb.h+g2;
  const pw=Math.max(pillWidth(ctx,o,F,tb.S),cw*0.62);
  pill(ctx,o,F,xc+pw/2,y,pw,tb.S,col);
}

/* על התמונה: תמונה מלאה, הצללה בצבע מלמטה, הלוגו כמו שהוא בפינה העליונה, טקסט לבן וכפתור לכל הרוחב */
function overlay(ctx,W,H,o,p,F,lim){
  const S=scale(W,H);
  cover(ctx,o.img,0,0,W,H);
  const shade=lum(p.primary)>0.12?mix(p.primary,'#000',0.5):p.primary;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0.25,rgba(shade,0)); g.addColorStop(0.62,rgba(shade,0.72)); g.addColorStop(1,rgba(shade,0.96));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  /* הצללה עדינה גם למעלה, כדי שהלוגו יהיה קריא גם על חלק בהיר של התמונה */
  const top=(S.T||S.M)+S.bh*1.6, g2=ctx.createLinearGradient(0,0,0,top*1.5);
  g2.addColorStop(0,rgba(shade,0.62)); g2.addColorStop(1,rgba(shade,0));
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,top*1.5);
  const x0=S.M, x1=S.land?W*0.62:W-S.M;
  const m=mark(ctx,o,F,(W-S.M*2)*0.4,S.bh*1.4);
  drawMark(ctx,m,S.M,(S.T||S.M),WHITE,o.schematic,mix(p.primary,'#000',0.4));
  const tb=textBlock(ctx,o,F,S,lim,(S.land?W*0.62:W)-S.M*2);
  const by=H-(S.B||S.M)-S.bh;
  drawText(ctx,tb,W-S.M,by-30-tb.h,WHITE,'right',o.schematic);
  const col={bg:mix(p.primary,WHITE,0.85),fg:TEXT_INK};
  if(contrast(col.bg,TEXT_INK)<4.5)col.bg='#FFFFFF';
  pill(ctx,o,F,W-S.M,by,S.land?Math.max(pillWidth(ctx,o,F,S),W*0.3):W-S.M*2,S,col);
}

/* מסגרת: רקע בצבע, הלוגו כמו שהוא למעלה במרכז, התמונה בכרטיס לבן, ואז כותרת, משנה וכפתור במרכז */
function frame(ctx,W,H,o,p,F,lim){
  /* הרקע בצבע שנלקח מהתמונה (לא גוון כמעט לבן), כדי שהכרטיס והרקע ישתלבו */
  const S=scale(W,H), sf=p.bg||p.primary, ink=inkOn(sf), col=ctaColors(sf,p);
  ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
  const card=(x,y,w,h)=>{
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.10)'; ctx.shadowBlur=40; ctx.shadowOffsetY=6;
    ctx.fillStyle=WHITE; rr(ctx,x,y,w,h,18); ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx,x+8,y+8,w-16,h-16,12); ctx.clip(); cover(ctx,o.img,x+8,y+8,w-16,h-16); ctx.restore();
  };
  if(S.land){
    const cw=Math.round(W*0.44); card(S.M,S.M,cw,H-S.M*2);
    const x0=S.M*2+cw+S.M*0.6, x1=W-S.M*1.3, tb=textBlock(ctx,o,F,S,lim,x1-x0);
    const total=tb.h+30+S.bh; const y=(H-total)/2;
    drawText(ctx,tb,x1,y,ink,'right',o.schematic);
    ctaRow(ctx,o,F,S,x0,x1,y+tb.h+30,col,ink,false,sf);
    return;
  }
  /* בריבוע ו-4:5 הכל קצת יותר צפוף, כדי שהתמונה בכרטיס לא תהיה רצועה צרה. הלוגו גדול וממורכז */
  const C=S.story?S:Object.assign({},S,{hs:Math.round(S.hs*0.86),ss:21,bh:54,bs:20});
  const m=mark(ctx,o,F,W*0.5,S.story?W*0.26:H*0.14);
  const gap=S.story?26:14, cw=W-S.M*2, top=S.T||S.M, bottom=S.B||S.M;
  const tb=S.story?fitText(ctx,o,F,S,lim,cw,H*0.16,1.2):textBlock(ctx,o,F,C,lim,cw); if(!tb.S)tb.S=C;
  const fixed=(m.h?m.h+gap:0)+gap+tb.h+22+tb.S.bh;
  const chh=Math.max(120,Math.min(cw*(S.story?1.15:0.8),H-top-bottom-fixed));
  let y=top+Math.max(0,(H-top-bottom-fixed-chh)/2);
  drawMark(ctx,m,(W-m.w)/2,y,ink,o.schematic,sf); y+=m.h?m.h+gap:0;
  card(S.M,y,cw,chh); y+=chh+gap;
  drawText(ctx,tb,W/2,y,ink,'center',o.schematic); y+=tb.h+22;
  const pw=Math.max(pillWidth(ctx,o,F,tb.S),cw*0.6);
  pill(ctx,o,F,(W+pw)/2,y,pw,tb.S,col);
}

/* סולידי: רק צבע וטקסט, הכל ממורכז כמו במפוצל לרוחב: לוגו גדול למעלה, כותרת ענקית שממלאת את הרוחב,
   משנה וכפתור. הקבוצה כולה במרכז האזור הבטוח, כדי שלא יישאר חלל ריק בצד אחד */
function type(ctx,W,H,o,p,F,lim){
  const S=scale(W,H), sf=p.bg||p.primary, ink=inkOn(sf), col=ctaColors(sf,p);
  ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
  const big=Object.assign({},S,{hs:Math.round(S.hs*1.4)});
  const x0=S.M*1.2, x1=W-S.M*1.2, cw=x1-x0, xc=W/2, top=S.T||S.M*1.3, bottom=S.B||S.M*1.3;
  const m=mark(ctx,o,F,cw*0.55,S.story?W*0.26:S.land?H*0.2:H*0.16), gl=m.h?(S.story?44:30):0;
  const tw=cw*(S.land?0.72:1), avail=H-top-bottom-m.h-gl-36-S.bh;
  const tb=fitText(ctx,o,F,big,lim,tw,avail*0.9,1.35), total=m.h+gl+tb.h+36+tb.S.bh;
  let y=top+Math.max(0,(H-top-bottom-total)/2);
  if(m.w){ drawMark(ctx,m,xc-m.w/2,y,ink,o.schematic,sf); y+=m.h+gl }
  drawText(ctx,tb,xc,y,ink,'center',o.schematic); y+=tb.h+36;
  const pw=Math.max(pillWidth(ctx,o,F,tb.S),cw*(S.land?0.36:0.62));
  pill(ctx,o,F,xc+pw/2,y,pw,tb.S,col);
}

const DRAW={ split, overlay, frame, type };

/* o: { tpl, format, img, headline, sub, cta, name, nameEn, logo:{img,info}, color, bg, font, schematic, scale }
   הקנבס האמיתי ברזולוציה מלאה, והתבניות מצוירות ביחידות של קנבס 540 */
function render(canvas,o){
  const [W,H]=SIZES[o.format]||SIZES['4:5'], k=Math.min(W,H)/540, s=(o.scale||1);
  canvas.width=Math.round(W*s); canvas.height=Math.round(H*s);
  const ctx=canvas.getContext('2d');
  ctx.setTransform(k*s,0,0,k*s,0,0);
  ctx.imageSmoothingQuality='high';
  (DRAW[o.tpl]||split)(ctx,W/k,H/k,o,palette(o.color,o.bg),fontSet(o.font),LIMITS[o.tpl]||LIMITS.split);
  return canvas;
}

/* היחס של אזור התמונה בתבנית, כדי לבקש מהמנוע תמונה שלא תיחתך יותר מדי */
function slotFormat(tpl,format){
  const [W,H]=SIZES[format]||SIZES['4:5'], z=scale(W,H);
  let r=W/H;
  if(tpl==='split') r=z.land?(W*0.44)/H:W/(H*(z.story?0.44:H>W*1.1?0.48:0.44));
  else if(tpl==='frame') r=z.land?(W*0.44)/(H-80):(z.story?0.9:H>W*1.1?1.5:2.2);
  else if(tpl==='type') r=1;
  let best='1:1', d=Infinity;
  for(const [k,v] of Object.entries(GEN_FORMATS)){ const x=Math.abs(Math.log(v/r)); if(x<d){d=x;best=k} }
  return best;
}

function loadImage(url){
  return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('טעינת התמונה נכשלה')); im.src=url });
}

window.AdCompose={ photoColor, TEMPLATES, LIMITS, FONT_SETS, SIZES, render, slotFormat, fontForTone, fontSet, ensureFonts, loadImage, palette, monogram };
})();
