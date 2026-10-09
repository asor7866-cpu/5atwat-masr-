// ============================================================
// أنواع مشتركة يستخدمها كل الـ adapters
// ============================================================

export type Platform =
  | "facebook"
  | "instagram"
  | "threads"
  | "tiktok"
  | "youtube"
  | "x"
  | "whatsapp";

export type ContentKind = "post" | "story" | "video" | "reel";

// بيانات الحساب المخزّنة في الـ token vault لكل حساب على حدة
export interface AccountCredentials {
  accountId: string;          // معرف داخلي عندك في قاعدة البيانات
  platform: Platform;
  accessToken: string;        // التوكن الأساسي (بعد فك التشفير)
  refreshToken?: string;      // لو المنصة بتدعم refresh
  expiresAt?: number;         // timestamp بالمللي ثانية
  // بيانات إضافية بتحتاجها بعض المنصات عشان تنشر
  platformMeta?: {
    pageId?: string;          // Facebook Page ID
    igUserId?: string;        // Instagram Business Account ID
    threadsUserId?: string;
    tiktokOpenId?: string;
    youtubeChannelId?: string;
    xUserId?: string;
    waPhoneNumberId?: string; // WhatsApp Business phone number id
  };
}

// طلب نشر موحّد يوصل لكل الـ adapters بنفس الشكل
export interface PublishRequest {
  kind: ContentKind;
  caption?: string;
  mediaUrl?: string;      // رابط عام (public URL) للصورة أو الفيديو
  mediaUrls?: string[];   // لو أكتر من ميديا (ألبوم / كاروسيل)
  videoTitle?: string;    // مطلوبة لليوتيوب
  privacy?: "public" | "unlisted" | "private";
}

export interface PublishResult {
  success: boolean;
  platform: Platform;
  externalId?: string;    // id البوست بعد النشر
  raw?: unknown;          // رد المنصة الخام للتشخيص
  error?: string;
}

// كل Adapter لازم يلتزم بالشكل ده
export interface PlatformAdapter {
  platform: Platform;
  supports: ContentKind[];
  publish(creds: AccountCredentials, req: PublishRequest): Promise<PublishResult>;
  refreshTokenIfNeeded?(creds: AccountCredentials): Promise<AccountCredentials>;
}
