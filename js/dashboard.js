import { requireAuth, hydrateUserBadge } from "./auth.js";
import {
  getUserProfile,
  updateUserProfile,
  getFoods,
  getFoodLogsByDate,
  getBudgetRecordsByDate,
  addFoodLog,
} from "./db.js";
import {
  formatRupiah,
  toDateKey,
  clampNumber,
  showToast,
  setDateInputToday,
  sumBy,
} from "./utils.js";

const caloriesEl = document.getElementById("todayCalories");
const proteinEl = document.getElementById("todayProtein");
const carbsEl = document.getElementById("todayCarbs");
const fatEl = document.getElementById("todayFat");
const spendEl = document.getElementById("todaySpend");
const topupEl = document.getElementById("todayTopup");
const remainEl = document.getElementById("todayRemain");
const budgetEl = document.getElementById("dailyBudget");
const budgetHintEl = document.getElementById("budgetHint");
const budgetInput = document.getElementById("budgetInput");
const budgetSaveBtn = document.getElementById("budgetSaveBtn");
const recommendList = document.getElementById("recommendList");
const recommendEmpty = document.getElementById("recommendEmpty");

const quickForm = document.getElementById("quickAddForm");
const quickFoodSelect = document.getElementById("quickFoodSelect");
const quickServings = document.getElementById("quickServings");
const quickDate = document.getElementById("quickDate");
const quickNote = document.getElementById("quickAddNote");
const goalCalText = document.getElementById("goalCalText");
const goalProteinText = document.getElementById("goalProteinText");
const goalCarbsText = document.getElementById("goalCarbsText");
const goalFatText = document.getElementById("goalFatText");
const goalCalFill = document.getElementById("goalCalFill");
const goalProteinFill = document.getElementById("goalProteinFill");
const goalCarbsFill = document.getElementById("goalCarbsFill");
const goalFatFill = document.getElementById("goalFatFill");

let cachedFoods = [];
let currentUser = null;
let currentProfile = null;
const goalTargets = {
  calories: 2150,
  protein: 60,
  carbs: 325,
  fat: 67,
};

const mapUrlForFood = (foodName) => {
  const query = `${foodName} dekat Universitas Gunadarma Depok`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
};

const getFoodMapsUrl = (food) =>
  food.mapsUrl || mapUrlForFood(food.name || "");

const renderFoodsOptions = (foods) => {
  quickFoodSelect.innerHTML = "";
  foods.forEach((food) => {
    const opt = document.createElement("option");
    opt.value = food.id;
    opt.textContent = `${food.name} - ${formatRupiah(food.price)}`;
    quickFoodSelect.appendChild(opt);
  });
};

const updateQuickNote = () => {
  const selected = cachedFoods.find((f) => f.id === quickFoodSelect.value);
  if (!selected) return;
  quickNote.textContent = `Kalori ${selected.calories} kkal - Protein ${selected.protein} g`;
};

const renderRecommendations = (foods, remaining) => {
  recommendList.innerHTML = "";
  const list = foods
    .filter((food) => food.price <= remaining)
    .sort((a, b) => {
      if (b.protein !== a.protein) return b.protein - a.protein;
      return a.price - b.price;
    })
    .slice(0, 6);

  if (!list.length) {
    recommendEmpty.style.display = "block";
    return;
  }
  recommendEmpty.style.display = "none";

  list.forEach((food) => {
    const card = document.createElement("div");
    card.className = "card reveal";
    const imageHtml = food.imageUrl
      ? `<img src="${food.imageUrl}" alt="${food.name}" />`
      : "Foto";
    const mapsUrl = getFoodMapsUrl(food);
    card.innerHTML = `
      <div class="media">${imageHtml}</div>
      <h3>${food.name}</h3>
      <p>Kategori: ${food.category || "-"}</p>
      <div style="margin-top: 12px" class="pill">${formatRupiah(food.price)}</div>
      <div class="pill">Protein ${food.protein} g</div>
      <div class="form-actions" style="margin-top: 12px">
        <button class="btn btn-secondary" type="button" data-add="${food.id}">
          <i class="ri-add-line"></i>Tambah log
        </button>
        <a class="btn btn-ghost" href="${mapsUrl}" target="_blank" rel="noopener">Buka Google Maps</a>
      </div>
    `;
    recommendList.appendChild(card);
  });
};

const setGoalProgress = (value, target, textEl, fillEl, unit) => {
  if (!textEl || !fillEl) return;
  const safeValue = Math.max(0, Math.round(value || 0));
  const percent = target > 0 ? Math.min(100, (safeValue / target) * 100) : 0;
  textEl.textContent = `${safeValue}/${target} ${unit}`;
  fillEl.style.width = `${percent}%`;
};

const safeFetch = async (fn, fallback, label) => {
  try {
    return await fn();
  } catch (error) {
    console.error(error);
    if (label) {
      showToast(`Gagal memuat ${label}. Cek rules Firestore.`);
    }
    return fallback;
  }
};

const loadDashboard = async (user) => {
  const dateKey = toDateKey(new Date());
  const [profileRaw, foods, logs, budgetRecords] = await Promise.all([
    safeFetch(() => getUserProfile(user.uid), null, "profil"),
    safeFetch(() => getFoods(), [], "foods"),
    safeFetch(() => getFoodLogsByDate(user.uid, dateKey), [], "log makanan"),
    safeFetch(
      () => getBudgetRecordsByDate(user.uid, dateKey),
      [],
      "budget"
    ),
  ]);

  let profile = profileRaw;
  if (!profile) {
    await updateUserProfile(user.uid, {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      dailyBudget: 0,
    });
    profile = await getUserProfile(user.uid);
  }

  cachedFoods = foods;
  renderFoodsOptions(foods);
  updateQuickNote();

  const totals = {
    calories: sumBy(logs, (log) => log.totals?.calories),
    protein: sumBy(logs, (log) => log.totals?.protein),
    carbs: sumBy(logs, (log) => log.totals?.carbs),
    fat: sumBy(logs, (log) => log.totals?.fat),
    price: sumBy(logs, (log) => log.totals?.price),
  };

  currentProfile = profile || { dailyBudget: 0 };
  const dailyBudget = currentProfile.dailyBudget || 0;
  const topupToday = sumBy(
    budgetRecords.filter((r) => r.type === "topup"),
    (r) => r.amount
  );

  const remaining = dailyBudget - totals.price + topupToday;

  caloriesEl.textContent = `${Math.round(totals.calories)} kkal`;
  proteinEl.textContent = Math.round(totals.protein);
  carbsEl.textContent = `${Math.round(totals.carbs)} g`;
  fatEl.textContent = Math.round(totals.fat);
  spendEl.textContent = formatRupiah(totals.price);
  topupEl.textContent = formatRupiah(topupToday);
  remainEl.textContent = formatRupiah(remaining);
  budgetEl.textContent = formatRupiah(dailyBudget);
  if (budgetInput) {
    budgetInput.value = dailyBudget ? dailyBudget : "";
  }

  budgetHintEl.textContent =
    dailyBudget > 0
      ? "Rekomendasi makanan menyesuaikan sisa budget kamu."
      : "Atur budget harian di sini agar sisa budget bisa dihitung.";

  setGoalProgress(
    totals.calories,
    goalTargets.calories,
    goalCalText,
    goalCalFill,
    "kkal"
  );
  setGoalProgress(
    totals.protein,
    goalTargets.protein,
    goalProteinText,
    goalProteinFill,
    "g"
  );
  setGoalProgress(
    totals.carbs,
    goalTargets.carbs,
    goalCarbsText,
    goalCarbsFill,
    "g"
  );
  setGoalProgress(
    totals.fat,
    goalTargets.fat,
    goalFatText,
    goalFatFill,
    "g"
  );

  renderRecommendations(foods, remaining);
};

const init = async () => {
  currentUser = await requireAuth();
  await hydrateUserBadge(currentUser);
  setDateInputToday(quickDate);
  await loadDashboard(currentUser);

  quickFoodSelect.addEventListener("change", updateQuickNote);

  quickForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const food = cachedFoods.find((item) => item.id === quickFoodSelect.value);
    if (!food) return;
    const servings = clampNumber(quickServings.value, 0);
    if (!servings || servings <= 0) {
      showToast("Porsi harus lebih dari 0.");
      return;
    }
    const dateKey = toDateKey(quickDate.value);
    const totals = {
      calories: Math.round(food.calories * servings),
      protein: Math.round(food.protein * servings),
      carbs: Math.round(food.carbs * servings),
      fat: Math.round(food.fat * servings),
      price: Math.round(food.price * servings),
    };
    await addFoodLog(currentUser.uid, {
      foodId: food.id,
      foodName: food.name,
      servings,
      dateKey,
      totals,
    });
    showToast("Log makanan ditambahkan.");
    await loadDashboard(currentUser);
  });

  recommendList.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-add]");
    if (!btn) return;
    const food = cachedFoods.find((item) => item.id === btn.dataset.add);
    if (!food) return;
    const servingsRaw = window.prompt("Jumlah porsi?", "1");
    const servings = clampNumber(servingsRaw, 0);
    if (!servings || servings <= 0) {
      showToast("Porsi tidak valid.");
      return;
    }
    const dateKey = toDateKey(new Date());
    const totals = {
      calories: Math.round(food.calories * servings),
      protein: Math.round(food.protein * servings),
      carbs: Math.round(food.carbs * servings),
      fat: Math.round(food.fat * servings),
      price: Math.round(food.price * servings),
    };
    await addFoodLog(currentUser.uid, {
      foodId: food.id,
      foodName: food.name,
      servings,
      dateKey,
      totals,
    });
    showToast("Log makanan ditambahkan.");
    await loadDashboard(currentUser);
  });

  if (budgetSaveBtn) {
    budgetSaveBtn.addEventListener("click", async () => {
      if (!currentUser) return;
      const value = clampNumber(budgetInput.value, 0);
      if (value === null) {
        showToast("Budget harus berupa angka.");
        return;
      }
      try {
        await updateUserProfile(currentUser.uid, { dailyBudget: value });
        showToast("Budget harian disimpan.");
        await loadDashboard(currentUser);
      } catch (error) {
        showToast("Gagal menyimpan budget. Coba login ulang.");
      }
    });
  }
};

init();
