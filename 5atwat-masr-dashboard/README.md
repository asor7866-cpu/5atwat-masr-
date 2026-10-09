# خُطوات مصر — 5atwat Masr Social Media Dashboard

داشبورد لإدارة النشر على حسابات سوشيال ميديا متعددة عبر الـ **APIs الرسمية** لكل منصة.

## المنصات المدعومة

| المنصة | الأنواع المدعومة | ملاحظات |
|---|---|---|
| Facebook (صفحة) | بوست، فيديو | Meta App + Page Access Token طويل الأجل |
| Instagram Business | بوست، ستوري، ريلز، فيديو | حساب Business مربوط بصفحة فيسبوك + App Review |
| Threads | بوست، فيديو | نفس Meta App + صلاحيات Threads |
| TikTok | فيديو | محتاج App Review لـ `video.publish` — بدونه الفيديو بينزل Draft فقط |
| YouTube | فيديو / Shorts | OAuth token بصلاحية `youtube.upload` + كوتا يومية |
| X (Twitter) | تغريدة، ميديا | اشتراك مدفوع (Basic فأعلى) — الـ Free tier مش كافي |
| WhatsApp | ⚠️ | **مفيش API رسمي للنشر في Channels حاليًا.** الرسمي الوحيد: WhatsApp Business Cloud API (رسائل مباشرة فقط). أي أداة بتدّعي نشر في قنوات بتستخدم طرق غير رسمية عرضة للحظر |

## الهيكل

```
api/
  health.ts             فحص حالة السيرفر
  publish.ts            endpoint النشر
public/
  index.html            واجهة الداشبورد (RTL بالعربي)
src/
  types.ts              أنواع موحّدة
  tokenVault.ts         خزنة توكنات مشفّرة (AES-256-GCM)
  queue.ts              طابور نشر مع إعادة محاولة تلقائية
  index.ts              تجميع الـ adapters
  adapters/
    meta.ts             Facebook + Instagram + Threads
    tiktok.ts           TikTok Content Posting API
    youtube.ts          YouTube Data API v3
    x.ts                X API v2
    whatsapp.ts         WhatsApp Business Cloud API
```

## التشغيل محليًا

```bash
npm install
npm run typecheck   # فحص الأنواع
vercel dev          # تشغيل محلي على http://localhost:3000
```

## النشر على Vercel (لينك حقيقي)

```bash
npm install -g vercel
cd 5atwat-masr-dashboard
vercel login        # سجّل دخول بحسابك
vercel --prod       # هيطلع لك لينك زي https://your-project.vercel.app
```

أو من الموقع: ارفع الفولدر على GitHub → [vercel.com/new](https://vercel.com/new) → Import → Deploy.
ومن Settings → Environment Variables ضيف `TOKEN_VAULT_SECRET` (32 حرف على الأقل).

## الـ Endpoints

- `GET /api/health` — تأكيد إن السيرفر شغّال
- `POST /api/publish` — النشر:

```json
{
  "platform": "instagram",
  "credentials": {
    "accountId": "acc_1",
    "platform": "instagram",
    "accessToken": "...",
    "platformMeta": { "igUserId": "1789xxxx" }
  },
  "request": { "kind": "story", "caption": "نص", "mediaUrl": "https://example.com/img.jpg" }
}
```

## نقاط أمان مهمة

- التوكنات دلوقتي بتتخزن في المتصفح (localStorage) وبتتبعت مع كل طلب نشر — ده **للتجربة فقط**.
- في الإنتاج: خزّن التوكنات في قاعدة بيانات مشفّرة (استخدم `TokenVault` جوه `src/tokenVault.ts` مع Postgres/Vercel KV)، والفرونت يبعت `accountId` بس.
- كل توكن لازم يجي من OAuth flow حقيقي على المنصة نفسها — التوكنات اليدوية بتنتهي وتتحظر بسرعة.
