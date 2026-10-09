import type {
  AccountCredentials,
  PlatformAdapter,
  PublishRequest,
  PublishResult,
} from "../types";

// ============================================================
// TikTok Content Posting API
// التوثيق: https://developers.tiktok.com/doc/content-posting-api-get-started
//
// ملاحظة مهمة جدًا:
// النشر المباشر (Direct Post) محتاج التطبيق يكون معتمد من TikTok
// (App Review + audit للـ scope: video.publish).
// لو التطبيق لسه في وضع Sandbox / Unaudited، الفيديو هينشر كـ
// "draft" في تطبيق TikTok نفسه (المستخدم لازم يفتحه ويأكد يدويًا)
// مش هينشر أوتوماتيك فعليًا.
// ============================================================

const TIKTOK_BASE = "https://open.tiktokapis.com/v2";

async function initVideoUpload(accessToken: string, videoUrl: string, caption: string) {
  const res = await fetch(`${TIKTOK_BASE}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: "SELF_ONLY", // غيّرها حسب اعتماد تطبيقك: PUBLIC_TO_EVERYONE بعد الـ audit
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });
  const data = (await res.json()) as {
    error?: { code?: string };
    data?: { publish_id: string };
  };
  if (!res.ok || data.error?.code !== "ok" || !data.data) {
    throw new Error(`TikTok init error: ${JSON.stringify(data)}`);
  }
  return data.data;
}

async function checkPublishStatus(accessToken: string, publishId: string) {
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${TIKTOK_BASE}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const data = (await res.json()) as { data?: { status?: string } };
    const status = data?.data?.status;
    if (status === "PUBLISH_COMPLETE") return data;
    if (status === "FAILED") throw new Error(`فشل نشر TikTok: ${JSON.stringify(data)}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("انتهى وقت انتظار تأكيد النشر من TikTok");
}

export const tiktokAdapter: PlatformAdapter = {
  platform: "tiktok",
  supports: ["video"],
  async publish(creds: AccountCredentials, req: PublishRequest): Promise<PublishResult> {
    if (!req.mediaUrl) {
      return { success: false, platform: "tiktok", error: "TikTok محتاج فيديو (mediaUrl)" };
    }
    try {
      const init = await initVideoUpload(creds.accessToken, req.mediaUrl, req.caption ?? "");
      const final = await checkPublishStatus(creds.accessToken, init.publish_id);
      return { success: true, platform: "tiktok", externalId: init.publish_id, raw: final };
    } catch (e) {
      return { success: false, platform: "tiktok", error: String(e) };
    }
  },
};
