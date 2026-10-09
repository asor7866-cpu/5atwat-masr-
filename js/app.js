/* ============================================================
   الموسوعة السياحية المصرية — منطق التطبيق (نسخة موسوعة)
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- ربط الصور الحقيقية بالبيانات ---------- */
if (typeof IMAGES !== "undefined") {
  [...GOVERNORATES, ...MUSEUMS, ...LANDMARKS].forEach((it) => {
    if (IMAGES[it.id]) it.image = IMAGES[it.id];
  });
}

/* ---------- تطبيق تعديلات لوحة التحكم (محلية) ---------- */
try {
  const _ov = JSON.parse(localStorage.getItem("egypt-data-overrides") || "null");
  if (_ov) {
    [["GOVERNORATES", GOVERNORATES], ["MUSEUMS", MUSEUMS], ["LANDMARKS", LANDMARKS], ["NEWS", NEWS]].forEach(([k, arr]) => {
      if (Array.isArray(_ov[k])) { arr.length = 0; arr.push(..._ov[k]); }
    });
  }
} catch (e) { /* تجاهل */ }

/* ---------- نظام الروابط المخصصة (Router) ---------- */
let currentItemId = null;
let currentShareUrl = null;
let suppressHistoryClose = false;

function findAnyItem(id) {
  const g = GOVERNORATES.find((x) => x.id === id);
  if (g) return { item: g, kind: "gov" };
  const m = MUSEUMS.find((x) => x.id === id);
  if (m) return { item: m, kind: "museum" };
  const l = LANDMARKS.find((x) => x.id === id);
  if (l) return { item: l, kind: "landmark" };
  return null;
}

function factListHTML(facts, tabIndex) {
  return `<ol class="numbered-facts">${(facts || []).map((f, i) =>
    `<li id="fact-${i + 1}"><span class="fact-text">${f}</span><button class="fact-link" data-fact="${i + 1}" data-tab="${tabIndex}" title="نسخ رابط هذه المعلومة">🔗</button></li>`
  ).join("")}</ol>`;
}

function handleFactParam() {
  const m = location.search.match(/[?&]fact=(\d+)/);
  const t = location.search.match(/[?&]tab=(\d+)/);
  if (t && currentTabs) {
    const idx = Math.min(+t[1], currentTabs.length - 1);
    if (currentTab !== idx) { currentTab = idx; renderTab(); }
  }
  if (!m) return;
  setTimeout(() => {
    const el = document.getElementById("fact-" + m[1]);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 2400);
    }
  }, 350);
}

function handleRoute() {
  const path = decodeURIComponent(location.pathname).replace(/\/+$/, "") || "/";
  if (path === "/") {
    if (backdrop.classList.contains("show")) { suppressHistoryClose = true; closeModal(); }
    return;
  }
  if (path === "/admin") { location.replace("/admin.html"); return; }

  const seg = path.split("/").filter(Boolean);
  // خبر: /news/1
  if (seg[0] === "news" && seg[1]) {
    const n = NEWS.find((x) => String(x.id) === seg[1]);
    if (n) { suppressHistoryClose = true; openNews(n); handleFactParam(); return; }
  }
  // عنصر: /id
  if (seg.length === 1) {
    const found = findAnyItem(seg[0]);
    if (found) {
      if (found.kind === "gov") { $("#governorates").scrollIntoView(); suppressHistoryClose = true; openGov(seg[0]); }
      else if (found.kind === "museum") { $("#museums").scrollIntoView(); suppressHistoryClose = true; openItem(seg[0], "متحف"); }
      else { $("#landmarks").scrollIntoView(); suppressHistoryClose = true; openItem(seg[0], "معلم سياحي"); }
      handleFactParam();
      return;
    }
  }
  // 404
  openModal(
    `<span class="m-emoji">🧭</span><h3>الصفحة غير موجودة</h3><p class="m-en">404 — Page not found</p>`,
    [{ label: "الرئيسية", html: `<p>الرابط الذي طلبته غير موجود في الموسوعة.</p>
      <ul class="attractions-list">
        <li><a href="/" style="color:var(--gold-strong);text-decoration:none">← العودة للصفحة الرئيسية</a></li>
        <li>تأكد من كتابة الرابط بشكل صحيح</li>
      </ul>` }],
    null
  );
}

window.addEventListener("popstate", handleRoute);


/* ---------- عدّاد المعلومات لكل عنصر ---------- */
function infoCount(item) {
  let n = 1; // الوصف
  ["stats", "timeline", "people", "dishes", "crafts", "cities", "districts",
   "attractions", "facts", "highlights", "tips"].forEach((k) => {
    if (Array.isArray(item[k])) n += item[k].length;
  });
  if (item.sections) Object.values(item.sections).forEach((arr) => { n += arr.length; });
  if (item.visit) n += 3;
  if (item.design) n += item.design.length;
  if (item.nearby) n += item.nearby.length;
  return n;
}
const TOTAL_INFO =
  GOVERNORATES.reduce((s, g) => s + infoCount(g), 0) +
  MUSEUMS.reduce((s, m) => s + infoCount(m), 0) +
  LANDMARKS.reduce((s, l) => s + infoCount(l), 0);

/* ---------- بناء البطاقات ---------- */
function govCard(g) {
  return `
  <article class="gov-card g${g.color} reveal" data-id="${g.id}">
    <div class="gov-banner">
      ${g.image ? `<img class="card-photo" src="${g.image}" alt="${g.name}" loading="lazy" onerror="this.remove()">` : ""}
      <span class="region-badge">${g.region}</span>
      <span class="gov-emoji">${g.icon}</span>
    </div>
    <div class="gov-body">
      <h3 class="gov-name">${g.name} <small>${g.en}</small></h3>
      <p class="gov-capital">📍 العاصمة: ${g.capital} · ☎️ ${g.phone || ""}</p>
      <p class="gov-desc">${g.desc}</p>
      <div class="gov-facts">
        <div class="fact">عدد السكان<b>${(g.population || "").split(" (")[0]}</b></div>
        <div class="fact">المساحة<b>${(g.area || "").split(" (")[0]}</b></div>
      </div>
      <span class="info-badge">🧠 ${infoCount(g)} معلومة موثقة</span>
    </div>
  </article>`;
}

function itemCard(item, kindLabel) {
  const pills = [
    `<span class="meta-pill hl">${item.type ?? kindLabel}</span>`,
    item.est ? `<span class="meta-pill">🗓️ ${item.est.split("(")[0].trim()}</span>` : "",
    item.era ? `<span class="meta-pill">🕰️ ${item.era}</span>` : "",
    item.pieces ? `<span class="meta-pill">📦 ${item.pieces}</span>` : "",
    item.unesco ? `<span class="unesco-pill">🌍 تراث عالمي</span>` : ""
  ].join("");
  return `
  <article class="item-card g${item.color} reveal" data-id="${item.id}">
    ${item.image ? `<div class="item-photo"><img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.parentElement.remove()"></div>` : ""}
    <div class="item-top">
      <span class="item-icon">${item.icon}</span>
      <div>
        <h3 class="item-title">${item.name}</h3>
        <p class="item-city">📍 ${item.city}</p>
      </div>
    </div>
    <p class="item-desc">${item.desc}</p>
    <div class="item-meta">${pills}</div>
    <span class="info-badge">🧠 ${infoCount(item)} معلومة موثقة</span>
  </article>`;
}

function newsCard(n) {
  return `
  <article class="news-card reveal">
    <div class="news-icon">${n.icon}</div>
    <div class="news-content">
      <div class="news-meta">
        <span class="news-tag">${n.tag}</span>
        <span class="news-date">🗓️ ${n.date}</span>
      </div>
      <h3>${n.title}</h3>
      <p>${n.excerpt}</p>
    </div>
  </article>`;
}

/* ---------- عرض البيانات ---------- */
const govGrid = $("#govGrid");
const museumGrid = $("#museumGrid");
const landmarkGrid = $("#landmarkGrid");
const newsList = $("#newsList");

function renderAll() {
  govGrid.innerHTML = GOVERNORATES.map(govCard).join("");
  museumGrid.innerHTML = MUSEUMS.map((m) => itemCard(m, "متحف")).join("");
  landmarkGrid.innerHTML = LANDMARKS.map((l) => itemCard(l, "معلم")).join("");
  newsList.innerHTML = NEWS.map(newsCard).join("");
}

/* ---------- فلاتر المناطق ---------- */
const chipsWrap = $("#regionChips");
let activeRegion = "all";

function buildChips() {
  chipsWrap.innerHTML =
    `<button class="chip active" data-region="all">الكل (${GOVERNORATES.length})</button>` +
    REGIONS.map((r) => {
      const count = GOVERNORATES.filter((g) => g.region === r).length;
      return `<button class="chip" data-region="${r}">${r} (${count})</button>`;
    }).join("");

  chipsWrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeRegion = chip.dataset.region;
    $$(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    applyFilters();
  });
}

/* ---------- البحث الموحّد ---------- */
const searchInput = $("#searchInput");
const searchClear = $("#searchClear");
const resultsSection = $("#searchResultsSection");
const resultsCount = $("#resultsCount");
const searchHint = $("#searchHint");
let query = "";

function normalize(text) {
  return String(text).toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[ىي]/g, "ي")
    .replace(/\s+/g, " ").trim();
}

function searchableText(item) {
  const parts = [item.name, item.en, item.city, item.capital, item.desc,
    item.region, item.etymology, item.type, item.era];
  ["attractions", "famous", "facts", "highlights", "tips", "people",
   "dishes", "crafts", "cities", "districts", "design", "nearby"].forEach((k) => {
    (item[k] || []).forEach((v) => parts.push(typeof v === "string" ? v : v.join(" ")));
  });
  if (item.timeline) parts.push(item.timeline.map((t) => t.join(" ")).join(" "));
  if (item.sections) Object.values(item.sections).forEach((a) => parts.push(a.join(" ")));
  return normalize(parts.filter(Boolean).join(" "));
}
const SEARCH_INDEX = new Map();

function buildIndex() {
  GOVERNORATES.forEach((g) => SEARCH_INDEX.set("gov:" + g.id, searchableText(g)));
  [...MUSEUMS, ...LANDMARKS].forEach((it) => SEARCH_INDEX.set(it.id, searchableText(it)));
}

function applyFilters() {
  const q = normalize(query);
  let govShown = 0, musShown = 0, lmShown = 0;

  GOVERNORATES.forEach((g) => {
    const okRegion = activeRegion === "all" || g.region === activeRegion;
    const okSearch = !q || SEARCH_INDEX.get("gov:" + g.id).includes(q);
    const show = okRegion && okSearch;
    $(`#govGrid [data-id="${g.id}"]`).style.display = show ? "" : "none";
    if (show) govShown++;
  });
  $("#govEmpty").hidden = govShown > 0;

  MUSEUMS.forEach((m) => {
    const show = !q || SEARCH_INDEX.get(m.id).includes(q);
    $(`#museumGrid [data-id="${m.id}"]`).style.display = show ? "" : "none";
    if (show) musShown++;
  });
  $("#museumEmpty").hidden = musShown > 0;

  LANDMARKS.forEach((l) => {
    const okType = activeLandType === "all" || landCategory(l.type) === activeLandType;
    const show = okType && (!q || SEARCH_INDEX.get(l.id).includes(q));
    $(`#landmarkGrid [data-id="${l.id}"]`).style.display = show ? "" : "none";
    if (show) lmShown++;
  });
  $("#landmarkEmpty").hidden = lmShown > 0;

  if (q) {
    resultsSection.hidden = false;
    resultsCount.textContent =
      `${govShown + musShown + lmShown} نتيجة مطابقة — محافظات: ${govShown} • متاحف: ${musShown} • معالم: ${lmShown}`;
    searchHint.textContent = `🔎 جاري البحث عن: «${query}»`;
    searchClear.hidden = false;
  } else {
    resultsSection.hidden = true;
    searchHint.textContent = "";
    searchClear.hidden = true;
  }
}

searchInput.addEventListener("input", () => { query = searchInput.value; applyFilters(); });
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    $("#governorates").scrollIntoView({ behavior: "smooth" });
  }
});
searchClear.addEventListener("click", () => {
  searchInput.value = ""; query = ""; applyFilters(); searchInput.focus();
});

/* ---------- فلاتر أنواع المعالم ---------- */
const LAND_TYPES = ["فرعوني", "إسلامي", "قبطي", "يوناني روماني", "طبيعي", "حديث وتاريخي"];
let activeLandType = "all";

function landCategory(type) {
  const t = type || "";
  if (t.includes("فرعوني")) return "فرعوني";
  if (t.includes("إسلامي")) return "إسلامي";
  if (t.includes("قبطي") || t.includes("ديني")) return "قبطي";
  if (t.includes("روماني") || t.includes("يوناني")) return "يوناني روماني";
  if (t.includes("طبيعي") || t.includes("جبل") || t.includes("حدائق") || t.includes("بحري") || t.includes("علاجي")) return "طبيعي";
  return "حديث وتاريخي";
}

function buildLandTypeChips() {
  const wrap = $("#landmarkTypeChips");
  if (!wrap) return;
  wrap.innerHTML =
    `<button class="chip active" data-ltype="all">الكل (${LANDMARKS.length})</button>` +
    LAND_TYPES.map((t) => {
      const count = LANDMARKS.filter((l) => landCategory(l.type) === t).length;
      return `<button class="chip" data-ltype="${t}">${t} (${count})</button>`;
    }).join("");

  wrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeLandType = chip.dataset.ltype;
    wrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    applyFilters();
  });
}

/* ---------- روابط خارجية لكل مكان ---------- */
function extLinksHTML(item, place) {
  const q = encodeURIComponent(`${item.name || ""} ${place || ""} مصر`);
  const wq = encodeURIComponent(item.name || "");
  const custom = item.links || {};
  const links = [
    ["🗺️ الموقع على خرائط جوجل", `https://www.google.com/maps/search/?api=1&query=${q}`],
    ["📖 اقرأ المزيد في ويكيبيديا", `https://ar.wikipedia.org/w/index.php?search=${wq}`],
    ["🇪🇬 البوابة الرسمية للسياحة", "https://www.egypt.travel/"]
  ];
  if (custom.official) links.push(["🏛️ الموقع الرسمي للمكان", custom.official]);
  if (custom.booking) links.push(["🎟️ احجز تذكرتك", custom.booking]);
  return `<h4>🔗 روابط خارجية</h4><div class="ext-links">${links.map(([t, u]) =>
    `<a class="ext-link" href="${u}" target="_blank" rel="noopener">${t} ↗</a>`).join("")}</div>`;
}

/* ---------- نافذة التفاصيل بالتابات ---------- */
const backdrop = $("#modalBackdrop");
const modalHead = $("#modalHead");
const modalBody = $("#modalBody");
let currentTabs = [];
let currentTab = 0;

function openModal(headHTML, tabs, image) {
  modalHead.className = "modal-head";
  if (image) {
    modalHead.classList.add("photo");
    modalHead.style.backgroundImage = `url("${image}")`;
  } else {
    modalHead.style.backgroundImage = "";
  }
  modalHead.innerHTML = headHTML +
    `<button class="modal-copy" id="modalCopy" title="نسخ رابط هذه الصفحة">🔗 نسخ الرابط</button>`;
  currentTabs = tabs;
  currentTab = 0;
  renderTab();
  backdrop.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  backdrop.classList.remove("show");
  document.body.style.overflow = "";
  if (!suppressHistoryClose && location.pathname !== "/") {
    history.pushState({}, "", "/");
  }
  suppressHistoryClose = false;
}
$("#modalClose").addEventListener("click", closeModal);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) return closeModal();
  if (e.target.closest("#modalCopy")) {
    navigator.clipboard.writeText(currentShareUrl || location.href)
      .then(() => showToast("تم نسخ رابط الصفحة 🔗")).catch(() => {});
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function renderTab() {
  const nav = `
    <nav class="tab-nav">
      ${currentTabs.map((t, i) =>
        `<button class="tab-btn ${i === currentTab ? "active" : ""}" data-tab="${i}">${t.label}</button>`
      ).join("")}
    </nav>`;
  modalBody.innerHTML = nav + `<div class="tab-content">${currentTabs[currentTab].html}</div>`;
}

modalBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (btn) { currentTab = +btn.dataset.tab; renderTab(); handleFactParam(); return; }
  const fl = e.target.closest(".fact-link");
  if (fl) {
    const path = currentShareUrl ? currentShareUrl.replace(location.origin, "") : "/";
    const url = `${location.origin}${path}?tab=${fl.dataset.tab}&fact=${fl.dataset.fact}`;
    navigator.clipboard.writeText(url).then(() => showToast("تم نسخ رابط المعلومة مع قسمها 🔗")).catch(() => {});
  }
});

/* ---------- توست التنبيهات ---------- */
function showToast(msg) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- محتوى نافذة المحافظة ---------- */
function listBlock(title, items, cls = "") {
  if (!items || !items.length) return "";
  return `<h4>${title}</h4><ul class="${cls}">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
}
function tagsBlock(title, items) {
  if (!items || !items.length) return "";
  return `<h4>${title}</h4><div class="tag-row">${items.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`;
}

function openGov(id) {
  const g = GOVERNORATES.find((x) => x.id === id);
  if (!g) return;
  currentItemId = g.id;
  currentShareUrl = location.origin + "/" + g.id;
  const S = g.sections || {};
  const head = `
    <span class="m-emoji">${g.icon}</span>
    <h3>${g.name}</h3><p class="m-en">${g.en}</p>
    <div class="m-chips">
      <span class="m-chip">🗺️ ${g.region}</span>
      <span class="m-chip">🏛️ العاصمة: ${g.capital}</span>
      <span class="m-chip">🧠 ${infoCount(g)} معلومة</span>
    </div>`;

  const overview = `
    ${g.stats ? `<div class="m-facts">${g.stats.map(([l, v]) => `<div class="m-fact"><span>${l}</span><b>${v}</b></div>`).join("")}</div>` : ""}
    <p>${g.desc}</p>
    ${g.etymology ? `<h4>📖 أصل الاسم</h4><p class="soft-p">${g.etymology}</p>` : ""}
    ${listBlock("🌍 الجغرافيا والمناخ", S.geography)}
    ${tagsBlock("🏷️ مشهورة بـ", g.famous)}
    ${extLinksHTML(g, g.capital)}`;

  const life = `
    ${listBlock("💰 الاقتصاد والصناعة", S.economy)}
    ${listBlock("🎓 التعليم", S.education)}
    ${listBlock("🏥 الصحة", S.health)}
    ${listBlock("⚽ الرياضة", S.sport)}
    ${listBlock("🎭 الثقافة والفنون", S.culture)}`;

  const culture2 = `
    ${tagsBlock("🍲 أشهر الأكلات", g.dishes)}
    ${tagsBlock("🧶 الحرف اليدوية", g.crafts)}
    ${listBlock("⭐ مشاهير وأعلام", g.people, "attractions-list")}`;

  const places = `
    ${listBlock("🏙️ المدن الرئيسية", g.cities, "attractions-list")}
    ${listBlock("🏘️ المراكز الإدارية", g.districts, "attractions-list")}
    ${(g.attractions || []).length ? `<h4>✨ المعالم والوجهات</h4><ul class="attractions-list">
      ${g.attractions.map(([n, d]) => `<li><b>${n}</b> — ${d}</li>`).join("")}</ul>` : ""}`;

  openModal(head, [
    { label: "نظرة عامة", html: overview },
    { label: "الحياة والاقتصاد", html: life },
    { label: "ثقافة ومشاهير", html: culture2 },
    { label: "مدن ومعالم", html: places },
    { label: `معلومات (${(g.facts || []).length})`, html:
      `<h4>📌 معلومات مرقمة عن ${g.name} — كل معلومة لها رابط مستقل 🔗</h4>` + factListHTML(g.facts, 4) }
  ], g.image);
  if (!suppressHistoryClose) history.pushState({ id: g.id }, "", "/" + g.id);
  else suppressHistoryClose = false;
}

/* ---------- محتوى نافذة المتحف / المعلم ---------- */
function openItem(id, kind) {
  const it = [...MUSEUMS, ...LANDMARKS].find((x) => x.id === id);
  if (!it) return;
  currentItemId = it.id;
  currentShareUrl = location.origin + "/" + it.id;
  const head = `
    <span class="m-emoji">${it.icon}</span>
    <h3>${it.name}</h3><p class="m-en">${kind} · 📍 ${it.city}</p>
    <div class="m-chips">
      ${it.unesco ? `<span class="m-chip">🌍 تراث عالمي لليونسكو</span>` : ""}
      <span class="m-chip">🧠 ${infoCount(it)} معلومة</span>
    </div>`;

  const facts = [
    it.est && `<div class="m-fact"><span>التأسيس / الافتتاح</span><b>${it.est}</b></div>`,
    it.era && `<div class="m-fact"><span>العصر / الفترة</span><b>${it.era}</b></div>`,
    it.pieces && `<div class="m-fact"><span>المقتنيات</span><b>${it.pieces}</b></div>`,
    it.type && `<div class="m-fact"><span>النوع</span><b>${it.type}</b></div>`
  ].filter(Boolean).join("");

  const overview = `
    ${facts ? `<div class="m-facts">${facts}</div>` : ""}
    <p>${it.desc}</p>
    ${it.visit ? `<div class="visit-box">
       <h4>🎟️ معلومات الزيارة</h4>
       <ul><li><b>التوقيت:</b> ${it.visit.hours}</li>
           <li><b>التذاكر:</b> ${it.visit.ticket}</li>
           <li><b>المدة المقترحة:</b> ${it.visit.duration}</li></ul></div>` : ""}
    ${(it.nearby || []).length ? `<h4>🧭 مواقع قريبة تُدمج معها</h4>
      <ul class="attractions-list">${it.nearby.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
    ${extLinksHTML(it, it.city)}`;

  const storyTab = `
    ${(it.timeline || []).length ? `<h4>🕰️ خط زمني</h4>
      <ul class="attractions-list">${it.timeline.map(([y, t]) => `<li><b>${y}</b> — ${t}</li>`).join("")}</ul>` : ""}
    ${(it.design || []).length ? `<h4>📐 من عمق التصميم</h4>
      <ul class="attractions-list">${it.design.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}
    ${!((it.timeline || []).length || (it.design || []).length) ? "<p>لا توجد تفاصيل إضافية مسجلة بعد.</p>" : ""}`;

  const tabs = [
    { label: "نظرة عامة", html: overview },
    { label: "أبرز المقتنيات", html:
      listBlock(`✨ ${it.pieces ? "أبرز المقتنيات والمعروضات" : "أبرز ما لا يُفوَّت"}`, it.highlights, "attractions-list") },
    { label: "نصائح الزيارة", html:
      listBlock("💡 نصائح عملية", it.tips, "attractions-list") }
  ];
  if ((it.timeline || []).length || (it.design || []).length) tabs.push({ label: "الخط الزمني والتصميم", html: storyTab });
  tabs.push({ label: `معلومات (${(it.facts || []).length})`, html:
      `<h4>📌 معلومات مرقمة — كل معلومة لها رابط مستقل 🔗</h4>` + factListHTML(it.facts, tabs.length) });

  openModal(head, tabs, it.image);
  if (!suppressHistoryClose) history.pushState({ id: it.id }, "", "/" + it.id);
  else suppressHistoryClose = false;
}

/* ---------- نافذة الأخبار ---------- */
function openNews(n) {
  currentItemId = "news/" + n.id;
  currentShareUrl = location.origin + "/news/" + n.id;
  const head = `
    <span class="m-emoji">${n.icon}</span>
    <h3 style="font-size:1.3rem">${n.title}</h3>
    <div class="m-chips"><span class="m-chip">🏷️ ${n.tag}</span><span class="m-chip">🗓️ ${n.date}</span></div>`;
  const body = `
    <p style="font-size:1rem; line-height:2">${n.excerpt}</p>
    <p class="soft-p">📰 هذا خبر نموذجي لأغراض العرض — اربطه بمصدر أخبار حقيقي (API أو CMS) في النسخة النهائية من تطبيقك.</p>`;
  openModal(head, [{ label: "تفاصيل الخبر", html: body }], null);
  if (!suppressHistoryClose) history.pushState({ id: n.id }, "", "/news/" + n.id);
  else suppressHistoryClose = false;
}

document.body.addEventListener("click", (e) => {
  const govEl = e.target.closest(".gov-card");
  if (govEl) return openGov(govEl.dataset.id);
  const itemEl = e.target.closest(".item-card");
  if (itemEl) {
    if (itemEl.closest("#museumGrid")) return openItem(itemEl.dataset.id, "متحف");
    return openItem(itemEl.dataset.id, "معلم سياحي");
  }
  const newsEl = e.target.closest(".news-card");
  if (newsEl) {
    const idx = [...newsList.children].indexOf(newsEl);
    const n = NEWS[idx];
    if (n) return openNews(n);
  }
});

$$("[data-goto]").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    $("#governorates").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => openGov(a.dataset.goto), 600);
  })
);

/* ---------- عدادات الإحصائيات ---------- */
function animateCounter(el, target, duration = 1400) {
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("ar-EG");
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function runStats() {
  $("#statMuseums").dataset.count = MUSEUMS.length;
  $("#statLandmarks").dataset.count = LANDMARKS.length;
  $("#statFacts").dataset.count = TOTAL_INFO;
  $$(".stat b").forEach((el) => animateCounter(el, +el.dataset.count));
}

/* ---------- أنيميشن الظهور ---------- */
const observer = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("visible"); observer.unobserve(en.target); }
  }), { threshold: 0.08 });

function observeReveals() {
  let i = 0;
  $$(".reveal:not(.visible)").forEach((el) => {
    el.style.setProperty("--d", i % 6);
    i++;
    observer.observe(el);
  });
}

/* ---------- شريط التنقل ---------- */
const navbar = $("#navbar");
const toTop = $("#toTop");
const progressBar = $("#progressBar");

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
  toTop.classList.toggle("show", window.scrollY > 500);
  const h = document.documentElement.scrollHeight - window.innerHeight;
  if (progressBar) progressBar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
}, { passive: true });
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

const navAnchors = $$(".nav-links a");
const spyObserver = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    navAnchors.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
navAnchors.forEach((a) => { const s = $(a.getAttribute("href")); if (s) spyObserver.observe(s); });

const menuBtn = $("#menuBtn");
const navLinks = $("#navLinks");
menuBtn.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.addEventListener("click", (e) => { if (e.target.tagName === "A") navLinks.classList.remove("open"); });

/* ---------- الوضع الليلي ---------- */
const themeBtn = $("#themeBtn");
if (localStorage.getItem("egypt-theme") === "dark") document.documentElement.classList.add("dark");
themeBtn.textContent = document.documentElement.classList.contains("dark") ? "☀️" : "🌙";
themeBtn.addEventListener("click", () => {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("egypt-theme", dark ? "dark" : "light");
  themeBtn.textContent = dark ? "☀️" : "🌙";
});

/* ---------- التشغيل ---------- */
buildChips();
buildLandTypeChips();
renderAll();
buildIndex();
applyFilters();
observeReveals();
handleRoute();
const heroObs = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) { runStats(); heroObs.disconnect(); }
}, { threshold: 0.3 });
heroObs.observe($("#home"));
