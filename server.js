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

function buildPrompt(b) {
  const biz = b.business || {};
  const yn = v => v ? 'כן' : 'לא';
  return `כתוב פוסט לפי המאפיינים הבאים:
- עסק: ${biz.name || ''} — ${biz.field || ''}, ${biz.city || ''}. אופי: ${biz.vibe || ''}. אתר: ${biz.website || ''}
- מטרת הפוסט: ${b.goal || 'לא צוין'}
- טון: ${b.tone || 'לא צוין'}
- מסגרת כתיבה: ${b.framework || 'AIDA'}
- פלטפורמת יעד: ${b.platform || 'אינסטגרם'}
- קהל יעד: ${b.audience || 'קהל רחב'}
- הצעה / הטבה: ${b.offer || 'אין הצעה ספציפית'}
- קריאה לפעולה: ${b.cta || 'קביעת שיעור היכרות'}
- אורך: ${b.length || 'בינוני'}
- כמות אימוג'י: ${b.emoji || 'מדוד'}
- האשטאגים: ${yn(b.hashtags)}
- הנחיות נוספות: ${b.extra || 'אין'}`;
}

function runClaude(userPrompt) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'text', '--append-system-prompt', SYSTEM];
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

http.createServer((req, res) => {
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
        const text = await runClaude(buildPrompt(brief));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
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
