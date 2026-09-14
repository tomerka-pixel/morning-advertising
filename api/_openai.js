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

function hasKey() { return !!ENV.OPENAI_API_KEY; }

module.exports = { generateImage, generateText, hasKey, IMAGE_MODEL, TEXT_MODEL, SIZES };
