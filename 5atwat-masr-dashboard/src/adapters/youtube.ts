import type {
  AccountCredentials,
  PlatformAdapter,
  PublishRequest,
  PublishResult,
} from "../types";

// ============================================================
// YouTube Data API v3 — رفع فيديو (Shorts هو نفس المسار، بس
// أبعاد الفيديو عمودية وأقل من 60 ثانية عشان يتصنف Shorts أوتوماتيك)
// التوثيق: https://developers.google.com/youtube/v3/guides/uploading_a_video
//
// ملاحظات:
//  - محتاج OAuth 2.0 token بصلاحية https://www.googleapis.com/auth/youtube.upload
//  - فيه quota يومية محدودة (10,000 units افتراضيًا)، رفع فيديو = 1600 unit تقريبًا
//  - مفيش API عام لـ "Community posts" (البوستات النصية) — غير متاح للمطورين
// ============================================================

const UPLOAD_ENDPOINT =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export const youtubeAdapter: PlatformAdapter = {
  platform: "youtube",
  supports: ["video"],
  async publish(creds: AccountCredentials, req: PublishRequest): Promise<PublishResult> {
    if (!req.mediaUrl) {
      return { success: false, platform: "youtube", error: "YouTube محتاج فيديو (mediaUrl)" };
    }
    try {
      // الخطوة 1: نجيب رابط الرفع القابل للاستئناف
      const videoRes = await fetch(req.mediaUrl);
      const videoBlob = await videoRes.arrayBuffer();

      const initRes = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/*",
          "X-Upload-Content-Length": String(videoBlob.byteLength),
        },
        body: JSON.stringify({
          snippet: {
            title: req.videoTitle ?? req.caption?.slice(0, 90) ?? "بدون عنوان",
            description: req.caption ?? "",
          },
          status: {
            privacyStatus: req.privacy ?? "public",
          },
        }),
      });

      const uploadUrl = initRes.headers.get("location");
      if (!uploadUrl) {
        const errBody = await initRes.json().catch(() => ({}));
        throw new Error(`تعذر بدء الرفع: ${JSON.stringify(errBody)}`);
      }

      // الخطوة 2: رفع الفيديو الفعلي
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/*" },
        body: videoBlob,
      });
      const data = (await uploadRes.json()) as { id?: string };
      if (!uploadRes.ok) throw new Error(`فشل الرفع: ${JSON.stringify(data)}`);

      return { success: true, platform: "youtube", externalId: data.id, raw: data };
    } catch (e) {
      return { success: false, platform: "youtube", error: String(e) };
    }
  },
};
