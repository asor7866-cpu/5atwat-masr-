import { adapters } from "../src/index";
import type { AccountCredentials, Platform, PublishRequest } from "../src/types";

// ============================================================
// POST /api/publish
//
// ملاحظة مهمة: الدالة دي serverless — يعني مالهاش ذاكرة دائمة
// بين الطلبات. عشان كده هنا بنستقبل الـ credentials جوه الـ
// body نفسه على سبيل التجربة فقط. في الإنتاج الفعلي، لازم
// تستبدل ده بجلب الـ credentials من قاعدة بيانات حقيقية
// (Postgres / Vercel KV / إلخ) بناءً على accountId فقط،
// عشان التوكن ميتبعتش من الفرونت إند في كل مرة.
// ============================================================

interface PublishBody {
  platform: Platform;
  credentials: AccountCredentials;
  request: PublishRequest;
}

export default async function handler(req: any, res: any) {
  // السماح بالنداء من الداشبورد نفسه (نفس الدومين) وأي فرونت إند للتجربة
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "استخدم POST" });
    return;
  }

  const body = req.body as PublishBody;
  if (!body?.platform || !body?.credentials || !body?.request) {
    res.status(400).json({ error: "لازم platform و credentials و request في الـ body" });
    return;
  }

  const adapter = adapters[body.platform];
  if (!adapter) {
    res.status(400).json({ error: `منصة غير مدعومة: ${body.platform}` });
    return;
  }

  if (!adapter.supports.includes(body.request.kind)) {
    res.status(400).json({
      error: `${body.platform} مش بيدعم ${body.request.kind}. المدعوم: ${adapter.supports.join(", ")}`,
    });
    return;
  }

  try {
    const result = await adapter.publish(body.credentials, body.request);
    res.status(result.success ? 200 : 502).json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
}
