import type {
  AccountCredentials,
  PlatformAdapter,
  PublishRequest,
  PublishResult,
} from "../types";

// ============================================================
// X (Twitter) API v2
// التوثيق: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
//
// ملاحظة مهمة:
// النشر البرمجي (Create Post) بيتطلب اشتراك مدفوع (Basic tier فما فوق).
// الـ Free tier لا يسمح عمليًا بإنشاء تغريدات عبر API بشكل كافٍ للاستخدام الجدي.
// رفع الميديا بيحصل عبر endpoint منفصل (media upload) قبل ربطه بالتغريدة.
// ============================================================

const X_API_BASE = "https://api.x.com/2";
const X_UPLOAD_BASE = "https://upload.x.com/1.1/media/upload.json";

async function uploadMedia(accessToken: string, mediaUrl: string): Promise<string> {
  const mediaRes = await fetch(mediaUrl);
  const mediaBlob = await mediaRes.arrayBuffer();
  const base64 = Buffer.from(mediaBlob).toString("base64");

  const res = await fetch(X_UPLOAD_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ media_data: base64 }),
  });
  const data = (await res.json()) as { media_id_string?: string };
  if (!res.ok || !data.media_id_string) throw new Error(`فشل رفع الميديا لـ X: ${JSON.stringify(data)}`);
  return data.media_id_string;
}

export const xAdapter: PlatformAdapter = {
  platform: "x",
  supports: ["post", "video"],
  async publish(creds: AccountCredentials, req: PublishRequest): Promise<PublishResult> {
    try {
      const body: Record<string, unknown> = { text: req.caption ?? "" };

      if (req.mediaUrl) {
        const mediaId = await uploadMedia(creds.accessToken, req.mediaUrl);
        body.media = { media_ids: [mediaId] };
      }

      const res = await fetch(`${X_API_BASE}/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { data?: { id?: string } };
      if (!res.ok) throw new Error(`فشل النشر على X: ${JSON.stringify(data)}`);

      return { success: true, platform: "x", externalId: data.data?.id, raw: data };
    } catch (e) {
      return { success: false, platform: "x", error: String(e) };
    }
  },
};
