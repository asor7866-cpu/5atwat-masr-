/* ============================================================
   لوحة التحكم — تعديل البيانات + تصدير/استيراد
   ============================================================ */

const $ = (s) => document.querySelector(s);
const ARRAYS = { GOVERNORATES, MUSEUMS, LANDMARKS, NEWS };
const STORE_KEY = "egypt-data-overrides";
const PASS_KEY = "egypt-admin-pass";
let currentTab = "GOVERNORATES";
let currentId = null;

/* ---------- أدوات ---------- */
function toast(msg, gold) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (gold ? " gold" : "");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove("show"), 2600);
}

function saveOverrides() {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    GOVERNORATES: ARRAYS.GOVERNORATES,
    MUSEUMS: ARRAYS.MUSEUMS,
    LANDMARKS: ARRAYS.LANDMARKS,
    NEWS: ARRAYS.NEWS
  }));
}

function infoCount(item) {
  let n = 1;
  ["stats","timeline","people","dishes","crafts","cities","districts","attractions","facts","highlights","tips","design","nearby"].forEach((k) => {
    if (Array.isArray(item[k])) n += item[k].length;
  });
  if (item.sections) Object.values(item.sections).forEach((a) => { n += a.length; });
  if (item.visit) n += 3;
  return n;
}

/* ---------- مخططات الحقول ---------- */
const SCHEMAS = {
  GOVERNORATES: [
    { k: "name", t: "text", label: "الاسم" },
    { k: "en", t: "text", label: "بالإنجليزية" },
    { k: "icon", t: "text", label: "الأيقونة (إيموجي)" },
    { k: "capital", t: "text", label: "العاصمة" },
    { k: "region", t: "text", label: "المنطقة" },
    { k: "phone", t: "text", label: "كود الهاتف" },
    { k: "population", t: "text", label: "عدد السكان" },
    { k: "area", t: "text", label: "المساحة" },
    { k: "established", t: "text", label: "التأسيس" },
    { k: "color", t: "number", label: "لون البطاقة (0-7)" },
    { k: "desc", t: "area", label: "الوصف", full: true },
    { k: "etymology", t: "area", label: "أصل الاسم", full: true },
    { k: "famous", t: "lines", label: "مشهورة بـ", full: true },
    { k: "dishes", t: "lines", label: "الأكلات الشهيرة", full: true },
    { k: "crafts", t: "lines", label: "الحرف اليدوية", full: true },
    { k: "cities", t: "lines", label: "المدن", full: true },
    { k: "districts", t: "lines", label: "المراكز", full: true },
    { k: "people", t: "lines", label: "مشاهير", full: true },
    { k: "facts", t: "lines", label: "📌 المعلومات المرقمة", full: true, tall: true },
    { k: "timeline", t: "pairs", label: "الخط الزمني (السنة | الحدث)", full: true },
    { k: "attractions", t: "pairs", label: "المعالم (الاسم | الوصف)", full: true },
    { k: "stats", t: "pairs", label: "بطاقة الإحصائيات (العنوان | القيمة)", full: true },
    { k: "links", t: "json", label: "روابط مخصصة — JSON {‏official, booking‏}", full: true },
    { k: "sections", t: "json", label: "الأقسام (جغرافيا/اقتصاد/تعليم...) — JSON", full: true, tall: true }
  ],
  MUSEUMS: [
    { k: "name", t: "text", label: "الاسم" },
    { k: "icon", t: "text", label: "الأيقونة" },
    { k: "city", t: "text", label: "المدينة" },
    { k: "type", t: "text", label: "النوع" },
    { k: "est", t: "text", label: "التأسيس/الافتتاح" },
    { k: "pieces", t: "text", label: "المقتنيات" },
    { k: "color", t: "number", label: "اللون (0-7)" },
    { k: "desc", t: "area", label: "الوصف", full: true },
    { k: "highlights", t: "lines", label: "أبرز المقتنيات", full: true },
    { k: "tips", t: "lines", label: "نصائح الزيارة", full: true },
    { k: "facts", t: "lines", label: "📌 المعلومات المرقمة", full: true, tall: true },
    { k: "timeline", t: "pairs", label: "الخط الزمني (السنة | الحدث)", full: true },
    { k: "design", t: "lines", label: "من عمق التصميم", full: true },
    { k: "nearby", t: "lines", label: "مواقع قريبة", full: true },
    { k: "links", t: "json", label: "روابط مخصصة — JSON {‏official, booking‏}", full: true },
    { k: "visit", t: "json", label: "معلومات الزيارة — JSON {hours, ticket, duration}", full: true }
  ],
  LANDMARKS: [
    { k: "name", t: "text", label: "الاسم" },
    { k: "icon", t: "text", label: "الأيقونة" },
    { k: "city", t: "text", label: "المدينة/المحافظة" },
    { k: "type", t: "text", label: "النوع" },
    { k: "era", t: "text", label: "العصر/الفترة" },
    { k: "unesco", t: "bool", label: "تراث عالمي لليونسكو" },
    { k: "color", t: "number", label: "اللون (0-7)" },
    { k: "desc", t: "area", label: "الوصف", full: true },
    { k: "highlights", t: "lines", label: "أبرز المشاهدات", full: true },
    { k: "tips", t: "lines", label: "نصائح الزيارة", full: true },
    { k: "facts", t: "lines", label: "📌 المعلومات المرقمة", full: true, tall: true },
    { k: "timeline", t: "pairs", label: "الخط الزمني (السنة | الحدث)", full: true },
    { k: "design", t: "lines", label: "من عمق التصميم", full: true },
    { k: "nearby", t: "lines", label: "مواقع قريبة", full: true },
    { k: "links", t: "json", label: "روابط مخصصة — JSON {‏official, booking‏}", full: true },
    { k: "visit", t: "json", label: "معلومات الزيارة — JSON", full: true }
  ],
  NEWS: [
    { k: "title", t: "text", label: "عنوان الخبر", full: true },
    { k: "date", t: "text", label: "التاريخ" },
    { k: "tag", t: "text", label: "التصنيف" },
    { k: "icon", t: "text", label: "الأيقونة" },
    { k: "excerpt", t: "area", label: "نص الخبر", full: true }
  ]
};

/* ---------- بوابة الدخول ---------- */
function getPass() {
  try { return localStorage.getItem(PASS_KEY) || "admin123"; } catch (e) { return "admin123"; }
}

/* إظهار أي خطأ على الشاشة مباشرة للتشخيص */
function showGateError(msg) {
  let box = document.getElementById("gateError");
  if (!box) {
    box = document.createElement("div");
    box.id = "gateError";
    box.style.cssText = "background:#ffe9e9;color:#b00020;font-size:.75rem;padding:8px;border-radius:8px;margin-top:10px;word-break:break-all;text-align:right";
    $(".gate-card").appendChild(box);
  }
  box.textContent = msg;
}

function tryLogin() {
  try {
    const val = ($("#gatePass").value || "").trim();
    if (val === getPass().trim()) {
      sessionStorage.setItem("egypt-admin-in", "1");
      openAdmin();
    } else {
      toast("كلمة المرور خطأ — تأكد من الكيبورد إنجليزي ❌");
      $("#gatePass").value = "";
      $("#gatePass").focus();
    }
  } catch (err) {
    showGateError("خطأ: " + err.message);
  }
}

/* دخول طوارئ مباشر من الرابط: /admin.html?key=admin123 */
(function emergencyLogin() {
  try {
    const m = location.search.match(/[?&]key=(\w+)/);
    if (m && m[1] === "admin123") {
      sessionStorage.setItem("egypt-admin-in", "1");
    }
  } catch (e) {}
})();

try {
  $("#gateBtn").addEventListener("click", tryLogin);
  $("#gatePass").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

  $("#togglePass").addEventListener("click", () => {
    const inp = $("#gatePass");
    inp.type = inp.type === "password" ? "text" : "password";
  });

  $("#resetPass").addEventListener("click", () => {
    if (confirm("إعادة تعيين كلمة المرور إلى admin123؟")) {
      try { localStorage.removeItem(PASS_KEY); } catch (e) {}
      toast("تمت الإعادة التعيين — كلمة المرور الآن admin123 ✅", true);
      $("#gatePass").value = "";
      $("#gatePass").focus();
    }
  });
} catch (err) {
  showGateError("خطأ تحميل: " + err.message);
}

/* ---------- فتح مباشر بدون تسجيل دخول ---------- */
try { openAdmin(); }
catch (err) { showGateError("خطأ فتح اللوحة: " + err.message); }

function openAdmin() {
  try {
    $("#gate").hidden = true;
    $("#admin").hidden = false;
    renderCounts();
    renderList();
    renderEditor();
  } catch (err) {
    showGateError("خطأ تشغيل اللوحة: " + err.message);
  }
}

/* ---------- التابات ---------- */
$("#adminTabs").addEventListener("click", (e) => {
  const b = e.target.closest(".atab");
  if (!b) return;
  currentTab = b.dataset.t;
  currentId = null;
  $$(".atab").forEach((x) => x.classList.toggle("active", x === b));
  renderCounts();
  renderList();
  renderEditor();
});

function renderCounts() {
  const meta = [
    ["GOVERNORATES", "🗺️", "محافظة", 0],
    ["MUSEUMS", "🏛️", "متحف", 1],
    ["LANDMARKS", "🏺", "معلم", 2],
    ["NEWS", "📰", "خبر", 3]
  ];
  const stats = $("#adminStats");
  if (stats) {
    stats.innerHTML = meta.map(([k, ic, label, ci]) => `
      <div class="stat-card">
        <span class="sic g${ci}">${ic}</span>
        <div><b>${ARRAYS[k].length}</b><span>${label}</span></div>
      </div>`).join("");
  }
  Object.keys(ARRAYS).forEach((k) => {
    $("#c" + k).textContent = "(" + ARRAYS[k].length + ")";
  });
}

/* ---------- قائمة العناصر ---------- */
function nameOf(item) { return item.name || item.title || item.id; }
function iconOf(item) { return item.icon || "📄"; }

function renderList() {
  const arr = ARRAYS[currentTab];
  let html = `<button class="add-btn" id="btnAdd">➕ إضافة ${currentTab === "NEWS" ? "خبر" : "عنصر"} جديد</button>`;
  html += arr.map((it) => `
    <div class="ilist-item ${it.id === currentId ? "active" : ""}" data-id="${it.id}">
      <span class="ic">${iconOf(it)}</span>
      <span class="nm">${nameOf(it)}</span>
      <span class="ct">${currentTab === "NEWS" ? it.tag : infoCount(it) + " 🧠"}</span>
      <button class="del" data-del="${it.id}" title="حذف">🗑️</button>
    </div>`).join("");
  $("#itemList").innerHTML = html;
}

$("#itemList").addEventListener("click", (e) => {
  if (e.target.id === "btnAdd") return addNewItem();
  const del = e.target.closest("[data-del]");
  if (del) {
    e.stopPropagation();
    if (!confirm("متأكد من الحذف؟ (احفظ نسخة احتياطية الأول)")) return;
    const arr = ARRAYS[currentTab];
    const i = arr.findIndex((x) => x.id === del.dataset.del);
    if (i > -1) arr.splice(i, 1);
    saveOverrides();
    currentId = null;
    renderCounts(); renderList(); renderEditor();
    toast("تم الحذف 🗑️");
    return;
  }
  const row = e.target.closest(".ilist-item");
  if (row) { currentId = row.dataset.id; renderList(); renderEditor(); }
});

/* ---------- المحرر ---------- */
function findItem(id) { return ARRAYS[currentTab].find((x) => x.id === id); }

function fieldHTML(f, val) {
  const idAttr = "f_" + f.k;
  if (f.t === "text" || f.t === "number") {
    return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>
      <input type="${f.t}" id="${idAttr}" value="${String(val ?? "").replace(/"/g, "&quot;")}"></div>`;
  }
  if (f.t === "bool") {
    return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>
      <input type="checkbox" id="${idAttr}" ${val ? "checked" : ""}></div>`;
  }
  if (f.t === "area" || f.t === "lines" || f.t === "pairs") {
    let text = "";
    if (f.t === "area") text = val ?? "";
    if (f.t === "lines") text = (val || []).join("\n");
    if (f.t === "pairs") text = (val || []).map((p) => p.join(" | ")).join("\n");
    return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>
      <textarea id="${idAttr}" ${f.tall ? 'style="min-height:220px"' : ""}>${text}</textarea>
      ${f.t === "lines" ? '<div class="hint">كل سطر = معلومة واحدة</div>' : ""}
      ${f.t === "pairs" ? '<div class="hint">كل سطر: الجزء الأول | الجزء الثاني</div>' : ""}</div>`;
  }
  if (f.t === "json") {
    return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>
      <textarea id="${idAttr}" ${f.tall ? 'style="min-height:180px"' : ""}>${JSON.stringify(val ?? {}, null, 2)}</textarea>
      <div class="hint">لازم يكون JSON صحيح</div></div>`;
  }
  return "";
}

function readField(f) {
  const el = document.getElementById("f_" + f.k);
  if (!el) return undefined;
  if (f.t === "number") return +el.value || 0;
  if (f.t === "bool") return el.checked;
  if (f.t === "lines") return el.value.split("\n").map((s) => s.trim()).filter(Boolean);
  if (f.t === "pairs") return el.value.split("\n").map((s) => s.trim()).filter(Boolean).map((l) => l.split("|").map((p) => p.trim()));
  if (f.t === "json") { try { return JSON.parse(el.value || "{}"); } catch { throw new Error("JSON غير صحيح في: " + f.label); } }
  return el.value;
}

function renderEditor() {
  const item = currentId ? findItem(currentId) : null;
  if (!item) {
    $("#editor").innerHTML = `<div class="editor-empty"><div class="editor-empty-icon">👈</div><p>اختر عنصراً من القائمة للتعديل<br>أو أضف عنصراً جديداً</p></div>`;
    return;
  }
  const schema = SCHEMAS[currentTab];
  const linkPath = currentTab === "NEWS" ? "/news/" + item.id : "/" + item.id;
  $("#editor").innerHTML = `
    <div class="editor-head">
      <span class="big-ic">${iconOf(item)}</span>
      <div>
        <h2>${nameOf(item)}</h2>
        <div class="meta">🧠 ${infoCount(item)} معلومة · الرابط: <a href="${linkPath}" target="_blank" style="color:var(--gold-strong)">${linkPath}</a></div>
      </div>
    </div>
    <div class="fgrid">
      ${schema.map((f) => fieldHTML(f, item[f.k])).join("")}
    </div>
    <div class="editor-save-row">
      <button class="btn-save" id="btnSave">💾 حفظ التعديلات</button>
      <a class="btn-view" href="${linkPath}" target="_blank">👁️ معاينة</a>
    </div>`;

  $("#btnSave").addEventListener("click", () => {
    try {
      schema.forEach((f) => {
        const v = readField(f);
        if (v !== undefined) item[f.k] = v;
      });
      saveOverrides();
      renderList(); renderCounts();
      toast("تم الحفظ! ✅ التغييرات ظاهرة على جهازك — اصدّر data.js للنشر للجميع", true);
    } catch (err) {
      toast(err.message);
    }
  });
}

/* ---------- إضافة / حذف ---------- */
function addNewItem() {
  const id = prompt("معرّف الرابط (إنجليزي بدون مسافات) — مثال: port-fouad\nسيصبح الرابط: /المعرّف");
  if (!id) return;
  const clean = id.toLowerCase().trim().replace(/\s+/g, "-");
  if (ARRAYS[currentTab].some((x) => x.id === clean)) return toast("المعرّف موجود بالفعل!");
  let fresh;
  if (currentTab === "NEWS") {
    fresh = { id: Math.max(0, ...ARRAYS.NEWS.map((n) => n.id)) + 1, date: "اليوم", tag: "جديد", icon: "📰", title: "خبر جديد", excerpt: "" };
  } else {
    fresh = { id: clean, name: "عنصر جديد", icon: "📌", color: Math.floor(Math.random() * 8), desc: "", facts: [] };
    if (currentTab === "GOVERNORATES") Object.assign(fresh, { en: "", capital: "", region: "الصعيد", population: "", area: "", famous: [], attractions: [] });
    if (currentTab === "MUSEUMS") Object.assign(fresh, { city: "", type: "", est: "", highlights: [], visit: { hours: "", ticket: "", duration: "" } });
    if (currentTab === "LANDMARKS") Object.assign(fresh, { city: "", type: "", era: "", unesco: false, highlights: [] });
  }
  ARRAYS[currentTab].push(fresh);
  saveOverrides();
  currentId = fresh.id;
  renderCounts(); renderList(); renderEditor();
  toast("تمت الإضافة ✅");
}

/* ---------- تصدير / استيراد ---------- */
$("#btnExportJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ GOVERNORATES: ARRAYS.GOVERNORATES, MUSEUMS: ARRAYS.MUSEUMS, LANDMARKS: ARRAYS.LANDMARKS, NEWS: ARRAYS.NEWS }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "egypt-data-backup.json";
  a.click();
  toast("تم تنزيل النسخة الاحتياطية 💾", true);
});

$("#btnExportJs").addEventListener("click", () => {
  const wrap = (name, val) => `${name}.length = 0;\n${name}.push(...${JSON.stringify(val)});\n`;
  const js = "/* ملف بيانات مُصدَّر من لوحة التحكم — ضعه في js/data/custom.js وارفعه للموقع */\n" +
    wrap("GOVERNORATES", ARRAYS.GOVERNORATES) +
    wrap("MUSEUMS", ARRAYS.MUSEUMS) +
    wrap("LANDMARKS", ARRAYS.LANDMARKS) +
    wrap("NEWS", ARRAYS.NEWS);
  const blob = new Blob([js], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "custom.js";
  a.click();
  toast("نزّل custom.js — ابعته للمطور أو ارفعه في js/data/ واعمل Redeploy 📦", true);
});

$("#btnImport").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      Object.keys(ARRAYS).forEach((k) => {
        if (Array.isArray(d[k])) { ARRAYS[k].length = 0; ARRAYS[k].push(...d[k]); }
      });
      saveOverrides();
      renderCounts(); renderList(); renderEditor();
      toast("تم الاستيراد بنجاح ✅", true);
    } catch { toast("ملف غير صالح ❌"); }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ---------- كلمة المرور ---------- */
$("#btnPass").addEventListener("click", () => {
  const cur = prompt("كلمة المرور الحالية:");
  if (cur !== getPass()) return toast("خطأ ❌");
  const nw = prompt("كلمة المرور الجديدة (4 أحرف على الأقل):");
  if (!nw || nw.length < 4) return toast("قصيرة جداً ❌");
  localStorage.setItem(PASS_KEY, nw);
  toast("تم تغيير كلمة المرور 🔑", true);
});
