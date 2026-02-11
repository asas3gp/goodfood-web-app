import { requireAuth, hydrateUserBadge } from "./auth.js";
import {
  getFoodLogsByDate,
  updateFoodLog,
  deleteFoodLog,
} from "./db.js";
import {
  formatRupiah,
  toDateKey,
  setDateInputToday,
  sumBy,
  clampNumber,
  showToast,
} from "./utils.js";

const logDateFilter = document.getElementById("logDateFilter");
const tableBody = document.getElementById("logsTableBody");
const logsEmpty = document.getElementById("logsEmpty");

const sumCalories = document.getElementById("sumCalories");
const sumProtein = document.getElementById("sumProtein");
const sumSpend = document.getElementById("sumSpend");

const editModal = document.getElementById("editLogModal");
const editFoodName = document.getElementById("editFoodName");
const editLogForm = document.getElementById("editLogForm");
const editLogId = document.getElementById("editLogId");
const editServings = document.getElementById("editServings");
const editLogError = document.getElementById("editLogError");
const editCancel = document.getElementById("editCancel");

let currentUser = null;
let currentLogs = [];

const renderSummary = (logs) => {
  const calories = sumBy(logs, (log) => log.totals?.calories);
  const protein = sumBy(logs, (log) => log.totals?.protein);
  const spend = sumBy(logs, (log) => log.totals?.price);
  sumCalories.textContent = `${Math.round(calories)} kkal`;
  sumProtein.textContent = `${Math.round(protein)} g`;
  sumSpend.textContent = formatRupiah(spend);
};

const renderTable = (logs) => {
  tableBody.innerHTML = "";
  if (!logs.length) {
    logsEmpty.style.display = "block";
    return;
  }
  logsEmpty.style.display = "none";

  logs.forEach((log) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.foodName || "-"}</td>
      <td>${log.servings}</td>
      <td>${Math.round(log.totals?.calories || 0)} kkal</td>
      <td>${Math.round(log.totals?.protein || 0)} g</td>
      <td>${formatRupiah(log.totals?.price || 0)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost" data-edit="${log.id}">Edit</button>
          <button class="btn btn-danger" data-delete="${log.id}">Hapus</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  tableBody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      openEditModal(id);
    });
  });

  tableBody.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete");
      if (!confirm("Hapus log ini?")) return;
      await deleteFoodLog(id);
      showToast("Log dihapus.");
      await loadLogs();
    });
  });
};

const loadLogs = async () => {
  if (!currentUser) return;
  const dateKey = toDateKey(logDateFilter.value);
  currentLogs = await getFoodLogsByDate(currentUser.uid, dateKey);
  renderSummary(currentLogs);
  renderTable(currentLogs);
};

const openEditModal = (logId) => {
  const log = currentLogs.find((item) => item.id === logId);
  if (!log) return;
  editLogId.value = log.id;
  editFoodName.textContent = log.foodName || "Makanan";
  editServings.value = log.servings;
  editLogError.textContent = "";
  editModal.classList.add("is-open");
};

const closeEditModal = () => {
  editModal.classList.remove("is-open");
};

editCancel.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (event) => {
  if (event.target === editModal) closeEditModal();
});

editLogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  editLogError.textContent = "";
  const servings = clampNumber(editServings.value, 0);
  if (!servings || servings <= 0) {
    editLogError.textContent = "Porsi harus lebih dari 0.";
    return;
  }
  const log = currentLogs.find((item) => item.id === editLogId.value);
  if (!log) return;
  const baseServings = Number(log.servings) || 1;
  const totals = {
    calories: Math.round((log.totals?.calories || 0) / baseServings * servings),
    protein: Math.round((log.totals?.protein || 0) / baseServings * servings),
    carbs: Math.round((log.totals?.carbs || 0) / baseServings * servings),
    fat: Math.round((log.totals?.fat || 0) / baseServings * servings),
    price: Math.round((log.totals?.price || 0) / baseServings * servings),
  };
  await updateFoodLog(log.id, { servings, totals });
  showToast("Log diperbarui.");
  closeEditModal();
  await loadLogs();
});

const init = async () => {
  currentUser = await requireAuth();
  await hydrateUserBadge(currentUser);
  setDateInputToday(logDateFilter);
  await loadLogs();
  logDateFilter.addEventListener("change", loadLogs);
};

init();
