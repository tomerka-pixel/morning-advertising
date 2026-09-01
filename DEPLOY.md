# פריסת "מצב חי" לשרת מאורח (Vercel) — יצירה אמיתית בלינק הציבורי

המטרה: שגם באתר הציבורי (GitHub Pages) יצירת הפוסטים והמודעות תעבוד באמת עם Claude
והיגספילד, בלי שצריך להריץ שום דבר מקומית.

## מה זה כולל
- `api/post.js` — כותב פוסט/מודעה עם Claude (Anthropic API)
- `api/generate.js` — יוצר מודעת תמונה עם היגספילד (REST)
- `api/health.js` — בדיקת זמינות
- הפרונטאנד (`demo.html`) מזהה שהוא רץ ב-github.io וקורא לשרת ה-Vercel

## מפתחות שצריך (סודות — לא נכנסים לקוד, רק ל-Vercel)
1. **ANTHROPIC_API_KEY** — נוצר ב-console.anthropic.com. שים לב: זה API בתשלום, נפרד ממנוי Claude.
   מומלץ מאוד לקבוע *מגבלת הוצאה חודשית נמוכה* על המפתח.
2. **HF_API_KEY_ID** ו-**HF_API_KEY_SECRET** — נוצרים ב-Higgsfield Cloud (API keys).
3. אופציונלי: **HF_MODEL_PATH** — נתיב מודל GPT Image 2 המדויק (ברירת מחדל: Soul).
4. אופציונלי: **ANTHROPIC_MODEL** — ברירת מחדל `claude-sonnet-5` (מהיר וזול, איכות גבוהה).

## פריסה
1. לחבר את המאגר ל-Vercel (import project) או `vercel` ב-CLI.
2. להגדיר את משתני הסביבה שלמעלה ב-Vercel (Settings → Environment Variables).
3. לפרוס. מקבלים כתובת כמו `https://morning-advertising.vercel.app`.
4. להחליף ב-`demo.html` את `REPLACE_WITH_VERCEL_URL` בכתובת הזו, ולדחוף לגיט.
   מאותו רגע הלינק של GitHub Pages יעבוד עם יצירה אמיתית.

## אזהרת עלות ואבטחה (חשוב)
נקודות הקצה `api/post` ו-`api/generate` ציבוריות ולא מוגנות בסיסמה. כל מי שמוצא אותן
יכול לייצר על חשבון המפתחות שלך. הגנות מומלצות:
- לקבוע מגבלת הוצאה חודשית נמוכה על מפתח Anthropic.
- להחזיק מעט קרדיטים בהיגספילד.
- לא לפרסם את הכתובת בריש גלי.
- בהמשך אפשר להוסיף שכבת הגנה (rate-limit / טוקן) אם הופכים את זה למוצר אמיתי.
