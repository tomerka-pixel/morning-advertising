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
  { v:'type',    t:'סולידי',    d:'כותרת גדולה, לוגו בעיגול' }
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
function cover(ctx,img,x,y,w,h,fy){
  if(!img){ placeholder(ctx,x,y,w,h); return }
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  const s=Math.max(w/iw,h/ih), sw=w/s, sh=h/s;
  const sx=(iw-sw)/2, sy=Math.max(0,Math.min(ih-sh,(ih-sh)*(fy==null?0.3:fy)));
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

/* מונוגרם משם העסק, כשאין לוגו (מהחוקים). באנגלית אם יש שם באנגלית */
function monogram(name,nameEn){
  const pick=s=>String(s||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('');
  return (pick(nameEn).toUpperCase()||pick(name)||'·');
}

/* עיגול הלוגו: הלוגו של העסק על רקע לבן (או הרקע שלו), תמונה, או מונוגרם בצבע הראשי */
function disc(ctx,o,p,cx,cy,r,photo,around){
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.closePath();
  if(photo&&o.img){ ctx.clip(); cover(ctx,o.img,cx-r,cy-r,r*2,r*2); ctx.restore(); return }
  const L=o.logo&&o.logo.img?o.logo:null;
  if(L){
    const info=L.info||{};
    ctx.fillStyle=info.transparent===false&&info.bg?info.bg:WHITE; ctx.fill(); ctx.clip();
    const iw=L.img.naturalWidth||L.img.width, ih=L.img.naturalHeight||L.img.height;
    const box=r*1.36, s=Math.min(box/iw,box/ih);
    ctx.drawImage(L.img,cx-iw*s/2,cy-ih*s/2,iw*s,ih*s);
    ctx.restore(); return;
  }
  /* מונוגרם בצבע הראשי. על רקע באותו צבע (סולידי) העיגול לבן והאותיות בצבע הראשי */
  let c=contrast(p.primary,WHITE)>=3?p.primary:p.deep, t=textOn(c);
  if(around&&contrast(c,around)<1.6){ t=contrast(p.primary,WHITE)>=3?p.primary:p.deep; c=WHITE }
  ctx.fillStyle=c; ctx.fill(); ctx.restore();
  if(o.schematic)return;
  ctx.font=css(MONO,r*0.875); ctx.fillStyle=t; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.direction='ltr';
  ctx.fillText(monogram(o.name,o.nameEn),cx,cy+r*0.04);
}

/* גלולת הלוגו ושם העסק: לבנה, הלוגו בעיגול 32 מימין והשם משמאלו (Logo + business name) */
function brandPill(ctx,o,p,F,x,y,align){
  ctx.font=css(F.body,15);
  const name=o.name||'', tw=name?ctx.measureText(name).width:0;
  const w=6+32+(name?8+tw:0)+14, h=44;
  const x0=align==='center'?x-w/2:align==='left'?x:x-w;
  ctx.save(); ctx.shadowColor='rgba(3,56,65,.10)'; ctx.shadowBlur=12; ctx.shadowOffsetY=2;
  ctx.fillStyle=WHITE; rr(ctx,x0,y,w,h,h/2); ctx.fill(); ctx.restore();
  disc(ctx,o,p,x0+w-6-16,y+h/2,16,false);
  if(!name)return w;
  ctx.fillStyle=p.ink(WHITE);
  if(o.schematic){ rr(ctx,x0+14,y+h/2-4,tw,8,4); ctx.fill(); return w }
  ctx.font=css(F.body,15); ctx.direction='rtl'; ctx.textAlign='right'; ctx.textBaseline='middle';
  ctx.fillText(name,x0+w-6-32-8,y+h/2+1);
  return w;
}

/* =================== התבניות (ביחידות של קנבס 540) =================== */
/* בסטורי הממשק של הרשת מכסה את החלק העליון והתחתון, ולכן הלוגו והכפתור נכנסים פנימה */
function zones(W,H){
  const story=H>W*1.5, land=W>H*1.25;
  return { story, land, P:story?40:32, T:story?110:0, B:story?130:0 };
}

/* מפוצל: תמונה 54% למעלה (בסטורי 67%), פאנל צבע עם כותרת 34, משנה 24 וכפתור בפינה */
function split(ctx,W,H,o,p,F,lim){
  const {story,land,P,T,B}=zones(W,H), sf=p.bg||p.light, btn=p.btn(sf);
  if(land){
    const iw=Math.round(W*0.48);
    ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
    cover(ctx,o.img,0,0,iw,H);
    const x=W-40, tw=W-iw-80;
    brandPill(ctx,o,p,F,x,40,'right');
    const hd=layout(ctx,o.headline,F.head,34,tw,lim.hl,1.18), sb=layout(ctx,o.sub,F.body,24,tw,lim.sl,1.25);
    let y=40+44+28;
    y+=drawLines(ctx,hd,x,y,p.ink(sf),'right',o.schematic)+8;
    drawLines(ctx,sb,x,y,p.sub(sf),'right',o.schematic);
    button(ctx,o,F,iw+40,H-40-49,'left',btn);
    return;
  }
  const tw=W-P*2;
  const hd=layout(ctx,o.headline,F.head,34,tw,lim.hl,1.18), sb=layout(ctx,o.sub,F.body,24,tw,lim.sl,1.25);
  const need=24+hd.h+8+sb.h+20+49+(B||24);
  const ih=Math.round(Math.min(H*(story?0.67:0.54),H-need));
  ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
  cover(ctx,o.img,0,0,W,ih);
  brandPill(ctx,o,p,F,W-24,T||24,'right');
  let y=ih+24;
  y+=drawLines(ctx,hd,W-P,y,p.ink(sf),'right',o.schematic)+8;
  drawLines(ctx,sb,W-P,y,p.sub(sf),'right',o.schematic);
  button(ctx,o,F,P,H-(B||24)-49,'left',btn);
}

/* על התמונה: תמונה מלאה, הצללה בצבע הראשי מ-30% ועד 95% בתחתית, טקסט לבן 40/24 */
function overlay(ctx,W,H,o,p,F,lim){
  const {land,P,T,B}=zones(W,H);
  cover(ctx,o.img,0,0,W,H);
  /* שכבת הצבע תמיד בצבע הראשי (מהחוקים), מוכהה מספיק כדי שהטקסט הלבן יעמוד ב-AA */
  const shade=lum(p.primary)>0.12?mix(p.primary,'#000',0.45):p.primary;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0.3,rgba(shade,0)); g.addColorStop(1,rgba(shade,0.95));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  brandPill(ctx,o,p,F,W-P,T||P,'right');
  const tw=land?W*0.6:W-P*2;
  const hd=layout(ctx,o.headline,F.head,40,tw,lim.hl,1.15), sb=layout(ctx,o.sub,F.body,24,tw,lim.sl,1.25);
  const by=H-(B||P)-49;
  let y=by-20-sb.h-10-hd.h;
  y+=drawLines(ctx,hd,W-P,y,WHITE,'right',o.schematic)+10;
  drawLines(ctx,sb,W-P,y,'rgba(255,255,255,.92)','right',o.schematic);
  button(ctx,o,F,P,by,'left',p.btn(shade));
}

/* מסגרת: רקע בהיר, הכל במרכז במרווח 24: גלולה, תמונה בכרטיס לבן (ריפוד 8, רדיוס 16), כותרת, משנה, כפתור */
function frame(ctx,W,H,o,p,F,lim){
  const {story,land,P,T,B}=zones(W,H), sf=p.bg||p.light, btn=p.btn(sf);
  ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
  const card=(x,y,w,h)=>{
    ctx.save(); ctx.shadowColor='rgba(3,65,62,.08)'; ctx.shadowBlur=60;
    ctx.fillStyle=WHITE; rr(ctx,x,y,w,h,16); ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx,x+8,y+8,w-16,h-16,10); ctx.clip(); cover(ctx,o.img,x+8,y+8,w-16,h-16); ctx.restore();
  };
  if(land){
    const cw=Math.round(W*0.46);
    card(40,40,cw,H-80);
    const cx=(40+cw+W)/2, tw=W-cw-120;
    const hd=layout(ctx,o.headline,F.head,34,tw,lim.hl,1.18), sb=layout(ctx,o.sub,F.body,24,tw,lim.sl,1.25);
    let y=(H-(44+24+hd.h+24+sb.h+24+49))/2;
    brandPill(ctx,o,p,F,cx,y,'center'); y+=44+24;
    y+=drawLines(ctx,hd,cx,y,p.ink(sf),'center',o.schematic)+24;
    y+=drawLines(ctx,sb,cx,y,p.sub(sf),'center',o.schematic)+24;
    button(ctx,o,F,cx,y,'center',btn);
    return;
  }
  const cw=W-112, ratio=story?1:H/W>1.15?1.6:2.2, chh=Math.round((cw-16)/ratio)+16;
  const hd=layout(ctx,o.headline,F.head,34,W-64,lim.hl,1.18), sb=layout(ctx,o.sub,F.body,24,W-96,lim.sl,1.25);
  const total=44+24+chh+24+hd.h+24+sb.h+24+49;
  let y=Math.max(T||P,(H-total)/2);
  brandPill(ctx,o,p,F,W/2,y,'center'); y+=44+24;
  card((W-cw)/2,y,cw,chh); y+=chh+24;
  y+=drawLines(ctx,hd,W/2,y,p.ink(sf),'center',o.schematic)+24;
  y+=drawLines(ctx,sb,W/2,y,p.sub(sf),'center',o.schematic)+24;
  button(ctx,o,F,W/2,y,'center',btn);
}

/* סולידי: כותרת ענקית (56) על הצבע הראשי, עיגול לוגו 100 (בסטורי 140) למעלה משמאל, קו מפריד וכפתור למטה */
function type(ctx,W,H,o,p,F,lim){
  const {story,land,T,B}=zones(W,H), P=40, sf=p.bg||p.primary, fg=p.bg?p.ink(sf):textOn(sf);
  ctx.fillStyle=sf; ctx.fillRect(0,0,W,H);
  const btn=p.bg?p.btn(sf):{bg:fg,fg:sf};
  const d=story?140:100, top=T||P, by=H-(B||P)-49;
  if(land){
    const r=H*0.27; disc(ctx,o,p,W-P-r,H/2,r,false,sf);
    const tw=W-P*3-r*2, x=W-P*2-r*2;
    const hd=layout(ctx,o.headline,F.head,56,tw,lim.hl,1.1), sb=layout(ctx,o.sub,F.body,24,tw,lim.sl,1.25);
    let y=(by-20-(hd.h+14+sb.h))/2+10;
    y+=drawLines(ctx,hd,x,y,fg,'right',o.schematic)+14;
    drawLines(ctx,sb,x,y,rgba(fg,0.92),'right',o.schematic);
    ctx.fillStyle=rgba(fg,0.9); ctx.fillRect(P,by-20,x-P,1);
    button(ctx,o,F,P,by,'left',btn);
    return;
  }
  /* בעיגול תמיד הלוגו של העסק (ובלי לוגו, מונוגרם), לא תמונה */
  disc(ctx,o,p,P+d/2,top+d/2,d/2,false,sf);
  const tw=W-P*2;
  const hd=layout(ctx,o.headline,F.head,56,tw,lim.hl,1.1), sb=layout(ctx,o.sub,F.body,24,tw,lim.sl,1.25);
  /* justify-between: ההודעה במרכז הרווח שבין העיגול לפוטר */
  const fy=by-20, mh=hd.h+14+sb.h, space=fy-(top+d);
  let y=top+d+Math.max(16,(space-mh)/2);
  y+=drawLines(ctx,hd,W-P,y,fg,'right',o.schematic)+14;
  drawLines(ctx,sb,W-P,y,rgba(fg,0.92),'right',o.schematic);
  ctx.fillStyle=rgba(fg,0.9); ctx.fillRect(P,fy,W-P*2,1);
  button(ctx,o,F,P,by,'left',btn);
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
  const [W,H]=SIZES[format]||SIZES['4:5'], z=zones(W,H);
  let r=W/H;
  if(tpl==='split') r=z.land?(W*0.48)/H:W/(H*(z.story?0.67:0.54));
  else if(tpl==='frame') r=z.land?(W*0.46)/(H-80):(z.story?1:H/W>1.15?1.6:2.2);
  else if(tpl==='type') r=1;
  let best='1:1', d=Infinity;
  for(const [k,v] of Object.entries(GEN_FORMATS)){ const x=Math.abs(Math.log(v/r)); if(x<d){d=x;best=k} }
  return best;
}

function loadImage(url){
  return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('טעינת התמונה נכשלה')); im.src=url });
}

window.AdCompose={ TEMPLATES, LIMITS, FONT_SETS, SIZES, render, slotFormat, fontForTone, fontSet, ensureFonts, loadImage, palette, monogram };
})();
