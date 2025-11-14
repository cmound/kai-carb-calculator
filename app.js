// app.js - Type 1 Diabetes Calculator

// ---------- helpers ----------

function $(id) {
  return document.getElementById(id);
}

function toNum(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// Storage keys
const TEMPLATES_KEY = "t1dTemplates";
const PROFILE_KEY = "t1dProfileName";

let templates = [];
let mealItems = [];

// ---------- templates and history ----------

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    templates = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error loading templates", e);
    templates = [];
  }
}

function saveTemplates() {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error("Error saving templates", e);
  }
}

function getProfileName() {
  const val = $("profileName").value.trim();
  if (!val) {
    return "default";
  }
  return val;
}

function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) {
    $("profileName").value = raw;
  }
}

function saveProfile() {
  const name = $("profileName").value.trim();
  localStorage.setItem(PROFILE_KEY, name);
}

// Build the datalist of known foods for the current profile
function refreshFoodNameDatalist() {
  const dl = $("foodNames");
  dl.innerHTML = "";
  const profile = getProfileName();

  const seen = new Set();
  templates.forEach(t => {
    if (t.profile === profile) {
      if (!seen.has(t.name)) {
        const opt = document.createElement("option");
        opt.value = t.name;
        dl.appendChild(opt);
        seen.add(t.name);
      }
    }
  });
}

// Autofill label fields from templates when food name matches
function tryAutofillFromHistory() {
  const name = $("foodName").value.trim();
  if (!name) return;

  const profile = getProfileName();
  const match = templates.find(
    t => t.profile === profile && t.name.toLowerCase() === name.toLowerCase()
  );

  if (!match) return;

  $("mealType").value = match.mealType || "Home Meal";
  $("servingSize").value = match.servingSize || "";
  $("servingPieces").value = match.servingPieces || "";
  $("labelCalories").value = match.caloriesPer || "";
  $("labelFat").value = match.fatPer || "";
  $("labelSodium").value = match.sodiumPer || "";
  $("labelCarbs").value = match.carbsPer || "";
  $("labelFiber").value = match.fiberPer || "";
  $("labelSugar").value = match.sugarPer || "";
  $("labelProtein").value = match.proteinPer || "";
}

// Render history tab
function renderTemplates() {
  const body = $("templateBody");
  body.innerHTML = "";

  const profile = getProfileName();

  templates
    .filter(t => t.profile === profile)
    .forEach(t => {
      const tr = document.createElement("tr");

      const servingText =
        t.servingPieces && t.servingPieces > 0
          ? `${t.servingSize} / ${t.servingPieces} pcs`
          : `${t.servingSize}`;

      tr.innerHTML = `
        <td>${escapeHtml(t.name)}</td>
        <td>${servingText}</td>
        <td>${t.caloriesPer.toFixed(1)}</td>
        <td>${t.fatPer.toFixed(1)}</td>
        <td>${t.sodiumPer.toFixed(1)}</td>
        <td>${t.carbsPer.toFixed(1)}</td>
        <td>${t.fiberPer.toFixed(1)}</td>
        <td>${t.sugarPer.toFixed(1)}</td>
        <td>${t.proteinPer.toFixed(1)}</td>
      `;
      body.appendChild(tr);
    });
}

// ---------- meal items (current meal) ----------

function addItem() {
  const name = $("foodName").value.trim();
  const profile = getProfileName();
  const mealType = $("mealType").value || "Home Meal";

  const servingSize = toNum($("servingSize").value);
  const servingPieces = toNum($("servingPieces").value);

  const calPer = toNum($("labelCalories").value);
  const fatPer = toNum($("labelFat").value);
  const sodiumPer = toNum($("labelSodium").value);
  const carbsPer = toNum($("labelCarbs").value);
  const fiberPer = toNum($("labelFiber").value);
  const sugarPer = toNum($("labelSugar").value);
  const proteinPer = toNum($("labelProtein").value);

  const amountGrams = toNum($("amountEaten").value);
  const amountPieces = toNum($("amountPieces").value);

  if (!name) {
    alert("Please enter a food name.");
    return;
  }

  if (!servingSize && !servingPieces) {
    alert("Please enter a serving size (grams or mL) and optionally pieces.");
    return;
  }

  if (!amountGrams && !amountPieces) {
    alert("Please enter how much was eaten (grams or pieces).");
    return;
  }

  // Decide factor based on amount eaten
  let factor = 0;
  if (amountGrams && servingSize) {
    factor = amountGrams / servingSize;
  } else if (amountPieces && servingPieces) {
    factor = amountPieces / servingPieces;
  } else if (amountGrams && !servingSize) {
    alert("To use grams, please enter serving size in grams.");
    return;
  } else if (amountPieces && !servingPieces) {
    alert("To use pieces, please enter how many pieces are in one serving.");
    return;
  }

  if (!factor || factor <= 0) {
    alert("Amount eaten must be greater than zero.");
    return;
  }

  // Portion macros
  const portion = {
    name,
    profile,
    mealType,
    calories: calPer * factor,
    fat: fatPer * factor,
    sodium: sodiumPer * factor,
    carbs: carbsPer * factor,
    fiber: fiberPer * factor,
    sugar: sugarPer * factor,
    protein: proteinPer * factor,
    factor,
    grams: amountGrams,
    pieces: amountPieces,
    template: {
      profile,
      name,
      mealType,
      servingSize,
      servingPieces,
      caloriesPer: calPer,
      fatPer,
      sodiumPer,
      carbsPer,
      fiberPer,
      sugarPer,
      proteinPer
    }
  };

  mealItems.push(portion);
  renderMeal();
  renderSummary();
  resetStep1And2();
}

// Clear Step 1 and Step 2 fields after adding an item
function resetStep1And2() {
  $("foodName").value = "";
  $("mealType").value = "Home Meal";
  $("servingSize").value = "";
  $("servingPieces").value = "";
  $("labelCalories").value = "";
  $("labelFat").value = "";
  $("labelSodium").value = "";
  $("labelCarbs").value = "";
  $("labelFiber").value = "";
  $("labelSugar").value = "";
  $("labelProtein").value = "";
  $("amountEaten").value = "";
  $("amountPieces").value = "";
}

// Render main meal table
function renderMeal() {
  const body = $("mealBody");
  body.innerHTML = "";

  mealItems.forEach((item, index) => {
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
      <td><button class="small danger removeItem" data-index="${index}">Remove</button></td>
    `;
    body.appendChild(tr);
  });

  updateTotalsDisplay();
}

// Render summary table (name + carbs + fat + protein)
function renderSummary() {
  const body = $("summaryBody");
  body.innerHTML = "";

  mealItems.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.carbs.toFixed(1)}</td>
      <td>${item.fat.toFixed(1)}</td>
      <td>${item.protein.toFixed(1)}</td>
    `;
    body.appendChild(tr);
  });
}

// Remove item from meal
function removeItem(index) {
  mealItems.splice(index, 1);
  renderMeal();
  renderSummary();
}

// ---------- totals and guidance ----------

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

function updateTotalsDisplay() {
  const totals = getTotals();
  $("totalCarbs").textContent = totals.carbs.toFixed(1) + " g";
  $("totalFat").textContent = totals.fat.toFixed(1) + " g";
  $("totalProtein").textContent = totals.protein.toFixed(1) + " g";

  if (mealItems.length === 0) {
    $("preBolus").textContent = "--";
    $("split").textContent = "--";
    $("resultFoodType").textContent = "--";
    $("reason").textContent = "--";
    $("foodType").value = "";
  }
}

// Decide food type from macros and meal type
function determineFoodType(totals, mealType) {
  const carbs = totals.carbs;
  const fat = totals.fat;
  const protein = totals.protein;
  const fiber = totals.fiber;

  const fiberRatio = carbs > 0 ? fiber / carbs : 0;
  const fatRatio = carbs > 0 ? fat / carbs : 0;

  const containsPizza = mealItems.some(item =>
    item.name.toLowerCase().includes("pizza")
  );

  if (carbs < 8 && fat < 8 && protein < 8) {
    return "Low-Carb Veggies";
  }

  if (carbs >= 20 && fiberRatio >= 0.15) {
    return "Carbs with Fiber";
  }

  if (carbs >= 25 && fat <= 10) {
    return "Simple Carbs";
  }

  if (protein >= 20 && fat <= 15 && carbs <= 25) {
    return "High-Protein";
  }

  if (carbs <= 20 && fat >= 18 && protein <= 10) {
    return "Plant-based Fat";
  }

  if (carbs <= 25 && fat <= 12 && protein >= 10) {
    return "Protein";
  }

  if ((fat >= 18 && carbs >= 25) || fatRatio >= 0.5) {
    if (containsPizza && (mealType === "Fast Food" || mealType === "Restaurant")) {
      return "High-Fat Pizza";
    }
    return "High-Fat";
  }

  if (carbs <= 20) {
    return "Low-Carb";
  }

  return "Mixed Carbs and Fat";
}

// Decide pre bolus timing
function determinePreBolus(bsl, foodType) {
  if (!bsl || bsl <= 0) return "--";

  if (bsl < 80) {
    return "0–2 min (consider reducing dose)";
  }
  if (bsl >= 80 && bsl <= 110) {
    if (foodType === "Simple Carbs") return "5–8 min";
    return "3–6 min";
  }
  if (bsl > 110 && bsl <= 160) {
    return "8–10 min";
  }
  if (bsl > 160 && bsl <= 220) {
    return "10–12 min";
  }
  return "12–15 min";
}

// Decide split recommendation
function determineSplit(foodType, mealType, totals) {
  const fat = totals.fat;
  const carbs = totals.carbs;
  const containsPizza = mealItems.some(item =>
    item.name.toLowerCase().includes("pizza")
  );

  // Default
  let text = "No split recommended";
  let reason = "Low to moderate fat and carbs.";

  if (foodType === "Simple Carbs" || foodType === "Carbs with Fiber") {
    text = "No split recommended";
    reason = "Fast digesting carbs, let Control-IQ handle corrections.";
    return { text, reason };
  }

  // Very high fat or pizza
  if (
    containsPizza &&
    (mealType === "Fast Food" || mealType === "Restaurant") &&
    fat >= 20
  ) {
    text = "35/65 over 2 hours";
    reason = "High-fat pizza – slow digestion. More insulin on the back end, capped at 2 hours.";
    return { text, reason };
  }

  if (fat >= 18 && carbs >= 25) {
    text = "40/60 over 1.5 hours";
    reason = "High-fat, higher-carb meal – more insulin to the back end, 1.5 hours total.";
    return { text, reason };
  }

  if (foodType === "High-Protein" || foodType === "Protein" || carbs <= 20) {
    text = "30/70 over 1.5 hours";
    reason = "Protein-heavy or low-carb meal – slower rise, more insulin later.";
    return { text, reason };
  }

  if (fat >= 12 && fat < 18 && carbs >= 25) {
    text = "40/60 over 1 hour 30 min";
    reason = "Moderate to high fat – aim for a modest split with short duration.";
    return { text, reason };
  }

  return { text, reason };
}

function calculateGuidance() {
  if (mealItems.length === 0) {
    alert("Add at least one food item before calculating.");
    return;
  }

  const totals = getTotals();
  const bsl = toNum($("bsl").value);
  const mealType = $("mealType").value || "Home Meal";

  const foodType = determineFoodType(totals, mealType);
  $("foodType").value = foodType;

  const preBolus = determinePreBolus(bsl, foodType);
  const splitInfo = determineSplit(foodType, mealType, totals);

  $("preBolus").textContent = preBolus;
  $("split").textContent = splitInfo.text;
  $("resultFoodType").textContent = foodType;
  $("reason").textContent = splitInfo.reason;

  updateTotalsDisplay();
}

// ---------- save to history ----------

function saveCurrentToHistory() {
  if (mealItems.length === 0) {
    alert("Nothing to save. Add food items first.");
    return;
  }

  const profile = getProfileName();

  mealItems.forEach(item => {
    const t = item.template;
    if (!t) return;

    // Upsert by profile + name
    const idx = templates.findIndex(
      existing =>
        existing.profile === profile &&
        existing.name.toLowerCase() === t.name.toLowerCase()
    );

    if (idx >= 0) {
      templates[idx] = t;
    } else {
      templates.push(t);
    }
  });

  saveTemplates();
  refreshFoodNameDatalist();
  renderTemplates();

  // Clear current meal state
  mealItems = [];
  renderMeal();
  renderSummary();
  resetStep1And2();
}

// ---------- history clear ----------

function clearHistory() {
  if (!confirm("Clear all saved food templates for this profile?")) return;
  const profile = getProfileName();
  templates = templates.filter(t => t.profile !== profile);
  saveTemplates();
  renderTemplates();
  refreshFoodNameDatalist();
}

// ---------- tab handling ----------

function showTab(which) {
  if (which === "current") {
    $("currentView").style.display = "";
    $("historyView").style.display = "none";
    $("tabcurrent").classList.add("active");
    $("tabhistory").classList.remove("active");
  } else {
    $("currentView").style.display = "none";
    $("historyView").style.display = "";
    $("tabcurrent").classList.remove("active");
    $("tabhistory").classList.add("active");
    renderTemplates();
  }
}

// ---------- html escaping ----------

function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, m => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

// ---------- init ----------

function init() {
  loadProfile();
  loadTemplates();
  refreshFoodNameDatalist();
  renderTemplates();
  renderMeal();
  renderSummary();

  // Buttons
  $("addBtn").addEventListener("click", addItem);
  $("calcBtn").addEventListener("click", calculateGuidance);
  $("saveHistory").addEventListener("click", saveCurrentToHistory);
  $("clearHistory").addEventListener("click", clearHistory);

  // Tabs
  $("tabcurrent").addEventListener("click", () => showTab("current"));
  $("tabhistory").addEventListener("click", () => showTab("history"));

  // Autofill from templates
  $("foodName").addEventListener("change", tryAutofillFromHistory);
  $("foodName").addEventListener("blur", tryAutofillFromHistory);

  // Profile change
  $("profileName").addEventListener("blur", () => {
    saveProfile();
    refreshFoodNameDatalist();
    renderTemplates();
  });

  // Remove buttons in meal table
  $("mealBody").addEventListener("click", e => {
    if (e.target && e.target.classList.contains("removeItem")) {
      const idx = parseInt(e.target.getAttribute("data-index"), 10);
      if (!isNaN(idx)) {
        removeItem(idx);
      }
    }
  });

  showTab("current");
}

// Ensure init runs even if DOM is already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
