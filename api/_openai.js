/* חיבור ל-OpenAI: יצירת תמונת מודעה (GPT Image 2.5) וכתיבת קופי.
   מודול משותף לפונקציות ה-Vercel ולשרת המקומי (server.js).
   המפתח נקרא ממשתנה הסביבה OPENAI_API_KEY בלבד, לעולם לא מהקוד. */

const ENV = process['env'] || {};
const API = 'https://api.openai.com/v1';

const IMAGE_MODEL = ENV.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';
const TEXT_MODEL = ENV.OPENAI_TEXT_MODEL || 'gpt-5.6-terra';
const IMAGE_QUALITY = ENV.OPENAI_IMAGE_QUALITY || 'medium';

/* יחס מסך → מידה חוקית ב-Image API */
const SIZES = { '1:1': '1024x1024', '9:16': '1024x1536', '16:9': '1536x1024' };

function key() {
  const k = ENV.OPENAI_API_KEY;
  if (!k) throw new Error('חסר OPENAI_API_KEY בהגדרות השרת');
  return k;
}

async function call(path, body, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 120000);
  try {
    const r = await fetch(API + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (j.error && j.error.message) || ('שגיאת OpenAI ' + r.status);
      throw new Error(msg);
    }
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('תם הזמן הקצוב לתשובה מ-OpenAI');
    throw e;
  } finally { clearTimeout(t); }
}

/* יצירת תמונת מודעה. מחזיר data URL — אין קובץ ביניים ואין אחסון חיצוני. */
async function generateImage(opts) {
  const o = opts || {};
  const t0 = Date.now();
  const model = o.model || IMAGE_MODEL;
  const j = await call('/images/generations', {
    model,
    prompt: o.prompt || '',
    size: SIZES[o.format] || SIZES['1:1'],
    quality: o.quality || IMAGE_QUALITY,
    output_format: 'webp',
    output_compression: 92,
    n: 1
  }, 180000);
  const b64 = j.data && j.data[0] && j.data[0].b64_json;
  if (!b64) throw new Error('לא התקבלה תמונה מ-OpenAI');
  return {
    kind: 'image',
    url: 'data:image/webp;base64,' + b64,
    took: Math.round((Date.now() - t0) / 1000),
    model
  };
}

/* כתיבת טקסט (קופי למודעה / פוסט) דרך Responses API. */
async function generateText(system, user, model) {
  const j = await call('/responses', {
    model: model || TEXT_MODEL,
    instructions: system,
    input: user
  }, 90000);
  if (typeof j.output_text === 'string' && j.output_text.trim()) return j.output_text.trim();
  const parts = [];
  for (const item of j.output || []) {
    for (const c of item.content || []) if (c.type === 'output_text' && c.text) parts.push(c.text);
  }
  const text = parts.join('').trim();
  if (!text) throw new Error('לא התקבל טקסט מ-OpenAI');
  return text;
}

/* פענוח data URL לבאפר, לצורך שליחת נכסי מותג כקבצי ייחוס */
function fromDataUrl(u) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(u || '');
  if (!m) throw new Error('קובץ ייחוס לא תקין');
  const mime = m[1];
  const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
  const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
  return { mime, buf, ext };
}

/* יצירת תמונה עם נכסי מותג כייחוס (לוגו, תמונות מוצר) דרך images/edits.
   OpenAI מקבל כאן multipart בלבד, ולכן זו לא אותה קריאה כמו generations. */
async function generateImageWithRefs(opts) {
  const o = opts || {};
  const t0 = Date.now();
  const model = o.model || IMAGE_MODEL;
  const refs = (o.images || []).slice(0, 6);
  if (!refs.length) return generateImage(o);

  const build = (extras) => {
    const fd = new FormData();
    fd.append('model', model);
    fd.append('prompt', o.prompt || '');
    fd.append('size', SIZES[o.format] || SIZES['1:1']);
    fd.append('quality', o.quality || IMAGE_QUALITY);
    fd.append('n', '1');
    for (const k of Object.keys(extras || {})) fd.append(k, extras[k]);
    refs.forEach((u, i) => {
      const { mime, buf, ext } = fromDataUrl(u);
      fd.append('image[]', new Blob([buf], { type: mime }), 'ref' + i + '.' + ext);
    });
    return fd;
  };

  /* ניסיון ראשון עם פורמט פלט מוקטן, ואם הפרמטרים לא נתמכים חוזרים לברירת המחדל */
  const attempts = [{ output_format: 'webp', output_compression: '92' }, {}];
  let lastErr;
  for (const extras of attempts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 180000);
    try {
      const r = await fetch(API + '/images/edits', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key() },
        body: build(extras),
        signal: ctrl.signal
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        lastErr = new Error((j.error && j.error.message) || ('שגיאת OpenAI ' + r.status));
        if (r.status === 400 && Object.keys(extras).length) continue; /* ננסה בלי הפרמטרים האופציונליים */
        throw lastErr;
      }
      const b64 = j.data && j.data[0] && j.data[0].b64_json;
      if (!b64) throw new Error('לא התקבלה תמונה מ-OpenAI');
      const fmt = extras.output_format || 'png';
      return { kind: 'image', url: 'data:image/' + fmt + ';base64,' + b64, took: Math.round((Date.now() - t0) / 1000), model, refs: refs.length };
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('תם הזמן הקצוב לתשובה מ-OpenAI');
      lastErr = e;
    } finally { clearTimeout(timer); }
  }
  throw lastErr || new Error('יצירת התמונה נכשלה');
}

function hasKey() { return !!ENV.OPENAI_API_KEY; }

module.exports = { generateImage, generateImageWithRefs, generateText, hasKey, IMAGE_MODEL, TEXT_MODEL, SIZES };
