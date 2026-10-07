/* מרכיב המודעות: ארבע תבניות שנבנות בקוד מעל תמונה שנוצרה בלי טקסט.
   הכותרת, הכפתור, הלוגו והצבעים מצוירים על קנבס, ולכן העברית תמיד מדויקת.
   המודעה היא של העסק של הלקוח: הצבע, הלוגו והפונט שלו, לא הסגנון של מורנינג */
(function(){

const SIZES = { '4:5':[1080,1350], '1:1':[1080,1080], '9:16':[1080,1920], '16:9':[1920,1080] };
/* היחסים שמנוע התמונות יודע לייצר */
const GEN_FORMATS = { '1:1':1, '4:5':0.8, '3:4':0.75, '9:16':0.5625, '16:9':1.7778 };

const TEMPLATES = [
  { v:'split',   t:'מפוצל',      d:'תמונה למעלה, טקסט למטה' },
  { v:'overlay', t:'על התמונה',  d:'תמונה מלאה עם טקסט מעליה' },
  { v:'frame',   t:'מסגרת',      d:'תמונה ממוסגרת במרכז' },
  { v:'type',    t:'טיפוגרפי',   d:'כותרת גדולה, תמונה עגולה' }
];

/* פונטים עבריים חופשיים לשימוש מסחרי (Google Fonts, רישיון OFL) */
const FONT_SETS = [
  { v:'clean',   t:'נקי ועכשווי',  head:{f:'Heebo',w:800},            body:{f:'Heebo',w:400},     cta:{f:'Heebo',w:500} },
  { v:'warm',    t:'עגול וחם',     head:{f:'Rubik',w:700},            body:{f:'Rubik',w:400},     cta:{f:'Rubik',w:700} },
  { v:'bold',    t:'בולט ואנרגטי', head:{f:'Secular One',w:400},      body:{f:'Heebo',w:500},     cta:{f:'Secular One',w:400} },
  { v:'elegant', t:'קלאסי ויוקרתי', head:{f:'Frank Ruhl Libre',w:700}, body:{f:'Assistant',w:400}, cta:{f:'Assistant',w:600} },
  { v:'display', t:'צר ודרמטי',    head:{f:'Karantina',w:700},        body:{f:'Assistant',w:600}, cta:{f:'Assistant',w:600} }
];
const FONT_BY_TONE = { 'ידידותי וחם':'warm', 'מקצועי ומהוקצע':'clean', 'אנרגטי ומניע':'bold', 'יוקרתי ורגוע':'elegant' };
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;800&family=Rubik:wght@400;700' +
  '&family=Secular+One&family=Frank+Ruhl+Libre:wght@700&family=Assistant:wght@400;600&family=Karantina:wght@700&display=swap';

function fontSet(v){ return FONT_SETS.find(x=>x.v===v) || FONT_SETS[0] }
function fontForTone(tone){ return FONT_BY_TONE[tone] || 'clean' }
function css(spec,size){ return spec.w+' '+Math.round(size)+'px "'+spec.f+'", "Heebo", sans-serif' }

async function ensureFonts(v){
  const s=fontSet(v);
  try{ await Promise.all([s.head,s.body,s.cta].map(x=>document.fonts.load(css(x,64),'אבג'))) }catch(e){}
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
const INK='#141414', WHITE='#FFFFFF';
function textOn(bg){ return contrast(bg,WHITE)>=contrast(bg,INK) ? WHITE : INK }

function palette(brand){
  brand=brand||'#1F3A5F';
  const deep=mix(brand,'#000',0.62);
  return {
    brand, deep,
    tint: mix(brand,WHITE,0.9),
    onBrand: textOn(brand),
    /* כפתור על רקע בהיר: צבע המותג, אלא אם הוא בהיר מדי ונבלע */
    pillOnLight: contrast(brand,WHITE)<1.7 ? deep : brand
  };
}

/* =================== טקסט =================== */
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
/* הגודל הכי גדול שנכנס לתיבה, ואז שורות מאוזנות (בלי מילה בודדת יתומה בשורה האחרונה) */
function fit(ctx,text,spec,o){
  const lh=o.lh||1.08;
  for(let size=o.max; size>=o.min; size*=0.96){
    ctx.font=css(spec,size);
    if(o.track!=null)ctx.letterSpacing=(size*o.track)+'px';
    const longest=Math.max(0,...String(text||'').split(/\s+/).map(x=>ctx.measureText(x).width));
    if(longest>o.w)continue;
    const lines=wrap(ctx,text,o.w);
    if(lines.length>(o.lines||3)||lines.length*size*lh>o.h)continue;
    let lo=Math.max(longest,o.w*0.45), hi=o.w;
    for(let i=0;i<14&&lines.length>1;i++){ const m=(lo+hi)/2; if(wrap(ctx,text,m).length>lines.length)lo=m; else hi=m }
    return { size, lh, lines: wrap(ctx,text,lines.length>1?hi:o.w), spec, track:o.track };
  }
  ctx.font=css(spec,o.min);
  return { size:o.min, lh, lines:wrap(ctx,text,o.w).slice(0,o.lines||3), spec, track:o.track };
}
function blockH(f){ return f?f.lines.length*f.size*f.lh:0 }
/* מצייר בלוק טקסט. x הוא הקצה הימני (או המרכז ב-center), y הוא ראש הבלוק */
function drawText(ctx,f,x,y,color,align,schematic){
  if(!f)return 0;
  ctx.font=css(f.spec,f.size);
  ctx.letterSpacing=(f.track?f.size*f.track:0)+'px';
  ctx.direction='rtl'; ctx.textAlign=align||'right'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=color;
  f.lines.forEach((ln,i)=>{
    const top=y+i*f.size*f.lh, base=top+f.size*(0.5*(f.lh-1)+0.82);
    if(schematic){
      const w=ctx.measureText(ln).width, bh=f.size*0.56, x0=align==='center'?x-w/2:x-w;
      rr(ctx,x0,top+(f.size*f.lh-bh)/2,w,bh,bh/2); ctx.fill();
    }else ctx.fillText(ln,x,base);
  });
  ctx.letterSpacing='0px';
  return blockH(f);
}

/* =================== צורות ותמונות =================== */
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

/* כפתור קריאה לפעולה. anchor = הקצה הימני, או המרכז ב-center. מחזיר את הרוחב */
function pill(ctx,text,x,y,h,bg,fg,spec,align,schematic){
  if(!text)return 0;
  const size=h*0.42;
  ctx.font=css(spec,size); ctx.letterSpacing='0px';
  const tw=ctx.measureText(text).width, w=tw+h*0.95;
  const x0=align==='center'?x-w/2:align==='left'?x:x-w;
  ctx.fillStyle=bg; rr(ctx,x0,y,w,h,h/2); ctx.fill();
  ctx.fillStyle=fg;
  if(schematic){ rr(ctx,x0+w*0.22,y+h*0.38,w*0.56,h*0.24,h*0.12); ctx.fill(); return w }
  ctx.direction='rtl'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text,x0+w/2,y+h*0.53);
  return w;
}

/* הלוגו, או שם העסק כשאין לוגו. bg = הצבע שמאחוריו, או null כשמאחוריו צילום */
function brandMark(ctx,o,x,y,maxW,maxH,align,bg,spec){
  const logo=o.logo;
  if(!logo||!logo.img){
    if(!o.name)return 0;
    const color=bg?textOn(bg):WHITE;
    const f=fit(ctx,o.name,spec,{w:maxW,h:maxH,max:maxH*0.62,min:maxH*0.3,lines:1});
    ctx.save();
    if(!bg){ ctx.shadowColor='rgba(0,0,0,.45)'; ctx.shadowBlur=maxH*0.4 }
    ctx.font=css(spec,f.size); const w=ctx.measureText(f.lines[0]||'').width;
    const ax=align==='center'?x:align==='left'?x+w:x;
    drawText(ctx,f,ax,y+(maxH-blockH(f))/2,color,align==='center'?'center':'right',o.schematic);
    ctx.restore();
    return w;
  }
  const im=logo.img, info=logo.info||{};
  const iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height;
  const s=Math.min(maxW/iw,maxH/ih), w=iw*s, h=ih*s;
  /* רקע מלא משלו: מציירים אותו כמו שהוא, עם פינות מעוגלות */
  const ownBg=info.transparent===false;
  let plate=null;
  if(!ownBg){
    const readable=info.read||(info.dark===false?WHITE:INK);
    if(!bg) plate=info.dark===false?'#141414':WHITE;
    /* גם כשהטקסט של הלוגו קריא, סמל בצבע של הרקע נבלע בו */
    else if(contrast(bg,readable)<3||(info.brand&&contrast(bg,info.brand)<1.6)) plate=info.dark===false?'#141414':WHITE;
  }
  const pad=plate?h*0.32:0, bw=w+pad*2.4, bh=h+pad*2;
  const x0=align==='center'?x-bw/2:align==='left'?x:x-bw;
  const y0=y+(maxH-bh)/2;
  if(plate){
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.18)'; ctx.shadowBlur=bh*0.25; ctx.shadowOffsetY=bh*0.06;
    ctx.fillStyle=plate; rr(ctx,x0,y0,bw,bh,bh*0.28); ctx.fill(); ctx.restore();
  }
  ctx.save();
  if(ownBg){ rr(ctx,x0+pad*1.2,y0+pad,w,h,h*0.12); ctx.clip() }
  ctx.drawImage(im,x0+pad*1.2,y0+pad,w,h);
  ctx.restore();
  return bw;
}

/* =================== התבניות =================== */
/* בסטורי (9:16) הרשת מכסה את החלק העליון והתחתון, ולכן הלוגו והכפתור נכנסים פנימה */
function geo(W,H){
  const U=Math.min(W,H)/1080, pad=Math.round(72*U), tall=H>W*1.5;
  return { U, pad, land:W>H*1.2, tall, top:tall?Math.round(230*U):0, bot:tall?Math.round(300*U):pad };
}

function split(ctx,W,H,o,p,F){
  const {U,pad,land,tall,top,bot}=geo(W,H);
  const body=F.body, head=F.head;
  ctx.fillStyle=WHITE; ctx.fillRect(0,0,W,H);
  let tx, ty, tw, th;
  if(land){
    const iw=Math.round(W*0.5);
    cover(ctx,o.img,0,0,iw,H);
    tx=W-pad; ty=pad; tw=W-iw-pad*2; th=H-pad*2;
    ctx.fillStyle=p.brand; ctx.fillRect(iw,0,Math.round(10*U),H);
  }else{
    const ih=Math.round(H*(tall?0.56:W===H?0.54:0.58));
    cover(ctx,o.img,0,0,W,ih);
    ctx.fillStyle=p.brand; ctx.fillRect(0,ih,W,Math.round(10*U));
    brandMark(ctx,o,W-pad,top||pad*0.8,W*0.34,96*U,'right',null,body);
    tx=W-pad; ty=ih+pad*0.9; tw=W-pad*2; th=H-ty-(tall?bot:pad*0.8);
  }
  const rowH=Math.round(84*U);
  const sub=o.sub?fit(ctx,o.sub,body,{w:tw,h:th*0.3,max:40*U,min:26*U,lines:2,lh:1.3}):null;
  const avail=th-rowH-blockH(sub)-(sub?22*U:0)-36*U;
  const hd=fit(ctx,o.headline,head,{w:tw,h:avail,max:(tall?108:100)*U,min:40*U,lines:3,track:-0.01});
  let y=ty;
  y+=drawText(ctx,hd,tx,y,p.deep,'right',o.schematic);
  if(sub){ y+=22*U; drawText(ctx,sub,tx,y,mix(p.deep,WHITE,0.38),'right',o.schematic) }
  const by=ty+th-rowH;
  pill(ctx,o.cta,tx,by,rowH,p.pillOnLight,textOn(p.pillOnLight),F.cta,'right',o.schematic);
  if(land) brandMark(ctx,o,W-tw-pad,by,tw*0.4,rowH,'left',WHITE,body);
  else if(o.site&&!o.schematic){
    ctx.font=css(body,30*U); ctx.fillStyle=mix(p.deep,WHITE,0.45); ctx.direction='ltr'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(o.site,pad,by+rowH/2);
  }
}

function overlay(ctx,W,H,o,p,F){
  const {U,pad,land,top,bot}=geo(W,H);
  const body=F.body, head=F.head;
  cover(ctx,o.img,0,0,W,H);
  const shade=mix(p.brand,'#000',0.72);
  const g=ctx.createLinearGradient(0,H*(land?0.25:0.36),0,H);
  g.addColorStop(0,rgba(shade,0)); g.addColorStop(0.45,rgba(shade,0.62)); g.addColorStop(1,rgba(shade,0.94));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const tg=ctx.createLinearGradient(0,0,0,H*0.2);
  tg.addColorStop(0,'rgba(0,0,0,.28)'); tg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,H*0.2);
  brandMark(ctx,o,W-pad,top||pad*0.8,W*(land?0.2:0.34),96*U,'right',null,body);

  const tw=land?W*0.62:W-pad*2, tx=W-pad, rowH=Math.round(84*U);
  const sub=o.sub?fit(ctx,o.sub,body,{w:tw,h:H*0.12,max:40*U,min:26*U,lines:2,lh:1.3}):null;
  const hd=fit(ctx,o.headline,head,{w:tw,h:H*(land?0.38:0.3),max:(land?96:108)*U,min:44*U,lines:3,track:-0.01});
  const by=H-bot-rowH;
  let y=by-38*U-blockH(sub)-(sub?20*U:0)-blockH(hd);
  y+=drawText(ctx,hd,tx,y,WHITE,'right',o.schematic);
  if(sub){ y+=20*U; drawText(ctx,sub,tx,y,'rgba(255,255,255,.86)','right',o.schematic) }
  const cb=contrast(p.brand,shade)>=2.2?p.brand:WHITE;
  pill(ctx,o.cta,tx,by,rowH,cb,textOn(cb),F.cta,'right',o.schematic);
  if(o.site&&!o.schematic){
    ctx.font=css(body,30*U); ctx.fillStyle='rgba(255,255,255,.8)'; ctx.direction='ltr'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(o.site,pad,by+rowH/2);
  }
}

function frame(ctx,W,H,o,p,F){
  const {U,pad,land,tall,top,bot}=geo(W,H);
  const body=F.body, head=F.head;
  ctx.fillStyle=p.tint; ctx.fillRect(0,0,W,H);
  const mat=Math.round(16*U), rowH=Math.round(80*U);
  const photo=(x,y,w,h)=>{
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.16)'; ctx.shadowBlur=40*U; ctx.shadowOffsetY=14*U;
    ctx.fillStyle=WHITE; rr(ctx,x,y,w,h,8*U); ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx,x+mat,y+mat,w-mat*2,h-mat*2,4*U); ctx.clip(); cover(ctx,o.img,x+mat,y+mat,w-mat*2,h-mat*2); ctx.restore();
  };
  if(land){
    const fw=Math.round(W*0.46);
    photo(pad,pad,fw,H-pad*2);
    const cx=(pad+fw+W)/2, tw=W-fw-pad*3.2;
    const sub=o.sub?fit(ctx,o.sub,body,{w:tw,h:H*0.16,max:38*U,min:26*U,lines:2,lh:1.3}):null;
    const hd=fit(ctx,o.headline,head,{w:tw,h:H*0.36,max:92*U,min:40*U,lines:3,track:-0.01});
    const logoH=84*U, total=logoH+40*U+blockH(hd)+(sub?20*U+blockH(sub):0)+40*U+rowH;
    let y=(H-total)/2;
    brandMark(ctx,o,cx,y,tw*0.5,logoH,'center',p.tint,body); y+=logoH+40*U;
    y+=drawText(ctx,hd,cx,y,p.deep,'center',o.schematic);
    if(sub){ y+=20*U; y+=drawText(ctx,sub,cx,y,mix(p.deep,WHITE,0.35),'center',o.schematic) }
    pill(ctx,o.cta,cx,y+40*U,rowH,p.pillOnLight,textOn(p.pillOnLight),F.cta,'center',o.schematic);
    return;
  }
  const logoH=Math.round(96*U);
  const ly=top||pad*0.7;
  brandMark(ctx,o,W/2,ly,W*0.4,logoH,'center',p.tint,body);
  const fy=ly+logoH+pad*0.6, fh=Math.round(H*(tall?0.4:W===H?0.44:0.48));
  photo(pad,fy,W-pad*2,fh);
  const ty=fy+fh+pad*0.75, by=H-bot-rowH, tw=W-pad*2.6;
  const sub=o.sub?fit(ctx,o.sub,body,{w:tw,h:(by-ty)*0.34,max:38*U,min:24*U,lines:2,lh:1.3}):null;
  const hd=fit(ctx,o.headline,head,{w:tw,h:by-ty-32*U-blockH(sub)-(sub?16*U:0),max:84*U,min:36*U,lines:3,track:-0.01});
  const block=blockH(hd)+(sub?16*U+blockH(sub):0);
  let y=ty+Math.max(0,(by-32*U-ty-block)/2);
  y+=drawText(ctx,hd,W/2,y,p.deep,'center',o.schematic);
  if(sub){ y+=16*U; drawText(ctx,sub,W/2,y,mix(p.deep,WHITE,0.35),'center',o.schematic) }
  pill(ctx,o.cta,W/2,by,rowH,p.pillOnLight,textOn(p.pillOnLight),F.cta,'center',o.schematic);
}

function type(ctx,W,H,o,p,F){
  const {U,pad,land,tall,top:safeTop,bot}=geo(W,H);
  const body=F.body, head=F.head, fg=p.onBrand;
  ctx.fillStyle=p.brand; ctx.fillRect(0,0,W,H);
  const circle=(cx,cy,r)=>{
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r+8*U,0,Math.PI*2); ctx.fillStyle=rgba(fg,0.9); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip(); cover(ctx,o.img,cx-r,cy-r,r*2,r*2); ctx.restore();
  };
  const rowH=Math.round(80*U), by=H-bot-rowH;
  /* פוטר: קו דק, כפתור מימין ושם האתר משמאל */
  ctx.fillStyle=rgba(fg,0.28); ctx.fillRect(pad,by-36*U,W-pad*2,Math.max(1,2*U));
  pill(ctx,o.cta,W-pad,by,rowH,fg,p.brand,F.cta,'right',o.schematic);
  if(o.site&&!o.schematic){
    ctx.font=css(body,30*U); ctx.fillStyle=rgba(fg,0.75); ctx.direction='ltr'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(o.site,pad,by+rowH/2);
  }
  /* ברוחב התמונה העגולה בצד ימין והטקסט משמאל לה. באורך התמונה למעלה והטקסט מתחתיה */
  let top, tw, tx=W-pad;
  const y0=safeTop||pad;
  if(land){
    const r=H*0.3; circle(W-pad-r,(by-36*U)/2,r);
    brandMark(ctx,o,pad,pad,W*0.2,80*U,'left',p.brand,body);
    top=pad+120*U; tx=W-pad*2-r*2; tw=tx-pad;
  }else{
    const r=W*(tall?0.2:0.16); circle(W-pad-r,y0+r,r);
    brandMark(ctx,o,pad,y0,W*0.36,84*U,'left',p.brand,body);
    top=y0+r*2+pad*0.8; tw=W-pad*2;
  }
  const bottom=by-36*U-pad*0.6;
  const sub=o.sub?fit(ctx,o.sub,body,{w:tw*0.9,h:(bottom-top)*0.25,max:42*U,min:26*U,lines:2,lh:1.3}):null;
  const room=bottom-top-blockH(sub)-(sub?26*U:0);
  const hd=fit(ctx,o.headline,head,{w:tw,h:room,max:(tall?168:land?120:150)*U,min:52*U,lines:4,lh:1.02,track:-0.015});
  let y=bottom-blockH(sub)-(sub?26*U:0)-blockH(hd);
  y+=drawText(ctx,hd,tx,y,fg,'right',o.schematic);
  if(sub){ y+=26*U; drawText(ctx,sub,tx,y,rgba(fg,0.82),'right',o.schematic) }
}

const DRAW={ split, overlay, frame, type };

/* o: { tpl, format, img, headline, sub, cta, name, site, logo:{img,info}, color, font, schematic }
   scale מקטין את הקנבס (תמונות ממוזערות) בלי לשנות את הפריסה */
function render(canvas,o){
  const [W,H]=SIZES[o.format]||SIZES['4:5'], k=o.scale||1;
  canvas.width=Math.round(W*k); canvas.height=Math.round(H*k);
  const ctx=canvas.getContext('2d');
  ctx.setTransform(k,0,0,k,0,0);
  ctx.imageSmoothingQuality='high';
  const F=fontSet(o.font);
  (DRAW[o.tpl]||split)(ctx,W,H,o,palette(o.color),F);
  return canvas;
}

/* היחס של אזור התמונה בתבנית, כדי לבקש מהמנוע תמונה שלא תיחתך יותר מדי */
function slotFormat(tpl,format){
  const [W,H]=SIZES[format]||SIZES['4:5'], g=geo(W,H);
  let r=W/H;
  if(tpl==='split') r=g.land?(W*0.5)/H:W/(H*(g.tall?0.56:W===H?0.54:0.58));
  else if(tpl==='frame') r=g.land?(W*0.46)/(H-g.pad*2):(W-g.pad*2)/(H*(g.tall?0.5:W===H?0.44:0.48));
  else if(tpl==='type') r=1;
  let best='1:1', d=Infinity;
  for(const [k,v] of Object.entries(GEN_FORMATS)){ const x=Math.abs(Math.log(v/r)); if(x<d){d=x;best=k} }
  return best;
}

function loadImage(url){
  return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('טעינת התמונה נכשלה')); im.src=url });
}

window.AdCompose={ TEMPLATES, FONT_SETS, FONTS_URL, SIZES, render, slotFormat, fontForTone, fontSet, ensureFonts, loadImage, palette };
})();
