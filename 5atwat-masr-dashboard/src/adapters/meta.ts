import type {
  AccountCredentials,
  ContentKind,
  Platform,
  PlatformAdapter,
  PublishRequest,
  PublishResult,
} from "../types";

// ============================================================
// Meta Graph API — يغطي Facebook Pages, Instagram Business, Threads
// التوثيق الرسمي:
//  - Facebook Pages:  https://developers.facebook.com/docs/pages-api
//  - Instagram:       https://developers.facebook.com/docs/instagram-platform/content-publishing
//  - Threads:         https://developers.facebook.com/docs/threads
//
// شروط أساسية قبل ما ينفع تستخدم الكود ده:
//  1) حساب Instagram لازم يكون Business/Creator ومربوط بصفحة فيسبوك
//  2) لازم Meta App معتمد بالـ permissions المطلوبة (App Review)
//  3) التوكن ده Page Access Token (طويل الأجل) مش User Token عادي
// ============================================================

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

interface GraphResponse {
  id?: string;
  status_code?: string;
  [key: string]: unknown;
}

async function graphPost(path: string, params: Record<string, string>): Promise<GraphResponse> {
  const url = `${GRAPH_BASE}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = (await res.json()) as GraphResponse;
  if (!res.ok) {
    throw new Error(`Graph API error: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------- Facebook Page ----------
async function publishFacebook(
  creds: AccountCredentials,
  req: PublishRequest
): Promise<PublishResult> {
  const pageId = creds.platformMeta?.pageId;
  if (!pageId) throw new Error("pageId مفقود في platformMeta");

  try {
    if (req.kind === "video") {
      const data = await graphPost(`${pageId}/videos`, {
        file_url: req.mediaUrl ?? "",
        description: req.caption ?? "",
        access_token: creds.accessToken,
      });
      return { success: true, platform: "facebook", externalId: data.id, raw: data };
    }

    // Facebook مفيهوش "story" API عام مفتوح للمطورين بنفس سهولة البوست العادي
    // فبنعامله كبوست صورة/نص عادي على التايم لاين
    const data = await graphPost(`${pageId}/photos`, {
      url: req.mediaUrl ?? "",
      caption: req.caption ?? "",
      access_token: creds.accessToken,
    });
    return { success: true, platform: "facebook", externalId: data.id, raw: data };
  } catch (e) {
    return { success: false, platform: "facebook", error: String(e) };
  }
}

// ---------- Instagram (container -> publish flow) ----------
async function publishInstagram(
  creds: AccountCredentials,
  req: PublishRequest
): Promise<PublishResult> {
  const igUserId = creds.platformMeta?.igUserId;
  if (!igUserId) throw new Error("igUserId مفقود في platformMeta");

  try {
    // الخطوة 1: إنشاء container
    const containerParams: Record<string, string> = {
      caption: req.caption ?? "",
      access_token: creds.accessToken,
    };

    if (req.kind === "story") {
      containerParams.media_type = "STORIES";
      containerParams.image_url = req.mediaUrl ?? "";
    } else if (req.kind === "reel" || req.kind === "video") {
      containerParams.media_type = "REELS";
      containerParams.video_url = req.mediaUrl ?? "";
    } else {
      containerParams.image_url = req.mediaUrl ?? "";
    }

    const container = await graphPost(`${igUserId}/media`, containerParams);
    if (!container.id) throw new Error(`لم يرجع container id: ${JSON.stringify(container)}`);

    // الخطوة 2: نشر الـ container (لو فيديو محتاج ننتظر معالجته)
    if (req.kind === "reel" || req.kind === "video") {
      await waitUntilContainerReady(container.id, creds.accessToken);
    }

    const published = await graphPost(`${igUserId}/media_publish`, {
      creation_id: container.id,
      access_token: creds.accessToken,
    });

    return { success: true, platform: "instagram", externalId: published.id, raw: published };
  } catch (e) {
    return { success: false, platform: "instagram", error: String(e) };
  }
}

async function waitUntilContainerReady(containerId: string, accessToken: string) {
  for (let i = 0; i < 10; i++) {
    const res = await fetch(
      `${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = (await res.json()) as GraphResponse;
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("فشلت معالجة الفيديو في Instagram");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("انتهى وقت انتظار معالجة الفيديو");
}

// ---------- Threads ----------
async function publishThreads(
  creds: AccountCredentials,
  req: PublishRequest
): Promise<PublishResult> {
  const userId = creds.platformMeta?.threadsUserId;
  if (!userId) throw new Error("threadsUserId مفقود في platformMeta");

  try {
    const containerParams: Record<string, string> = {
      text: req.caption ?? "",
      access_token: creds.accessToken,
      media_type: req.mediaUrl ? (req.kind === "video" ? "VIDEO" : "IMAGE") : "TEXT",
    };
    if (req.mediaUrl) {
      if (req.kind === "video") containerParams.video_url = req.mediaUrl;
      else containerParams.image_url = req.mediaUrl;
    }

    const container = await graphPost(`${userId}/threads`, containerParams);
    if (!container.id) throw new Error(`لم يرجع container id: ${JSON.stringify(container)}`);
    const published = await graphPost(`${userId}/threads_publish`, {
      creation_id: container.id,
      access_token: creds.accessToken,
    });
    return { success: true, platform: "threads", externalId: published.id, raw: published };
  } catch (e) {
    return { success: false, platform: "threads", error: String(e) };
  }
}

export function makeMetaAdapter(platform: "facebook" | "instagram" | "threads"): PlatformAdapter {
  const supportsMap: Record<typeof platform, ContentKind[]> = {
    facebook: ["post", "video"],
    instagram: ["post", "story", "reel", "video"],
    threads: ["post", "video"],
  };

  return {
    platform: platform as Platform,
    supports: supportsMap[platform],
    async publish(creds, req) {
      if (platform === "facebook") return publishFacebook(creds, req);
      if (platform === "instagram") return publishInstagram(creds, req);
      return publishThreads(creds, req);
    },
  };
}
