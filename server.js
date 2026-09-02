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
let sharp = null; try { sharp = require('sharp'); } catch (e) { /* כתוביות ידרשו sharp */ }

const ENV = process['env'] || {};
const ROOT = __dirname;
const PORT = ENV.PORT || 8787;
const CLAUDE_BIN = ENV.CLAUDE_BIN || 'claude';
const CLAUDE_MODEL = ENV.CLAUDE_MODEL || '';
const HF_BIN = ENV.HF_BIN || 'higgsfield';
const HF_IMAGE_MODEL = ENV.HF_IMAGE_MODEL || 'gpt_image_2';
const HF_RESOLUTION = ENV.HF_RESOLUTION || '1k'; // 1k=זול יותר, 2k=יקר
const HF_QUALITY = ENV.HF_QUALITY || 'medium'; // medium = מהיר וזול (1k medium=1.5 קרדיטים); high=4.5, 2k high=8.5
const HF_VIDEO_OMNI = ENV.HF_VIDEO_OMNI || 'gemini_omni_flash_1_1'; // דיבור עברי, עד 10ש׳
const HF_VIDEO_SEEDANCE = ENV.HF_VIDEO_SEEDANCE || 'seedance_2_0'; // קולנועי, עד 15ש׳
const HF_VIDEO_RES_OMNI = ENV.HF_VIDEO_RES_OMNI || '360p';      // הנמוך ביותר ב-Omni (חסכוני לבדיקות)
const HF_VIDEO_RES_SEEDANCE = ENV.HF_VIDEO_RES_SEEDANCE || '480p'; // הנמוך ביותר ב-Seedance
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
- "seedance" — אם הפרסומת ויזואלית/קולנועית: מוצר, תנועה, אווירה, אסתטיקה, בלי דיבור בעברית. מקסימום 10 שניות, כולל מוזיקה ואפקטים.
ברירת מחדל כשלא ברור: seedance. (הערה: בפועל שני הסוגים מיוצרים במודל אחד עד 10ש׳; בחירתך משמשת לניסוח בלבד.)

הפרומפט (PROMPT) באנגלית בלבד, מובנה לפי שיטת commercial-pipeline (סצנה אחת קצרה), עם הסעיפים האלה כטקסט רץ:
- SCENE: הקונספט במשפט. LOCATION: המרחב, אזורים ורקע חי. CAMERA: תנועת מצלמה אחת רציפה (every shot moves, dolly/crane/push-in). ACTION: מה קורה לאורך השניות, מתחיל ישר בפעולה בלי הקדמה. LIGHT: מצב תאורה דומיננטי. AUDIO: פס קול קצר (מוזיקה/אמביינט). POSITIVE LOCKS: חוקים קשיחים. סיום: vertical 9:16, cinematic, warm color grade, NON-IP, no on-screen text.
- התאם את הצפיפות למשך שנבחר. בלי מרקדאון ובלי כותרות מטא.
- בטיחות תוכן (חובה): כלול ב-POSITIVE LOCKS את המשפט הבא מילה במילה, כי מסנני התוכן רגישים לתוכן כושר: "Everyone is fully and modestly dressed in loose, relaxed clothing (long-sleeve or full tops and long pants; no sports bras, no tight or revealing activewear). The camera focuses on faces, hands, gentle movement, equipment and the studio atmosphere, never on bodies. Wide and medium shots only, no body close-ups. Calm editorial wellness tone, no suggestive posing."

בשני הסוגים כתוב ב-SPEECH_HE את הטקסט המדובר בעברית: ב-UGC (omni) מה שהדמות אומרת אל המצלמה; בקולנועי (seedance) קריינות voiceover קצרה שמלווה את הסרטון. שמור על אורך שמתאים למשך (בערך 2 מילים לשנייה, שלא יחרוג מהאורך). כתוב ב-PHONETIC תעתיק פונטי מדויק באותיות אנגלית (למשל "herayon" ל"הריון", "shalom" ל"שלום"). כתוב ב-VOICE את מין הדובר/הקריין — female או male — שיתאים למין הדמות המרכזית שמופיעה בסצנה (ואם אין דמות ברורה, לפי קהל היעד).

החזר בדיוק בפורמט הזה, בלי שום טקסט נוסף לפני או אחרי:
MODEL: omni
DURATION: 8
SPEECH_HE: הטקסט בעברית
PHONETIC: the latin phonetic transliteration
VOICE: female
PROMPT:
<the english cinematic prompt here>`;

function videoUserPrompt(b) {
  const biz = b.business || {};
  const dur = Math.min(parseInt(b.seconds) || 10, 10);
  return `תכנן סרטון פרסומת קצר לפי המאפיינים:
- עסק: ${biz.name || ''} — ${biz.field || ''}, ${biz.city || ''}. אופי: ${biz.vibe || ''}
- מטרה: ${b.goal || 'לא צוין'}
- טון: ${b.tone || 'לא צוין'}
- קהל יעד: ${b.audience || 'קהל רחב'}
- מה לקדם / הצעה: ${b.offer || 'אין'}
- סגנון מבוקש: ${b.style || 'לא צוין'}
- אורך הסרטון: ${dur} שניות בדיוק (התאם את אורך הדיבור והתסריט בדיוק לאורך הזה)
- פורמט: ${b.format || '9:16'}
- הנחיות נוספות: ${b.extra || 'אין'}

${b.style === 'UGC אותנטי'
  ? 'סוג הסרטון (חובה): UGC — דמות אמיתית שמדברת בעברית אל המצלמה, כמו המלצת לקוח. החזר MODEL: omni, וכתוב SPEECH_HE (מה שהדמות אומרת), PHONETIC, ו-VOICE (מין הדמות).'
  : 'סוג הסרטון (חובה): קולנועי/ויזואלי שמציג את המרחב, הציוד, האור והאווירה של העסק, לפי מבנה commercial-pipeline (SCENE/LOCATION/CAMERA/ACTION/LIGHT/AUDIO/POSITIVE LOCKS). מותר לכלול אנשים המתאמנים, כל עוד הם מצייתים לחלוטין לנעילות בטיחות התוכן (בגדים רפויים וצנועים, צילום רחב/בינוני, מיקוד בפנים/תנועה/ציוד ולא בגוף). כתוב קריינות voiceover קצרה בעברית ב-SPEECH_HE שתלווה את הסרטון ותתאים בדיוק לאורך, וכן PHONETIC ו-VOICE (female/male לפי קהל היעד). החזר MODEL: seedance.'}`;
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
    const res = model === HF_VIDEO_OMNI ? HF_VIDEO_RES_OMNI : HF_VIDEO_RES_SEEDANCE;
    const args = ['generate', 'create', model, '--prompt', prompt, '--duration', String(duration), '--aspect_ratio', aspect, '--resolution', res, '--wait', '--wait-timeout', '8m', '--json'];
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
      else if (/nsfw/i.test(err + ' ' + out)) reject(new Error('הסרטון סומן כלא-הולם ע"י מסנן התוכן (קורה לעיתים בסצנות כושר). נסו שוב, או שנו מעט את הסגנון/הבקשה.'));
      else reject(new Error((err || out || ('higgsfield video exited ' + code)).slice(0, 300)));
    });
  });
}

const HF_TTS_MODEL = ENV.HF_TTS_MODEL || 'inworld_text_to_speech';
const VIDEO_OUT = path.join(ROOT, 'video-out');

/* קריינות עברית: יוצר קובץ אודיו ב-Higgsfield (inworld, קול Yael/Oren). */
function runHiggsfieldTTS(text, voice) {
  return new Promise((resolve, reject) => {
    const args = ['generate', 'create', HF_TTS_MODEL, '--prompt', text, '--voice', voice, '--wait', '--wait-timeout', '4m', '--json'];
    let child;
    try { child = spawn(HF_BIN, args, { cwd: ROOT }); }
    catch (e) { return reject(e); }
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => reject(e));
    child.on('close', code => {
      const urls = out.match(/https?:\/\/[^\s"'\\)]+/g) || [];
      const url = urls.reverse().find(u => /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i.test(u)) || urls[0];
      if (code === 0 && url) resolve(url);
      else reject(new Error((err || out || 'tts failed').slice(0, 300)));
    });
  });
}

async function fetchToFile(url, filePath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('download failed ' + r.status);
  fs.writeFileSync(filePath, Buffer.from(await r.arrayBuffer()));
  return filePath;
}

function ffmpegRun(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args);
    let err = '';
    p.stderr.on('data', d => err += d);
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg ' + code + ': ' + err.slice(-200))));
  });
}

/* מחלק טקסט לכתוביות מתוזמנות לאורך משך הסרטון. */
function captionSegments(text, dur) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // מקסימום 3 מילים בשורה (חלוקה לפי מילים, לא לפי משפטים)
  const words = clean.split(' ').filter(Boolean);
  let parts = [];
  for (let i = 0; i < words.length; i += 3) parts.push(words.slice(i, i + 3).join(' '));
  parts = parts.filter(Boolean);
  if (!parts.length) parts = [clean];
  const total = parts.reduce((a, p) => a + p.length, 0) || 1;
  let t = 0; const segs = [];
  for (const p of parts) { const d = Math.max(0.8, dur * p.length / total); segs.push({ start: +t.toFixed(2), end: +Math.min(dur, t + d).toFixed(2), text: p }); t += d; }
  segs[segs.length - 1].end = dur;
  return segs;
}

/* מרנדר שורת כתובית עברית ל-PNG שקוף (טקסט לבן עם קו מתאר שחור, RTL). */
async function renderCaptionPng(text, width, outPath) {
  const fsz = Math.max(16, Math.round(width * 0.055));
  const pad = Math.round(fsz * 0.5);
  const h = fsz + pad * 2;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg width="${width}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${Math.round(h - pad * 0.8)}" text-anchor="middle" direction="rtl" font-family="Arial Hebrew, Arial, sans-serif" font-weight="bold" font-size="${fsz}" fill="#ffffff" stroke="#000000" stroke-width="${Math.max(2, Math.round(fsz * 0.11))}" style="paint-order:stroke">${esc(text)}</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

function ffprobeSize(file) {
  return new Promise((resolve) => {
    const p = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]);
    let out = ''; p.stdout.on('data', d => out += d);
    p.on('close', () => { const m = out.trim().match(/(\d+)x(\d+)/); resolve(m ? { w: +m[1], h: +m[2] } : { w: 720, h: 1280 }); });
    p.on('error', () => resolve({ w: 720, h: 1280 }));
  });
}

/* מוריד סרטון, אופציונלית ממקסס קריינות ואופציונלית צורב כתוביות עברית. מחזיר נתיב מקומי מוגש. */
async function finalizeVideo(videoUrl, opts, id) {
  if (!fs.existsSync(VIDEO_OUT)) fs.mkdirSync(VIDEO_OUT, { recursive: true });
  const vPath = path.join(VIDEO_OUT, id + '-src.mp4');
  const outPath = path.join(VIDEO_OUT, id + '.mp4');
  await fetchToFile(videoUrl, vPath);
  let aPath = null;
  if (opts.audioUrl) { aPath = path.join(VIDEO_OUT, id + '-a.mp3'); await fetchToFile(opts.audioUrl, aPath); }
  const segs = (opts.captionText && sharp) ? captionSegments(opts.captionText, opts.dur) : [];
  const capPaths = [];
  if (segs.length) { const size = await ffprobeSize(vPath); for (let i = 0; i < segs.length; i++) { const p = path.join(VIDEO_OUT, id + '-c' + i + '.png'); await renderCaptionPng(segs[i].text, size.w, p); capPaths.push(p); } }

  const inputs = ['-y', '-i', vPath];
  if (aPath) inputs.push('-i', aPath);
  capPaths.forEach(p => inputs.push('-i', p));
  const capStart = aPath ? 2 : 1;
  const fc = [];
  let amap;
  if (aPath) { fc.push(`[0:a]volume=0.22[bg];[1:a]volume=1.5[vo];[bg][vo]amix=inputs=2:duration=first:dropout_transition=0[aout]`); amap = '[aout]'; }
  else amap = '0:a?';
  let vlab = '[0:v]';
  for (let i = 0; i < segs.length; i++) {
    const out = (i === segs.length - 1) ? '[vout]' : `[v${i}]`;
    fc.push(`${vlab}[${capStart + i}:v]overlay=x=(W-w)/2:y=(H-h)/2:enable='between(t,${segs[i].start},${segs[i].end})'${out}`);
    vlab = out;
  }
  const args = [...inputs];
  if (fc.length) args.push('-filter_complex', fc.join(';'));
  args.push('-map', segs.length ? '[vout]' : '0:v', '-map', amap);
  args.push(...(segs.length ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast'] : ['-c:v', 'copy']));
  args.push('-shortest', outPath);
  try { await ffmpegRun(args); }
  catch (e) {
    // fallback: אם המיקס נכשל (אולי אין אודיו במקור), בלי mix
    const a2 = [...inputs];
    const fc2 = fc.filter(x => !x.includes('amix'));
    if (fc2.length) a2.push('-filter_complex', fc2.join(';'));
    a2.push('-map', segs.length ? '[vout]' : '0:v');
    if (aPath) a2.push('-map', '1:a'); else a2.push('-map', '0:a?');
    a2.push(...(segs.length ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast'] : ['-c:v', 'copy']), '-shortest', outPath);
    await ffmpegRun(a2);
  }
  try { fs.unlinkSync(vPath); if (aPath) fs.unlinkSync(aPath); capPaths.forEach(p => fs.unlinkSync(p)); } catch (e) {}
  return '/video-out/' + id + '.mp4';
}

async function generateVideo(b) {
  const planText = await runClaude(videoUserPrompt(b), SYSTEM_VIDEO);
  const isUGC = b.style === 'UGC אותנטי'; // UGC = דמות שמדברת (lip-sync ב-Omni); קולנועי = ויזואלי + קריינות בפוסט
  const durM = planText.match(/DURATION:\s*(\d+)/i);
  const spM = planText.match(/SPEECH_HE:\s*(.+)/);
  const phM = planText.match(/PHONETIC:\s*(.+)/);
  const voM = planText.match(/VOICE:\s*([^\n]+)/i);
  const pM = planText.match(/PROMPT:\s*([\s\S]*)$/i);
  let dur = Math.min(parseInt(b.seconds) || (durM ? parseInt(durM[1]) : 8), 10); // עד 10ש׳ בינתיים — שני הסגנונות רצים על Omni
  if (!(dur >= 3)) dur = 8;
  let prompt = (pM ? pM[1] : planText).trim();
  const speechRaw = spM ? spM[1].trim() : '';
  const speechHe = (speechRaw && speechRaw !== '-') ? speechRaw : '';
  const phoneticRaw = phM ? phM[1].trim() : '';
  const phonetic = (phoneticRaw && phoneticRaw !== '-') ? phoneticRaw : '';
  const voiceRaw = voM ? voM[1] : '';
  const isFemale = /female|אישה|נקבה/i.test(voiceRaw);
  const isMale = !isFemale && /male|גבר|זכר/i.test(voiceRaw);
  const voice = isMale ? 'Oren (he)' : 'Yael (he)'; // ברירת מחדל: קול אישה
  const model = HF_VIDEO_OMNI; // שני הסגנונות רצים על Omni Flash 1.1 (Seedance חוסם פרומפטים) — הקולנועי שומר על מבנה commercial-pipeline
  const ar = b.format === '16:9' ? '16:9' : '9:16';

  let vocalized = '';
  if (speechHe) { vocalized = (await nikud(speechHe)).replace(/מוּבּ/g, 'מוּב'); } // תיקון "מוב" (moov)

  // בשני הסגנונות הדיבור/הקריינות נצרבים ישירות ביצירת Omni (לא TTS בפוסט):
  // UGC = דמות שמדברת אל המצלמה בלייב-סינק; קולנועי = קריינות voiceover בעברית על ויזואל קולנועי בלי דובר על המסך
  if (speechHe) {
    if (isUGC) {
      prompt += `\nThe on-screen character speaks these exact Hebrew words in natural modern Israeli Hebrew, clearly and lip-synced: "${vocalized}"`;
    } else {
      const nv = isMale ? 'male' : 'female';
      prompt += `\nA warm, professional Hebrew VOICEOVER narrator (${nv} voice) speaks these exact Hebrew words in natural modern Israeli Hebrew, clearly and calmly, as an off-screen voiceover over the cinematic visuals: "${vocalized}". This is a narrated commercial (voiceover), not a selfie testimonial — people in the scene are not talking to the camera.`;
    }
    if (phonetic) prompt += `\nUse this Latin phonetic transcription ONLY as a pronunciation guide for the Hebrew line above (do NOT read the Latin letters aloud, they are not part of the speech): ${phonetic}`;
    prompt += `\nBrand pronunciation: pronounce the brand name "${BIZ.name}" in English. The word "Move" sounds like "moov" (long oo, soft V), never "moob" and never "mov".`;
  }
  const g = await runHiggsfieldVideo(model, prompt, dur, ar);
  let url = g.url, captioned = false;
  if (b.captions !== false && speechHe) {
    try { url = await finalizeVideo(g.url, { audioUrl: null, captionText: speechHe, dur }, 'vid' + Date.now()); captioned = true; }
    catch (e) { url = g.url; }
  }
  return { kind: 'video', url, took: g.took, model, seconds: dur, prompt, speech: speechHe, vocalized, phonetic, voice: isMale ? 'Oren' : 'Yael', narrated: !!speechHe, captioned };
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
    return res.end(JSON.stringify({ live: true, engine: 'claude', version: 'v7-skill-locks' }));
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
        console.error('[generate] error:', e && (e.stack || e.message || e));
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
        console.error('[generate] error:', e && (e.stack || e.message || e));
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
