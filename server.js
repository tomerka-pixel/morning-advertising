#!/usr/bin/env node
/* שרת מקומי ל"מצב חי" של morning-advertising.
   מפעיל את ה-CLI של Claude (המנוי שלך, לא API בתשלום) לכתיבת פוסטים אמיתיים.
   הרצה:  node server.js   ואז לפתוח  http://localhost:8787/demo.html
   דורש שהפקודה `claude` תהיה זמינה בטרמינל (Claude Code CLI, אותו מנוי).
   אם claude לא נמצא — הדף נופל אוטומטית למנוע הכתיבה המקומי.
   הגדרות אופציונליות (משתני סביבה): PORT, CLAUDE_BIN (נתיב מלא ל-claude), CLAUDE_MODEL. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ENV = process['env'] || {};
const ROOT = __dirname;
const PORT = ENV.PORT || 8787;
const CLAUDE_BIN = ENV.CLAUDE_BIN || 'claude';
const CLAUDE_MODEL = ENV.CLAUDE_MODEL || '';
const HF_BIN = ENV.HF_BIN || 'higgsfield';
const HF_IMAGE_MODEL = ENV.HF_IMAGE_MODEL || 'gpt_image_2';
const HF_RESOLUTION = ENV.HF_RESOLUTION || '1k'; // 1k=זול יותר, 2k=יקר
const HF_QUALITY = ENV.HF_QUALITY || 'high'; // 1k high=4.5 קרדיטים, 1k medium=1.5, 2k high=8.5
const HF_VIDEO_OMNI = ENV.HF_VIDEO_OMNI || 'gemini_omni_flash_1_1'; // דיבור עברי, עד 10ש׳
const HF_VIDEO_SEEDANCE = ENV.HF_VIDEO_SEEDANCE || 'seedance_2_0'; // קולנועי, עד 15ש׳
const HF_VIDEO_RES = ENV.HF_VIDEO_RES || '720p';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8', '.ico':'image/x-icon' };

/* ה"סקיל": הנחיית המערכת של הקופירייטר. מבוסס מסגרות מוכחות (AIDA, בעיה-פתרון, סטוריטלינג). */
const SYSTEM = `את/ה קופירייטר/ית בכיר/ה בעברית, מומחה/ית לכתיבת פוסטים שיווקיים לעסקים קטנים ובינוניים ברשתות החברתיות.
המשימה: לכתוב פוסט אחד מוכן לפרסום, בעברית טבעית, חדה ויצירתית — כזה שעוצר את הגלילה ומניע לפעולה.

עקרונות:
- פתיחה (hook) חזקה בשורה הראשונה: שאלה, אמירה נועזת, כאב מזוהה או הבטחה — משהו שגורם לעצור.
- בנה את הפוסט לפי מסגרת הכתיבה שנבחרה:
  · AIDA = חשיפה, עניין, רצון, פעולה.
  · בעיה-פתרון = הצגת כאב, החרפה קלה, ואז הפתרון שלכם.
  · סטוריטלינג = רגע אנושי קטן שממחיש את הערך.
- התאם את הטון והאורך לפלטפורמה: אינסטגרם/טיקטוק — קליל, קצבי ואישי; פייסבוק — זורם וחברותי; לינקדאין — מקצועי ומהוקצע.
- אורך: קצר ≈ 40–60 מילים, בינוני ≈ 70–110, ארוך ≈ 120–180.
- אימוג'י: "בלי" = אף אחד; "מדוד" = 2–3 במקומות נכונים; "הרבה" = אקספרסיבי אך לא מוגזם.
- שלב את הקריאה לפעולה בצורה טבעית בסוף.
- אם התבקשו האשטאגים: 3–5 רלוונטיים בשורה נפרדת בסוף.

כללי איכות מחייבים:
- עברית תקנית וזורמת, בגובה העיניים, בפנייה ישירה לקורא.
- יצירתי ומקורי. אסור בתכלית קלישאות שיווקיות שחוקות ("הגיע הזמן ל...", "לא תאמינו", "במחיר שלא תראו בשום מקום") וניסוחים גנריים של בינה מלאכותית.
- אין להשתמש במקף ארוך (—). במקומו פסיק, נקודה או שורה חדשה.
- בלי מילים באנגלית מלבד שם המותג.
- אין להמציא נתונים, אחוזים, המלצות לקוח או עובדות שלא נמסרו.
- החזר אך ורק את טקסט הפוסט (כולל האשטאגים אם התבקשו). בלי כותרות, בלי הסברים, בלי מרכאות עוטפות.`;

/* הנחיית מערכת ייעודית לטקסט של מודעה ממומנת (קצר, חד, מוכר) — נפרד מפוסט אורגני. */
const SYSTEM_AD = `את/ה קופירייטר/ית בכיר/ה בעברית, מומחה/ית לכתיבת טקסטים למודעות ממומנות (פייסבוק, אינסטגרם, גוגל).
המשימה: לכתוב טקסט קצר וחד למודעה, שמלווה קריאייטיב חזותי ומניע להמרה מיידית.

מבנה נדרש (בדיוק כך, שורות נפרדות):
- שורה 1: כותרת (Headline) קצרה ומגנטית, עד 6 מילים. זו האמירה שעוצרת את הגלילה.
- 1 עד 2 שורות גוף קצרות: תועלת מרכזית וההצעה, בגובה העיניים.
- שורה אחרונה: קריאה לפעולה חדה וברורה.

כללים:
- קצר ותכליתי. מודעה, לא מאמר. סה"כ עד ~40 מילים.
- התאם לקהל היעד ולמה שרוצים לקדם.
- אימוג'י לפי הבקשה: "בלי" = אף אחד; "מדוד" = 1–2; "הרבה" = מעט יותר, בטעם.
- בלי האשטאגים (זו מודעה, לא פוסט).
- עברית תקנית, יצירתית, בלי קלישאות שחוקות ובלי ניסוחים גנריים של בינה מלאכותית.
- אין מקף ארוך (—). אין אנגלית מלבד שם המותג. אין להמציא נתונים או המלצות.
- החזר אך ורק את טקסט המודעה (כותרת + גוף + קריאה לפעולה), בלי כותרות מטא, הסברים או מרכאות עוטפות.`;

function buildPrompt(b) {
  const biz = b.business || {};
  const yn = v => v ? 'כן' : 'לא';
  return `כתוב ${b.type === 'ad' ? 'טקסט למודעה' : 'פוסט'} לפי המאפיינים הבאים:
- עסק: ${biz.name || ''} — ${biz.field || ''}, ${biz.city || ''}. אופי: ${biz.vibe || ''}. אתר: ${biz.website || ''}
- מטרה: ${b.goal || 'לא צוין'}
- טון: ${b.tone || 'לא צוין'}
- מסגרת כתיבה: ${b.framework || 'AIDA'}
- פלטפורמת יעד: ${b.platform || 'אינסטגרם'}
- קהל יעד: ${b.audience || 'קהל רחב'}
- הצעה / הטבה: ${b.offer || 'אין הצעה ספציפית'}
- קריאה לפעולה: ${b.cta || 'קביעת שיעור היכרות'}
- אורך: ${b.length || 'בינוני'}
- כמות אימוג'י: ${b.emoji || 'מדוד'}${b.type === 'ad' ? '' : '\n- האשטאגים: ' + yn(b.hashtags)}
- הנחיות נוספות: ${b.extra || 'אין'}`;
}

function runClaude(userPrompt, system) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'text', '--append-system-prompt', system || SYSTEM];
    if (CLAUDE_MODEL) args.push('--model', CLAUDE_MODEL);
    args.push(userPrompt);
    let child;
    try { child = spawn(CLAUDE_BIN, args, { cwd: ROOT }); }
    catch (e) { return reject(e); }
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => reject(e));
    child.on('close', code => code === 0 && out.trim()
      ? resolve(out.trim())
      : reject(new Error((err || 'claude exited ' + code).slice(0, 300))));
  });
}

/* יצירת מודעת תמונה אמיתית עם היגספילד (GPT Image 2) דרך ה-CLI (חשבון+קרדיטים, בלי מפתח API). */
function runHiggsfield(model, prompt, aspect) {
  return new Promise((resolve, reject) => {
    const args = ['generate', 'create', model, '--prompt', prompt, '--resolution', HF_RESOLUTION, '--quality', HF_QUALITY, '--wait', '--wait-timeout', '5m', '--json'];
    if (aspect) args.push('--aspect_ratio', aspect);
    const t0 = Date.now();
    let child;
    try { child = spawn(HF_BIN, args, { cwd: ROOT }); }
    catch (e) { return reject(e); }
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => reject(e));
    child.on('close', code => {
      const urls = out.match(/https?:\/\/[^\s"'\\)]+/g) || [];
      const url = urls.reverse().find(u => /\.(png|jpg|jpeg|webp|avif)(\?|$)/i.test(u)) || urls[0];
      if (code === 0 && url) resolve({ url, took: Math.round((Date.now() - t0) / 1000) });
      else reject(new Error((err || out || ('higgsfield exited ' + code)).slice(0, 300)));
    });
  });
}

/* === תכנון וידאו: Claude בוחר מודל, כותב פרומפט (אנגלית, לפי סקיל commercial-pipeline), ומנסח דיבור עברי === */
const SYSTEM_VIDEO = `אתה במאי ותסריטאי בכיר של פרסומות AI קצרות לעסקים. תכנן סרטון פרסומת קצר והחזר תשובה בפורמט קבוע.

בחירת מודל (קריטי, החלט לפי הבקשה):
- "omni" — אם הפרסומת מרוויחה מדמות שמדברת בעברית אל הצופה: דובר/ת, המלצת לקוח, פנייה ישירה, הסבר מדובר. מקסימום 10 שניות.
- "seedance" — אם הפרסומת ויזואלית/קולנועית: מוצר, תנועה, אווירה, אסתטיקה, בלי דיבור בעברית. עד 15 שניות, כולל מוזיקה ואפקטים.
ברירת מחדל כשלא ברור: seedance.

הפרומפט (PROMPT) באנגלית בלבד (המודלים מאומנים על אנגלית):
- פסקה אחת צפופה וקולנועית: מה רואים, נושא/מוצר, תנועת מצלמה, תאורה, מצב רוח, קצב, והמותג במרכז.
- שמור על המשכיות, סיים בקריאה חזותית לפעולה. התאם את הצפיפות למשך שנבחר. טקסט רץ, בלי מרקדאון ובלי כותרות.

אם בחרת omni: כתוב ב-SPEECH_HE משפט קצר, טבעי ומדויק בעברית שהדמות אומרת, שמתאים למשך (בערך 2-4 שניות דיבור לכל 8 שניות). אם seedance: כתוב מקף יחיד.

החזר בדיוק בפורמט הזה, בלי שום טקסט נוסף לפני או אחרי:
MODEL: omni
DURATION: 8
SPEECH_HE: המשפט בעברית או -
PROMPT:
<the english cinematic prompt here>`;

function videoUserPrompt(b) {
  const biz = b.business || {};
  const dur = Math.min(parseInt(b.seconds) || 15, 15);
  return `תכנן סרטון פרסומת קצר לפי המאפיינים:
- עסק: ${biz.name || ''} — ${biz.field || ''}, ${biz.city || ''}. אופי: ${biz.vibe || ''}
- מטרה: ${b.goal || 'לא צוין'}
- טון: ${b.tone || 'לא צוין'}
- קהל יעד: ${b.audience || 'קהל רחב'}
- מה לקדם / הצעה: ${b.offer || 'אין'}
- אורך מבוקש: עד ${dur} שניות
- פורמט: ${b.format || '9:16'}
- הנחיות נוספות: ${b.extra || 'אין'}`;
}

async function nikud(text) {
  try {
    const r = await fetch('https://nakdan-5-1.loadbalancer.dicta.org.il/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'nakdan', data: text, genre: 'modern', addmorph: false, keepqq: false, nodageshdefinite: true, matchpartial: true }) });
    const arr = await r.json();
    if (!Array.isArray(arr)) return text;
    return arr.map(t => t.sep ? t.word : ((t.options && t.options[0]) ? String(t.options[0]).replace(/\|/g, '') : t.word)).join('');
  } catch (e) { return text; }
}

function runHiggsfieldVideo(model, prompt, duration, aspect) {
  return new Promise((resolve, reject) => {
    const args = ['generate', 'create', model, '--prompt', prompt, '--duration', String(duration), '--aspect_ratio', aspect, '--resolution', HF_VIDEO_RES, '--wait', '--wait-timeout', '8m', '--json'];
    if (model === HF_VIDEO_OMNI) args.push('--mode', 'text-to-video');
    const t0 = Date.now();
    let child;
    try { child = spawn(HF_BIN, args, { cwd: ROOT }); }
    catch (e) { return reject(e); }
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => reject(e));
    child.on('close', code => {
      const urls = out.match(/https?:\/\/[^\s"'\\)]+/g) || [];
      const url = urls.reverse().find(u => /\.(mp4|webm|mov)(\?|$)/i.test(u)) || urls[0];
      if (code === 0 && url) resolve({ url, took: Math.round((Date.now() - t0) / 1000) });
      else reject(new Error((err || out || ('higgsfield video exited ' + code)).slice(0, 300)));
    });
  });
}

async function generateVideo(b) {
  const planText = await runClaude(videoUserPrompt(b), SYSTEM_VIDEO);
  const isOmni = /MODEL:\s*omni/i.test(planText);
  const durM = planText.match(/DURATION:\s*(\d+)/i);
  const spM = planText.match(/SPEECH_HE:\s*(.+)/);
  const pM = planText.match(/PROMPT:\s*([\s\S]*)$/i);
  let dur = Math.min(durM ? parseInt(durM[1]) : 8, isOmni ? 10 : 15, parseInt(b.seconds) || 15);
  if (!(dur >= 3)) dur = isOmni ? 8 : 5;
  let prompt = (pM ? pM[1] : planText).trim();
  const speechRaw = spM ? spM[1].trim() : '';
  const speechHe = (speechRaw && speechRaw !== '-') ? speechRaw : '';
  const model = isOmni ? HF_VIDEO_OMNI : HF_VIDEO_SEEDANCE;
  let vocalized = '';
  if (isOmni && speechHe) { vocalized = await nikud(speechHe); prompt += `\nThe on-screen character speaks these exact Hebrew words, clearly and lip-synced: "${vocalized}"`; }
  const ar = b.format === '16:9' ? '16:9' : '9:16';
  const g = await runHiggsfieldVideo(model, prompt, dur, ar);
  return { kind: 'video', url: g.url, took: g.took, model, seconds: dur, prompt, speech: speechHe, vocalized };
}

/* אחסון קריאייטיבים בצד השרת: קובץ JSON + הורדת התמונות לדיסק כך שיישמרו לתמיד. */
const DATA_FILE = path.join(ROOT, 'creatives.json');
const MEDIA_DIR = path.join(ROOT, 'creatives-media');
function loadCreatives() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return []; } }
function persistCreatives(a) { try { fs.writeFileSync(DATA_FILE, JSON.stringify(a)); } catch (e) {} }
function readJson(req) { return new Promise(res => { let d = ''; req.on('data', c => { d += c; if (d.length > 5e6) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch { res({}); } }); }); }
async function downloadMedia(url, id) {
  try {
    if (!/^https?:\/\//.test(url || '')) return null;
    const clean = url.split('?')[0];
    const ext = ((clean.match(/\.(png|jpg|jpeg|webp|avif|mp4)$/i) || [null, 'png'])[1] || 'png').toLowerCase();
    const r = await fetch(url); if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(path.join(MEDIA_DIR, id + '.' + ext), buf);
    return '/creatives-media/' + id + '.' + ext;
  } catch (e) { return null; }
}

function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/demo.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  if (req.url === '/api/creatives' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(loadCreatives()));
  }
  if (req.url === '/api/creatives' && req.method === 'POST') {
    const rec = await readJson(req);
    const arr = loadCreatives();
    if (!(arr[0] && arr[0].text === (rec.text || '') && arr[0].url === (rec.url || ''))) {
      if (rec.url) { const local = await downloadMedia(rec.url, rec.id || ('c' + Date.now())); if (local) { rec.origUrl = rec.url; rec.url = local; } }
      arr.unshift(rec); persistCreatives(arr.slice(0, 500));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.url === '/api/creatives/delete' && req.method === 'POST') {
    const body = await readJson(req);
    persistCreatives(loadCreatives().filter(x => x.id !== body.id));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.url === '/api/creatives/clear' && req.method === 'POST') {
    persistCreatives([]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ live: true, engine: 'claude' }));
  }
  if (req.url === '/api/post' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const brief = JSON.parse(body || '{}');
        const text = await runClaude(buildPrompt(brief), brief.type === 'ad' ? SYSTEM_AD : SYSTEM);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
    });
    return;
  }
  if (req.url === '/api/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const b = JSON.parse(body || '{}');
        if (b.kind === 'video') {
          const v = await generateVideo(b);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(v));
          return;
        }
        const g = await runHiggsfield(HF_IMAGE_MODEL, b.prompt || '', b.format || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ kind: 'image', url: g.url, took: g.took, model: HF_IMAGE_MODEL }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
    });
    return;
  }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`\n  morning-advertising · מצב חי`);
  console.log(`  פתחו:  http://localhost:${PORT}/demo.html`);
  console.log(`  מנוע כתיבה: Claude CLI (${CLAUDE_BIN})${CLAUDE_MODEL ? ' · מודל ' + CLAUDE_MODEL : ''}\n`);
});
