import { requireAuth, hydrateUserBadge } from "./auth.js";
import { getFoods, addFoodLog } from "./db.js";
import {
  formatRupiah,
  toDateKey,
  clampNumber,
  showToast,
  setDateInputToday,
  uniqueList,
} from "./utils.js";

const foodList = document.getElementById("foodList");
const foodEmpty = document.getElementById("foodEmpty");
const foodSearch = document.getElementById("foodSearch");
const foodCategory = document.getElementById("foodCategory");

const modal = document.getElementById("addLogModal");
const modalFoodName = document.getElementById("modalFoodName");
const modalFoodPrice = document.getElementById("modalFoodPrice");
const modalMapsLink = document.getElementById("modalMapsLink");
const addLogForm = document.getElementById("addLogForm");
const logDate = document.getElementById("logDate");
const logServings = document.getElementById("logServings");
const logError = document.getElementById("logError");
const logCancel = document.getElementById("logCancel");

let cachedFoods = [];
let selectedFood = null;
let currentUser = null;

const mapUrlForFood = (foodName) => {
  const query = `${foodName} dekat Universitas Gunadarma Depok`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
};

const getFoodMapsUrl = (food) =>
  food.mapsUrl || mapUrlForFood(food.name || "");

const renderFoodList = (foods) => {
  foodList.innerHTML = "";
  if (!foods.length) {
    foodEmpty.style.display = "block";
    return;
  }
  foodEmpty.style.display = "none";

  foods.forEach((food) => {
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
      <div style="margin-top: 10px" class="pill">Kalori ${food.calories} kkal</div>
      <div class="pill">Protein ${food.protein} g</div>
      <div class="pill">Karbo ${food.carbs} g</div>
      <div class="pill">Lemak ${food.fat} g</div>
      <div style="margin-top: 12px" class="pill">${formatRupiah(food.price)}</div>
      <div class="form-actions" style="margin-top: 16px">
        <button class="btn btn-secondary" data-add="${food.id}">Tambah ke log</button>
        <a class="btn btn-ghost" href="${mapsUrl}" target="_blank" rel="noopener">Buka Google Maps</a>
      </div>
    `;
    foodList.appendChild(card);
  });

  foodList.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-add");
      openModal(id);
    });
  });
};

const renderCategoryOptions = (foods) => {
  const categories = uniqueList(foods.map((f) => f.category).filter(Boolean));
  foodCategory.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "Semua";
  foodCategory.appendChild(allOpt);
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    foodCategory.appendChild(opt);
  });
};

const applyFilters = () => {
  const keyword = foodSearch.value.trim().toLowerCase();
  const category = foodCategory.value;
  const list = cachedFoods.filter((food) => {
    const matchesName = food.name.toLowerCase().includes(keyword);
    const matchesCategory = category === "all" || food.category === category;
    return matchesName && matchesCategory;
  });
  renderFoodList(list);
};

const openModal = (foodId) => {
  selectedFood = cachedFoods.find((f) => f.id === foodId);
  if (!selectedFood) return;
  modalFoodName.textContent = selectedFood.name;
  modalFoodPrice.textContent = `Harga: ${formatRupiah(selectedFood.price)}`;
  if (modalMapsLink) {
    modalMapsLink.href = getFoodMapsUrl(selectedFood);
  }
  logServings.value = 1;
  logError.textContent = "";
  setDateInputToday(logDate);
  modal.classList.add("is-open");
};

const closeModal = () => {
  modal.classList.remove("is-open");
};

const init = async () => {
  currentUser = await requireAuth();
  await hydrateUserBadge(currentUser);
  cachedFoods = await getFoods();
  renderCategoryOptions(cachedFoods);
  renderFoodList(cachedFoods);
  applyFilters();
};

foodSearch.addEventListener("input", applyFilters);
foodCategory.addEventListener("change", applyFilters);
logCancel.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

addLogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedFood || !currentUser) return;
  logError.textContent = "";
  const servings = clampNumber(logServings.value, 0);
  if (!servings || servings <= 0) {
    logError.textContent = "Porsi harus lebih dari 0.";
    return;
  }
  const dateKey = toDateKey(logDate.value);
  const totals = {
    calories: Math.round(selectedFood.calories * servings),
    protein: Math.round(selectedFood.protein * servings),
    carbs: Math.round(selectedFood.carbs * servings),
    fat: Math.round(selectedFood.fat * servings),
    price: Math.round(selectedFood.price * servings),
  };
  await addFoodLog(currentUser.uid, {
    foodId: selectedFood.id,
    foodName: selectedFood.name,
    servings,
    dateKey,
    totals,
  });
  showToast("Log makanan tersimpan.");
  closeModal();
});

init();
