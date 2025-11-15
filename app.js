// app.js - Type 1 Diabetes Calculator

function $(id) {
  return document.getElementById(id);
}

// Global state
let mealItems = []; // per-meal logged foods
let templates = []; // saved per-serving templates

function loadState() {
  try {
    const t = localStorage.getItem("t1dTemplates");
    templates = t ? JSON.parse(t) : [];
  } catch (e) {
    templates = [];
  }

  const profile = localStorage.getItem("t1dProfileName") || "";
  $("profileName").value = profile;
}

function saveTemplates() {
  localStorage.setItem("t1dTemplates", JSON.stringify(templates));
}

function saveProfile() {
  const name = $("profileName").value.trim();
  localStorage.setItem("t1dProfileName", name);
}

// ===== Rendering helpers =====

function renderTemplates() {
  const tbody = $("templatesBody");
  tbody.innerHTML = "";
  templates.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(t.name)}</td>
      <td>${t.serving} / ${t.servingPieces || "n/a"} pcs</td>
      <td>${t.calories}</td>
      <td>${t.fat}</td>
      <td>${t.sodium}</td>
      <td>${t.carbs}</td>
      <td>${t.fiber}</td>
      <td>${t.sugar}</td>
      <td>${t.protein}</td>
    `;
    tbody.appendChild(tr);
  });
}

function refreshFoodNameDatalist() {
  const dl = $("foodNames");
  dl.innerHTML = "";
  const seen = new Set();
  templates.forEach(t => {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      const opt = document.createElement("option");
      opt.value = t.name;
      dl.appendChild(opt);
    }
  });
}

function renderMealTable() {
  const tbody = $("mealBody");
  tbody.innerHTML = "";

  mealItems.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.calories.toFixed(1)}</td>
      <td>${item.fat.toFixed(1)}</td>
      <td>${item.sodium.toFixed(1)}</td>
      <td>${item.carbs.toFixed(1)}</td>
      <td>${item.fiber.toFixed(1)}</td>
      <td>${item.sugar.toFixed(1)}</td>
      <td>${item.protein.toFixed(1)}</td>
      <td><button class="danger small" data-index="${idx}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Wire remove buttons
  tbody.querySelectorAll("button[data-index]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-index"), 10);
      if (!Number.isNaN(i)) {
        mealItems.splice(i, 1);
        renderAllMealViews();
      }
    });
  });
}

function getTotals() {
  return mealItems.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.fat += item.fat;
      acc.sodium += item.sodium;
      acc.carbs += item.carbs;
      acc.fiber += item.fiber;
      acc.sugar += item.sugar;
      acc.protein += item.protein;
      return acc;
    },
    {
      calories: 0,
      fat: 0,
      sodium: 0,
      carbs: 0,
      fiber: 0,
      sugar: 0,
      protein: 0
    }
  );
}

function renderSummaryAndResults() {
  const tbody = $("summaryBody");
  tbody.innerHTML = "";
  const totals = getTotals();

  mealItems.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.carbs.toFixed(1)}</td>
      <td>${item.fat.toFixed(1)}</td>
      <td>${item.protein.toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });

  $("totalCarbs").textContent = totals.carbs.toFixed(1) + " g";
  $("totalFat").textContent = totals.fat.toFixed(1) + " g";
  $("totalProtein").textContent = totals.protein.toFixed(1) + " g";

  updateGuidance(totals);
}

function renderAllMealViews() {
  renderMealTable();
  renderSummaryAndResults();
}

// ===== Guidance logic =====

function hasPizza() {
  return mealItems.some(item =>
    item.name.toLowerCase().includes("pizza")
  );
}

function classifyFoodType(mealType, totals) {
  const carbs = totals.carbs;
  const fat = totals.fat;
  const protein = totals.protein;
  const fiber = totals.fiber;

  if (hasPizza()) {
    return "High-Fat Pizza";
  }

  if ((mealType === "Fast Food" || mealType === "Restaurant") && fat >= 25) {
    return "High-Fat";
  }

  if (protein >= 25 && fat <= 20) {
    return "High-Protein";
  }

  if (carbs >= 40 && fiber >= 5) {
    return "Carbs with Fiber";
  }

  if (carbs >= 30 && fat <= 15) {
    return "Simple Carbs";
  }

  if (fat >= 25 && carbs <= 20) {
    return "Plant-based Fat";
  }

  if (carbs <= 15 && fat <= 10 && protein <= 10) {
    return "Low-Carb Veggies";
  }

  if (carbs <= 25 && fat <= 20) {
    return "Low-Carb";
  }

  return "Mixed Meal";
}

function computeGuidance(mealType, totals, foodType) {
  let prebolus = "0–5 min";
  let split = "100% upfront (no split)";
  let reason = "Balanced meal.";

  const carbs = totals.carbs;
  const fat = totals.fat;

  if (hasPizza()) {
    prebolus = "0–5 min";
    split = "45/55 over 2 hours";
    reason = "Pizza / very high fat. More insulin extended, but never past 2 hours.";
    return { prebolus, split, reason };
  }

  if ((mealType === "Fast Food" || mealType === "Restaurant") && fat >= 25) {
    prebolus = "0–5 min";
    split = "40/60 over 1 hour 30 min";
    reason =
      "High-fat meal from fast food / restaurant. Less upfront, more extended.";
    return { prebolus, split, reason };
  }

  if (foodType === "Simple Carbs") {
    prebolus = "0–2 min";
    split = "100% upfront (no split)";
    reason = "Mostly simple carbs with low fat.";
    return { prebolus, split, reason };
  }

  if (foodType === "Carbs with Fiber") {
    prebolus = "2–5 min";
    split = "70/30 over 1 hour";
    reason = "Carbs with fiber; moderate extension helps with delayed absorption.";
    return { prebolus, split, reason };
  }

  if (foodType === "High-Protein" || foodType === "High-Fat") {
    prebolus = "0–5 min";
    split = "40/60 over 1 hour 30 min";
    reason = "Higher protein or fat slows absorption. Favor more insulin later.";
    return { prebolus, split, reason };
  }

  if (foodType === "Low-Carb Veggies" || foodType === "Low-Carb") {
    prebolus = "0–2 min";
    split = "100% upfront (no split)";
    reason = "Low-carb meal. Little to no need for extended bolus.";
    return { prebolus, split, reason };
  }

  // Fallback
  if (fat >= 20) {
    prebolus = "0–5 min";
    split = "40/60 over 1 hour 30 min";
    reason = "Moderately high fat. Favor more insulin on the back end.";
  }

  return { prebolus, split, reason };
}

function updateGuidance(totals) {
  const preSpan = $("prebolusText");
  const splitSpan = $("splitText");
  const foodSpan = $("foodTypeText");
  const reasonSpan = $("reasonText");

  if (!mealItems.length) {
    preSpan.textContent = "--";
    splitSpan.textContent = "--";
    foodSpan.textContent = "--";
    reasonSpan.textContent = "--";
    return;
  }

  const mealType = $("mealType").value || "Home Meal";

  const foodType = classifyFoodType(mealType, totals);
  const guidance = computeGuidance(mealType, totals, foodType);

  preSpan.textContent = guidance.prebolus;
  splitSpan.textContent = guidance.split;
  foodSpan.textContent = foodType;
  reasonSpan.textContent = guidance.reason;
}

// ===== Event handlers =====

function addItem() {
  const name = $("foodName").value.trim();
  const servingSize = parseFloat($("servingSize").value);
  const servingPieces = parseFloat($("servingPieces").value) || 0;

  const labelCalories = parseFloat($("labelCalories").value);
  const labelFat = parseFloat($("labelFat").value);
  const labelSodium = parseFloat($("labelSodium").value);
  const labelCarbs = parseFloat($("labelCarbs").value);
  const labelFiber = parseFloat($("labelFiber").value);
  const labelSugar = parseFloat($("labelSugar").value);
  const labelProtein = parseFloat($("labelProtein").value);

  const haveGrams = parseFloat($("haveGrams").value);
  const havePieces = parseFloat($("havePieces").value);

  if (!name) {
    alert("Please enter a food name.");
    return;
  }

  if (!servingSize || !isFinite(servingSize)) {
    alert("Please enter a serving size (g or mL) from the label.");
    return;
  }

  if (!labelCarbs && !labelFat && !labelProtein && !labelCalories) {
    alert("Please enter at least some nutrition values from the label.");
    return;
  }

  let factor = 0;

  if (haveGrams && isFinite(haveGrams)) {
    factor = haveGrams / servingSize;
  } else if (havePieces && servingPieces && isFinite(havePieces) && isFinite(servingPieces)) {
    factor = havePieces / servingPieces;
  } else {
    alert("Enter either grams (or mL) eaten or number of pieces.");
    return;
  }

  const item = {
    name,
    calories: labelCalories * factor || 0,
    fat: labelFat * factor || 0,
    sodium: labelSodium * factor || 0,
    carbs: labelCarbs * factor || 0,
    fiber: labelFiber * factor || 0,
    sugar: labelSugar * factor || 0,
    protein: labelProtein * factor || 0
  };

  mealItems.push(item);

  // Clear consumed fields only (keep label for fast repeats)
  $("haveGrams").value = "";
  $("havePieces").value = "";

  renderAllMealViews();
}

function saveMealToHistoryAndClear() {
  const name = $("foodName").value.trim();
  const servingSize = $("servingSize").value.trim();
  const servingPieces = $("servingPieces").value.trim();
  const labelCalories = $("labelCalories").value.trim();
  const labelFat = $("labelFat").value.trim();
  const labelSodium = $("labelSodium").value.trim();
  const labelCarbs = $("labelCarbs").value.trim();
  const labelFiber = $("labelFiber").value.trim();
  const labelSugar = $("labelSugar").value.trim();
  const labelProtein = $("labelProtein").value.trim();

  if (name && servingSize) {
    templates.push({
      name,
      serving: servingSize,
      servingPieces,
      calories: labelCalories || "0",
      fat: labelFat || "0",
      sodium: labelSodium || "0",
      carbs: labelCarbs || "0",
      fiber: labelFiber || "0",
      sugar: labelSugar || "0",
      protein: labelProtein || "0"
    });
    saveTemplates();
    renderTemplates();
    refreshFoodNameDatalist();
  }

  mealItems = [];
  renderAllMealViews();
}

function clearHistory() {
  if (!confirm("Clear all saved food templates?")) return;
  templates = [];
  saveTemplates();
  renderTemplates();
  refreshFoodNameDatalist();
}

function switchTab(which) {
  const current = $("currentView");
  const history = $("historyView");
  const tabCurrent = $("tabcurrent");
  const tabHistory = $("tabhistory");

  if (which === "history") {
    current.style.display = "none";
    history.style.display = "block";
    tabCurrent.classList.remove("active");
    tabHistory.classList.add("active");
  } else {
    current.style.display = "block";
    history.style.display = "none";
    tabHistory.classList.remove("active");
    tabCurrent.classList.add("active");
  }
}

// Simple HTML escape
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>'"]/g, c => {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[c] || c
    );
  });
}

// ===== Init =====

function init() {
  loadState();
  renderTemplates();
  refreshFoodNameDatalist();
  renderAllMealViews();

  $("profileName").addEventListener("input", saveProfile);

  $("addBtn").addEventListener("click", addItem);
  $("saveMeal").addEventListener("click", saveMealToHistoryAndClear);
  $("clearHistory").addEventListener("click", clearHistory);

  $("tabcurrent").addEventListener("click", () => switchTab("current"));
  $("tabhistory").addEventListener("click", () => switchTab("history"));

  // Recompute guidance if meal type changes
  $("mealType").addEventListener("change", () => renderSummaryAndResults());
}

// Handle cases where DOMContentLoaded already fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
