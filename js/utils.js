export const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return "Rp " + num.toLocaleString("id-ID");
};

export const toDateKey = (date = new Date()) => {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toMonthKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const clampNumber = (value, min = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(min, num);
};

export const sumBy = (items, getter) =>
  items.reduce((acc, item) => acc + (getter(item) || 0), 0);

export const showToast = (message) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
};

const ensureLoader = () => {
  let loader = document.getElementById("pageLoader");
  if (loader) return loader;
  loader = document.createElement("div");
  loader.id = "pageLoader";
  loader.className = "page-loader";
  loader.innerHTML = `
    <div class="loader-card">
      <div class="loader-spinner" aria-hidden="true"></div>
      <div class="loader-text">Memproses...</div>
    </div>
  `;
  document.body.appendChild(loader);
  return loader;
};

export const showPageLoader = (message = "Memproses...") => {
  const loader = ensureLoader();
  const text = loader.querySelector(".loader-text");
  if (text) text.textContent = message;
  loader.classList.add("is-visible");
};

export const hidePageLoader = () => {
  const loader = document.getElementById("pageLoader");
  if (loader) loader.classList.remove("is-visible");
};

export const confirmDialog = (message) => window.confirm(message);

export const setDateInputToday = (input) => {
  if (!input) return;
  input.value = toDateKey(new Date());
};

export const uniqueList = (arr) => Array.from(new Set(arr));
