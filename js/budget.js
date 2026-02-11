import { requireAuth, hydrateUserBadge } from "./auth.js";
import {
  addBudgetRecord,
  getBudgetRecordsByUser,
} from "./db.js";
import {
  formatRupiah,
  toDateKey,
  setDateInputToday,
  clampNumber,
  sumBy,
  showToast,
} from "./utils.js";

const budgetForm = document.getElementById("budgetForm");
const budgetType = document.getElementById("budgetType");
const budgetAmount = document.getElementById("budgetAmount");
const budgetDate = document.getElementById("budgetDate");
const budgetNote = document.getElementById("budgetNote");
const budgetError = document.getElementById("budgetError");

const todayExpense = document.getElementById("todayExpense");
const todayTopup = document.getElementById("todayTopup");
const monthExpense = document.getElementById("monthExpense");
const monthTopup = document.getElementById("monthTopup");

const budgetList = document.getElementById("budgetList");
const budgetEmpty = document.getElementById("budgetEmpty");

let currentUser = null;
let cachedRecords = [];

const renderSummary = (records, dateKey) => {
  const todayRecords = records.filter((r) => r.dateKey === dateKey);
  const monthKey = dateKey.slice(0, 7);
  const monthRecords = records.filter((r) => r.dateKey.startsWith(monthKey));

  const todayExpenseSum = sumBy(
    todayRecords.filter((r) => r.type === "expense"),
    (r) => r.amount
  );
  const todayTopupSum = sumBy(
    todayRecords.filter((r) => r.type === "topup"),
    (r) => r.amount
  );
  const monthExpenseSum = sumBy(
    monthRecords.filter((r) => r.type === "expense"),
    (r) => r.amount
  );
  const monthTopupSum = sumBy(
    monthRecords.filter((r) => r.type === "topup"),
    (r) => r.amount
  );

  todayExpense.textContent = formatRupiah(todayExpenseSum);
  todayTopup.textContent = formatRupiah(todayTopupSum);
  monthExpense.textContent = formatRupiah(monthExpenseSum);
  monthTopup.textContent = formatRupiah(monthTopupSum);
};

const renderList = (records) => {
  budgetList.innerHTML = "";
  if (!records.length) {
    budgetEmpty.style.display = "block";
    return;
  }
  budgetEmpty.style.display = "none";

  records
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
    .slice(0, 20)
    .forEach((rec) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${rec.dateKey}</td>
        <td>${rec.type === "topup" ? "Topup" : "Pengeluaran"}</td>
        <td>${formatRupiah(rec.amount)}</td>
        <td>${rec.note || "-"}</td>
      `;
      budgetList.appendChild(row);
    });
};

const loadRecords = async () => {
  if (!currentUser) return;
  cachedRecords = await getBudgetRecordsByUser(currentUser.uid);
  const todayKey = toDateKey(new Date());
  renderSummary(cachedRecords, todayKey);
  renderList(cachedRecords);
};

budgetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  budgetError.textContent = "";
  const selectedType = document.querySelector(
    'input[name="budgetType"]:checked'
  );
  const typeValue = selectedType ? selectedType.value : "expense";
  const amount = clampNumber(budgetAmount.value, 0);
  if (!amount || amount <= 0) {
    budgetError.textContent = "Nominal harus lebih dari 0.";
    return;
  }
  const record = {
    type: typeValue,
    amount,
    dateKey: toDateKey(budgetDate.value),
    note: budgetNote.value.trim(),
  };
  await addBudgetRecord(currentUser.uid, record);
  showToast("Transaksi tersimpan.");
  budgetAmount.value = "";
  budgetNote.value = "";
  await loadRecords();
});

const init = async () => {
  currentUser = await requireAuth();
  await hydrateUserBadge(currentUser);
  setDateInputToday(budgetDate);
  await loadRecords();
};

init();
