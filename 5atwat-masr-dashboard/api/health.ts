export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    app: "5atwat Masr Social Media Dashboard",
    message: "السيرفر شغّال",
    platforms: ["facebook", "instagram", "threads", "tiktok", "youtube", "x", "whatsapp"],
  });
}
