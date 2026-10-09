import type {
  AccountCredentials,
  PlatformAdapter,
  PublishRequest,
  PublishResult,
} from "../types";

// ============================================================
// WhatsApp — تنبيه مهم قبل أي حاجة تانية
// ============================================================
// طلبت "قناة مش رقم" — يعني WhatsApp Channels (الـ broadcast tool
// اللي شكله زي تليجرام). لغاية دلوقتي، Meta ملهاش
// API رسمي عام يسمح بالنشر البرمجي داخل Channels.
//
// الـ API الرسمي الوحيد المتاح للمطورين هو WhatsApp Business
// Cloud API، وهو مبني لغرض مختلف تمامًا: إرسال رسائل لأرقام
// أفراد أو broadcast lists محدودة (مش channel عام بمتابعين).
//
// أي أداة بتدّعي إنها "بتنشر في WhatsApp Channels" غالبًا:
//  - بتستخدم WhatsApp Web/Mobile session غير رسمية (reverse engineered)
//  - وده مخالف لشروط استخدام WhatsApp وبيعرض الحساب للحظر النهائي
//
// عشان كده الـ adapter ده مش بينفذ نشر لـ Channel. اللي هو بيعمله
// فعليًا هو استخدام الـ API الرسمي المتاح: إرسال رسالة/ميديا لرقم
// أو Broadcast List عبر WhatsApp Business Cloud API. لو محتاج
// broadcast حقيقي لقناة، الخيار الوحيد المتاح دلوقتي هو النشر
// اليدوي من تطبيق WhatsApp، أو انتظار Meta تفتح API رسمي لده.
// ============================================================

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export const whatsappAdapter: PlatformAdapter = {
  platform: "whatsapp",
  supports: ["post"], // "post" هنا معناها رسالة عبر الـ Business API الرسمي
  async publish(creds: AccountCredentials, req: PublishRequest): Promise<PublishResult> {
    const phoneNumberId = creds.platformMeta?.waPhoneNumberId;
    if (!phoneNumberId) {
      return {
        success: false,
        platform: "whatsapp",
        error: "waPhoneNumberId مفقود — ده مطلوب لأن WhatsApp Business API يعمل على مستوى رقم، مش قناة",
      };
    }

    // هنا بنرسل عبر Business API الرسمي لرقم أو broadcast list محدد،
    // مش نشر عام في قناة بمتابعين — ده الحد الأقصى المتاح رسميًا.
    return {
      success: false,
      platform: "whatsapp",
      error:
        "النشر البرمجي في WhatsApp Channels غير مدعوم رسميًا من Meta حاليًا. " +
        "متاح فقط إرسال رسائل مباشرة عبر Business Cloud API — استخدم دالة sendDirectMessage بدل publish للرسائل الفردية.",
    };
  },
};

// دالة منفصلة توضح الاستخدام الرسمي الفعلي المتاح (رسالة مباشرة، مش قناة)
export async function sendDirectMessage(
  creds: AccountCredentials,
  toPhoneNumber: string,
  text: string
): Promise<PublishResult> {
  const phoneNumberId = creds.platformMeta?.waPhoneNumberId;
  if (!phoneNumberId) {
    return { success: false, platform: "whatsapp", error: "waPhoneNumberId مفقود" };
  }
  try {
    const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhoneNumber,
        type: "text",
        text: { body: text },
      }),
    });
    const data = (await res.json()) as { messages?: { id: string }[] };
    if (!res.ok) throw new Error(JSON.stringify(data));
    return { success: true, platform: "whatsapp", externalId: data.messages?.[0]?.id, raw: data };
  } catch (e) {
    return { success: false, platform: "whatsapp", error: String(e) };
  }
}
