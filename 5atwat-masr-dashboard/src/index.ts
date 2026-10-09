import { InMemoryVaultStore, TokenVault } from "./tokenVault";
import { PublishQueue } from "./queue";
import { makeMetaAdapter } from "./adapters/meta";
import { tiktokAdapter } from "./adapters/tiktok";
import { youtubeAdapter } from "./adapters/youtube";
import { xAdapter } from "./adapters/x";
import { whatsappAdapter } from "./adapters/whatsapp";
import type { Platform, PlatformAdapter } from "./types";

// ============================================================
// نقطة التجميع: registry موحّد لكل الـ adapters
// ============================================================
const adapters: Record<Platform, PlatformAdapter> = {
  facebook: makeMetaAdapter("facebook"),
  instagram: makeMetaAdapter("instagram"),
  threads: makeMetaAdapter("threads"),
  tiktok: tiktokAdapter,
  youtube: youtubeAdapter,
  x: xAdapter,
  whatsapp: whatsappAdapter,
};

const vault = new TokenVault(new InMemoryVaultStore());
const queue = new PublishQueue();

export { adapters, vault, queue };
