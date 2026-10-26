/* =========================================================
   Etalase Produk
   Bagian 1: Fetch API (data produk)
   Bagian 2: Form ulasan (DOM dan Event Handling)
   ========================================================= */

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);

const formatUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const prettyCategory = (c) =>
  c.replace(/-/g, " ").replace(/^\w/, (ch) => ch.toUpperCase());

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let toastTimer;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* =========================================================
   BAGIAN 1: FETCH API
   ========================================================= */
const API_URL = "https://dummyjson.com/products?limit=0";
const PAGE_SIZE = 12;

const state = {
  products: [],
  category: "all",
  query: "",
  sort: "default",
  visible: PAGE_SIZE
};

const productsEl = $("products");
const stateEl = $("state");
const searchEl = $("search");
const sortEl = $("sort");
const chipsEl = $("chips");
const moreBtn = $("more-btn");
const resultInfo = $("result-info");
const productSelect = $("product");

/* --- Loading: tampilkan skeleton --- */
function showLoading() {
  productsEl.setAttribute("aria-busy", "true");
  stateEl.hidden = false;
  stateEl.className = "state info";
  stateEl.textContent = "Memuat data produk...";
  resultInfo.textContent = "Sedang menyiapkan katalog.";
  moreBtn.hidden = true;

  productsEl.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const sk = el("div", "skeleton");
    sk.setAttribute("aria-hidden", "true");
    const body = el("div", "s-body");
    body.append(el("div", "s-line w40"), el("div", "s-line"), el("div", "s-line w60"));
    sk.append(el("div", "s-img"), body);
    productsEl.appendChild(sk);
  }
}

/* --- Error: pesan jelas + tombol coba lagi --- */
function showError(message) {
  productsEl.setAttribute("aria-busy", "false");
  productsEl.innerHTML = "";
  moreBtn.hidden = true;
  resultInfo.textContent = "Produk tidak dapat ditampilkan.";

  stateEl.hidden = false;
  stateEl.className = "state error";
  stateEl.textContent = "";

  const text = el("div");
  text.append(el("strong", "", "Data produk gagal dimuat"), el("span", "", message));

  const retry = el("button", "btn btn-outline btn-sm", "Coba lagi");
  retry.type = "button";
  retry.addEventListener("click", loadProducts);

  stateEl.append(text, retry);
}

function hideState() {
  stateEl.hidden = true;
  stateEl.textContent = "";
  productsEl.setAttribute("aria-busy", "false");
}

/* --- Fetch data dari API --- */
async function loadProducts() {
  showLoading();
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error("Server mengembalikan status " + response.status + ".");
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.products)) {
      throw new Error("Format data dari API tidak sesuai.");
    }

    state.products = data.products;
    hideState();
    searchEl.disabled = false;
    sortEl.disabled = false;
    buildChips();
    fillProductSelect();
    renderProducts();
  } catch (err) {
    const offline = err instanceof TypeError;
    showError(offline ? "Periksa koneksi internet kamu, lalu coba lagi." : err.message);
  }
}

/* --- Filter, urutkan, lalu render ke DOM --- */
function getFiltered() {
  const q = state.query.trim().toLowerCase();
  let list = state.products.filter((p) => {
    const matchCat = state.category === "all" || p.category === state.category;
    const matchQuery = !q || p.title.toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  switch (state.sort) {
    case "price-asc":  list = [...list].sort((a, b) => a.price - b.price); break;
    case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
    case "rating":     list = [...list].sort((a, b) => b.rating - a.rating); break;
    case "name":       list = [...list].sort((a, b) => a.title.localeCompare(b.title)); break;
  }
  return list;
}

function renderProducts() {
  const list = getFiltered();
  const shown = list.slice(0, state.visible);

  productsEl.innerHTML = "";
  resultInfo.textContent = list.length + " produk ditemukan";

  if (list.length === 0) {
    productsEl.appendChild(el("p", "empty", "Tidak ada produk yang cocok. Coba kata kunci atau kategori lain."));
    moreBtn.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  shown.forEach((item) => fragment.appendChild(createCard(item)));
  productsEl.appendChild(fragment);

  moreBtn.hidden = shown.length >= list.length;
  moreBtn.textContent = "Tampilkan lebih banyak (" + (list.length - shown.length) + " lagi)";
}

function createCard(item) {
  const card = el("article", "card-product");

  if (item.discountPercentage >= 15) {
    card.appendChild(el("span", "badge-off", "Diskon " + Math.round(item.discountPercentage) + "%"));
  }

  const thumb = el("div", "thumb");
  const img = el("img");
  img.src = item.thumbnail;
  img.alt = item.title;
  img.loading = "lazy";
  thumb.appendChild(img);

  const body = el("div", "body");
  const title = el("h3");
  const titleBtn = el("button", "", item.title);
  titleBtn.type = "button";
  titleBtn.addEventListener("click", () => openDetail(item));
  title.appendChild(titleBtn);

  const meta = el("div", "meta");
  const rate = el("span", "rate");
  rate.append(el("span", "star", "★"), " " + item.rating.toFixed(1));
  meta.append(el("span", "price", formatUSD(item.price)), rate);

  body.append(el("p", "cat", prettyCategory(item.category)), title, meta);
  card.append(thumb, body);
  return card;
}

/* --- Chip kategori (dibuat dari data API) --- */
function buildChips() {
  chipsEl.innerHTML = "";
  const categories = ["all", ...new Set(state.products.map((p) => p.category))];
  categories.forEach((cat) => {
    const chip = el("button", "chip", cat === "all" ? "Semua" : prettyCategory(cat));
    chip.type = "button";
    chip.dataset.category = cat;
    chip.setAttribute("aria-pressed", cat === state.category ? "true" : "false");
    chipsEl.appendChild(chip);
  });
}

/* Event delegation untuk semua chip */
chipsEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.category = chip.dataset.category;
  state.visible = PAGE_SIZE;
  chipsEl.querySelectorAll(".chip").forEach((c) =>
    c.setAttribute("aria-pressed", c === chip ? "true" : "false")
  );
  renderProducts();
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  state.visible = PAGE_SIZE;
  renderProducts();
});

sortEl.addEventListener("change", () => {
  state.sort = sortEl.value;
  renderProducts();
});

moreBtn.addEventListener("click", () => {
  state.visible += PAGE_SIZE;
  renderProducts();
});

/* --- Detail produk (dialog) --- */
const dialog = $("detail");

function openDetail(item) {
  const body = $("detail-body");
  body.innerHTML = "";

  const imgWrap = el("div", "detail-img");
  const img = el("img");
  img.src = item.images && item.images[0] ? item.images[0] : item.thumbnail;
  img.alt = item.title;
  imgWrap.appendChild(img);

  const info = el("div", "detail-info");
  const title = el("h2", "", item.title);
  title.id = "detail-title";

  const facts = el("div", "facts");
  [
    "★ " + item.rating.toFixed(1),
    "Stok: " + item.stock,
    item.brand ? "Merek: " + item.brand : null
  ].filter(Boolean).forEach((f) => facts.appendChild(el("span", "fact", f)));

  const actions = el("div", "detail-actions");
  const reviewBtn = el("button", "btn btn-primary", "Tulis ulasan");
  reviewBtn.type = "button";
  reviewBtn.addEventListener("click", () => {
    dialog.close();
    productSelect.value = item.title;
    clearError("product");
    $("ulasan").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("name").focus({ preventScroll: true }), 500);
  });
  const closeBtn = el("button", "btn btn-ghost", "Tutup");
  closeBtn.type = "button";
  closeBtn.addEventListener("click", () => dialog.close());
  actions.append(reviewBtn, closeBtn);

  info.append(
    el("p", "cat", prettyCategory(item.category)),
    title,
    el("p", "price", formatUSD(item.price)),
    el("p", "desc", item.description),
    facts,
    actions
  );

  body.append(imgWrap, info);
  dialog.showModal();
}

$("detail-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close(); // klik di area gelap
});

/* --- Isi dropdown produk di form dari data API --- */
function fillProductSelect() {
  productSelect.innerHTML = "";
  const placeholder = el("option", "", "Pilih produk");
  placeholder.value = "";
  productSelect.appendChild(placeholder);

  [...state.products]
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach((p) => {
      const opt = el("option", "", p.title);
      opt.value = p.title;
      productSelect.appendChild(opt);
    });
  productSelect.disabled = false;
}

/* =========================================================
   BAGIAN 2: FORM ULASAN (DOM dan Event Handling)
   ========================================================= */
const form = $("review-form");
const nameEl = $("name");
const emailEl = $("email");
const messageEl = $("message");
const counterEl = $("counter");
const reviewsEl = $("reviews");
const emptyNote = $("reviews-empty");
const summaryEl = $("summary");
const navCount = $("nav-review-count");

const MAX_CHARS = 200;
const STORAGE_KEY = "etalase-reviews";
let reviews = [];

/* --- Aturan validasi --- */
const rules = {
  name: () => {
    const v = nameEl.value.trim();
    if (!v) return "Nama wajib diisi.";
    if (v.length < 3) return "Nama minimal 3 karakter.";
    if (!/^[\p{L}\s.'-]+$/u.test(v)) return "Nama hanya boleh berisi huruf.";
    return "";
  },
  email: () => {
    const v = emailEl.value.trim();
    if (!v) return "Email wajib diisi.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Format email belum benar, contoh: nama@email.com.";
    return "";
  },
  product: () => (productSelect.value ? "" : "Pilih produk yang ingin diulas."),
  rating: () => (form.querySelector('input[name="rating"]:checked') ? "" : "Beri rating dengan memilih bintang."),
  message: () => {
    const v = messageEl.value.trim();
    if (!v) return "Ulasan wajib diisi.";
    if (v.length < 10) return "Ulasan minimal 10 karakter (sekarang " + v.length + ").";
    return "";
  }
};

function fieldWrapper(id) {
  return id === "rating" ? $("rating-field") : $(id).closest(".field");
}

function clearError(id) {
  fieldWrapper(id).classList.remove("invalid");
  $(id + "-error").textContent = "";
}

function validateField(id) {
  const error = rules[id]();
  fieldWrapper(id).classList.toggle("invalid", error !== "");
  $(id + "-error").textContent = error;
  return error === "";
}

/* --- Event: blur dan input pada tiap kolom --- */
["name", "email", "product", "message"].forEach((id) => {
  const input = $(id);
  input.addEventListener("blur", () => validateField(id));
  input.addEventListener("input", () => {
    if (fieldWrapper(id).classList.contains("invalid")) validateField(id);
  });
});
productSelect.addEventListener("change", () => validateField("product"));
form.querySelectorAll('input[name="rating"]').forEach((r) =>
  r.addEventListener("change", () => validateField("rating"))
);

/* --- Event: input pada textarea (penghitung karakter) --- */
messageEl.addEventListener("input", () => {
  const len = messageEl.value.length;
  counterEl.textContent = len + " / " + MAX_CHARS;
  counterEl.classList.toggle("warn", len >= MAX_CHARS - 20);
});

/* --- Event: submit --- */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const ids = ["name", "email", "product", "rating", "message"];
  const results = ids.map(validateField);

  if (results.includes(false)) {
    const firstBad = ids[results.indexOf(false)];
    const target = firstBad === "rating" ? form.querySelector('input[name="rating"]') : $(firstBad);
    target.focus();
    showToast("Periksa kembali isian yang ditandai merah.");
    return;
  }

  const review = {
    id: Date.now(),
    name: nameEl.value.trim(),
    email: emailEl.value.trim(),
    product: productSelect.value,
    rating: Number(form.querySelector('input[name="rating"]:checked').value),
    message: messageEl.value.trim(),
    createdAt: new Date().toISOString()
  };

  reviews.unshift(review);
  saveReviews();
  renderReviews(review.id);
  resetForm();
  showToast("Terima kasih, " + review.name.split(" ")[0] + ". Ulasanmu sudah ditambahkan.");
});

/* --- Event: click tombol kosongkan --- */
$("reset-btn").addEventListener("click", resetForm);

function resetForm() {
  form.reset();
  counterEl.textContent = "0 / " + MAX_CHARS;
  counterEl.classList.remove("warn");
  ["name", "email", "product", "rating", "message"].forEach(clearError);
}

/* --- Tampilkan hasil secara dinamis --- */
function starsText(n) {
  const wrap = el("span", "stars-static");
  wrap.setAttribute("aria-label", "Rating " + n + " dari 5");
  wrap.append("★".repeat(n));
  wrap.appendChild(el("span", "off", "★".repeat(5 - n)));
  return wrap;
}

function timeLabel(iso) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function renderReviews(newId) {
  reviewsEl.innerHTML = "";
  emptyNote.hidden = reviews.length > 0;
  navCount.textContent = reviews.length;

  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    summaryEl.textContent = reviews.length + " ulasan, rata-rata " + avg.toFixed(1) + " dari 5";
  } else {
    summaryEl.textContent = "Belum ada ulasan";
  }

  reviews.forEach((r) => {
    const li = el("li", "review");
    li.dataset.id = r.id;
    if (r.id !== newId) li.style.animation = "none";

    const info = el("div");
    info.append(el("div", "who", r.name), el("div", "product-name", r.product));

    const del = el("button", "btn btn-danger-text", "Hapus");
    del.type = "button";
    del.dataset.id = r.id;
    del.setAttribute("aria-label", "Hapus ulasan dari " + r.name);
    const actions = el("div", "actions");
    actions.appendChild(del);

    const ratingRow = el("div");
    ratingRow.appendChild(starsText(r.rating));

    li.append(
      el("div", "avatar", r.name.charAt(0).toUpperCase()),
      info,
      actions,
      ratingRow,
      el("p", "text", r.message),
      el("p", "time", timeLabel(r.createdAt))
    );
    reviewsEl.appendChild(li);
  });
}

/* --- Event: click tombol hapus (event delegation) --- */
reviewsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  reviews = reviews.filter((r) => String(r.id) !== btn.dataset.id);
  saveReviews();
  renderReviews();
  showToast("Ulasan dihapus.");
});

/* --- Simpan ulasan di browser (opsional, aman bila gagal) --- */
function saveReviews() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews)); } catch (e) { /* abaikan */ }
}
function loadReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    reviews = raw ? JSON.parse(raw) : [];
  } catch (e) {
    reviews = [];
  }
}

/* ---------- Mulai ---------- */
loadReviews();
renderReviews();
loadProducts();