import { requireAuth, hydrateUserBadge } from "./auth.js";
import { getRestaurants, getRestaurantMenus, getFoods } from "./db.js";
import { formatRupiah, uniqueList } from "./utils.js";

const restaurantList = document.getElementById("restaurantList");
const restaurantEmpty = document.getElementById("restaurantEmpty");
const restaurantSearch = document.getElementById("restaurantSearch");
const restaurantArea = document.getElementById("restaurantArea");
const restaurantSort = document.getElementById("restaurantSort");

let restaurants = [];
let menus = [];
let foodsMap = {};

const renderAreaOptions = (items) => {
  const areas = uniqueList(items.map((r) => r.area).filter(Boolean));
  restaurantArea.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "Semua area";
  restaurantArea.appendChild(allOpt);
  areas.forEach((area) => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    restaurantArea.appendChild(opt);
  });
};

const buildMenuMap = () => {
  const map = {};
  menus.forEach((menu) => {
    if (!map[menu.restaurantId]) map[menu.restaurantId] = [];
    const food = foodsMap[menu.foodId];
    if (!food) return;
    map[menu.restaurantId].push({
      name: food.name,
      price: menu.priceOverride || food.price,
    });
  });
  return map;
};

const renderRestaurants = (items) => {
  restaurantList.innerHTML = "";
  if (!items.length) {
    restaurantEmpty.style.display = "block";
    return;
  }
  restaurantEmpty.style.display = "none";

  const menuMap = buildMenuMap();

  items.forEach((r) => {
    const distanceLabel = r.distanceKm
      ? `${r.distanceKm} km`
      : "Jarak belum tersedia";
    const card = document.createElement("div");
    card.className = "card reveal";
    const menuItems = (menuMap[r.id] || []).slice(0, 3);
    const menuHtml = menuItems.length
      ? menuItems
          .map((m) => `<li>${m.name} - ${formatRupiah(m.price)}</li>`)
          .join("")
      : "<li>Tidak ada menu terdaftar</li>";
    const mapsUrl =
      r.mapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${r.name} Gunadarma Depok`
      )}`;

    card.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: flex-start">
        <div class="media-square">
          ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${r.name}" />` : "Foto"}
        </div>
        <div style="flex: 1">
          <h3 style="margin-top: 0">${r.name}</h3>
          <p>${r.area || "-"}</p>
          <div class="pill">${distanceLabel}</div>
          <div class="pill">Rating ${r.rating}</div>
          <div class="pill">Rata-rata ${formatRupiah(r.avgPrice)}</div>
          <div class="form-actions" style="margin-top: 12px">
            <a class="btn btn-ghost" href="${mapsUrl}" target="_blank" rel="noopener">Buka Google Maps</a>
          </div>
        </div>
      </div>
      <div style="margin-top: 12px">
        <strong>Menu populer</strong>
        <ul style="padding-left: 18px; margin-top: 8px">${menuHtml}</ul>
      </div>
    `;
    restaurantList.appendChild(card);
  });
};

const applyFilters = () => {
  const keyword = restaurantSearch.value.trim().toLowerCase();
  const area = restaurantArea.value;
  let list = restaurants.filter((r) => {
    const matchesName = r.name.toLowerCase().includes(keyword);
    const matchesArea = area === "all" || r.area === area;
    return matchesName && matchesArea;
  });

  const sortValue = restaurantSort.value;
  list = list.sort((a, b) => {
    if (sortValue === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortValue === "price") return (a.avgPrice || 0) - (b.avgPrice || 0);
    return (a.distanceKm || 0) - (b.distanceKm || 0);
  });

  renderRestaurants(list);
};

const init = async () => {
  const user = await requireAuth();
  await hydrateUserBadge(user);
  const [foods, restaurantData, menuData] = await Promise.all([
    getFoods(),
    getRestaurants(),
    getRestaurantMenus(),
  ]);
  foodsMap = foods.reduce((acc, food) => {
    acc[food.id] = food;
    return acc;
  }, {});
  restaurants = restaurantData;
  menus = menuData;
  renderAreaOptions(restaurants);
  applyFilters();

  restaurantSearch.addEventListener("input", applyFilters);
  restaurantArea.addEventListener("change", applyFilters);
  restaurantSort.addEventListener("change", applyFilters);
};

init();
