// Type 1 Diabetes Calculator logic

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "t1d-food-history-v1";

let loggedItems = [];
let historyTemplates = [];

// Utility to read numeric value safely
function num(id) {
  const val = $(id).value.trim();
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

// Round to one decimal
function round1(value) {
  return Math.round(value * 10) / 10;
}

// Tab handling
function showCurrentScreen() {
  $("#screen-current").classList.remove("hidden");
  $("#screen-history").classList.add("hidden");
  $("#tab-current").classList.add("active");
  $("#tab-history").classList.remove("active");
}

function showHistoryScreen() {
  $("#screen-current").classList.add("hidden");
  $("#screen-history").classList.remove("hidden");
  $("#tab-current").classList.remove("active");
  $("#tab-history").classList.add("active");
}

// Add current food item to logged list
function handleAddItem() {
  const name = $("#foodName").value.trim() || `Item ${loggedItems.length + 1}`;

  const servingSize = num("servingSize");
  const servingPieces = num("servingPieces");

  const calories = num("calories");
  const fat = num("fat");
  const sodium = num("sodium");
  const carbs = num("carbs");
  const fiber = num("fiber");
  const sugar = num("sugar");
  const protein = num("protein");

  const amountEaten = num("amountEaten");
  const piecesEaten = num("piecesEaten");

  // Decide factor used to scale from per-serving to eaten amount
  let factor = 1;

  if (amountEaten > 0 && servingSize > 0) {
    factor = amountEaten / servingSize;
  } else if (piecesEaten > 0 && servingPieces > 0) {
    factor = piecesEaten / servingPieces;
  }

  const item = {
    name,
    servingSize,
    servingPieces,
    calories,
    fat,
    sodium,
    carbs,
    fiber,
    sugar,
    protein,
    amountEaten,
    piecesEaten,
    factor
  };

  loggedItems.push(item);
  renderLoggedItems();
  renderSummaryTable();
  calculateGuidance();

  // Keep form values so you can add a second item of the same food if you want
  $("#amountEaten").value = "";
  $("#piecesEaten").value = "";
}

// Render logged items table
function renderLoggedItems() {
  const tbody = $("#loggedItemsBody");
  tbody.innerHTML = "";

  loggedItems.forEach((item) => {
    const f = item.factor || 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${round1(item.calories * f)}</td>
      <td>${round1(item.fat * f)}</td>
      <td>${round1(item.sodium * f)}</td>
      <td>${round1(item.carbs * f)}</td>
      <td>${round1(item.fiber * f)}</td>
      <td>${round1(item.sugar * f)}</td>
      <td>${round1(item.protein * f)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Render summary table for carbs, fat, protein per item
function renderSummaryTable() {
  const tbody = $("#summaryTableBody");
  tbody.innerHTML = "";

  loggedItems.forEach((item) => {
    const f = item.factor || 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${round1(item.carbs * f)}</td>
      <td>${round1(item.fat * f)}</td>
      <td>${round1(item.protein * f)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Calculate totals across logged items
function getTotals() {
  let totalCarbs = 0;
  let totalFat = 0;
  let totalProtein = 0;

  loggedItems.forEach((item) => {
    const f = item.factor || 1;
    totalCarbs += item.carbs * f;
    totalFat += item.fat * f;
    totalProtein += item.protein * f;
  });

  return {
    carbs: totalCarbs,
    fat: totalFat,
    protein: totalProtein
  };
}

// Pre bolus suggestion based on BSL and IOB
function getPrebolusSuggestion(bsl, iob, totalCarbs) {
  if (totalCarbs === 0) {
    return "Enter food and context first.";
  }

  if (!Number.isFinite(bsl) || bsl <= 0) {
    return "Use your usual pre bolus timing.";
  }

  if (bsl < 90 && iob > 0.2) {
    return "Bolus at first bite and watch for early lows.";
  }

  if (bsl >= 90 && bsl <= 140) {
    return "Pre bolus about 2 to 5 minutes before eating.";
  }

  if (bsl > 140 && bsl <= 180) {
    return "Pre bolus about 5 to 8 minutes before eating.";
  }

  if (bsl > 180) {
    return "Pre bolus about 8 to 10 minutes before eating, adjust for correction with your care team rules.";
  }

  return "--";
}

// Less aggressive split logic
function getSplitSuggestion(totalCarbs, totalFat) {
  // Default
  let split = "--";
  let reason =
    "Low fat or low carb load. Normal bolus is usually fine. Adjust based on your provider guidance.";

  if (totalCarbs < 20 || totalFat < 10) {
    return { split, reason };
  }

  // Moderate fat
  if (totalFat < 20) {
    split = "60 / 40 over 1.5 hours";
    reason =
      "Moderate fat meal. Slightly extended bolus to smooth a later rise.";
    return { split, reason };
  }

  // High fat
  if (totalFat < 30) {
    split = "50 / 50 over 2 hours";
    reason =
      "High fat meal. Half up front and half extended to cover delayed absorption.";
    return { split, reason };
  }

  // Very high fat or heavy Italian or fried type meals
  split = "35 / 65 over 2.5 hours";
  reason =
    "Very high fat or heavy meal. More insulin extended over time to match slow digestion.";
  return { split, reason };
}

// Main guidance calculation
function calculateGuidance() {
  const totals = getTotals();
  const totalCarbs = totals.carbs;
  const totalFat = totals.fat;
  const totalProtein = totals.protein;

  $("#resultTotalCarbs").textContent = round1(totalCarbs).toFixed(1);
  $("#resultTotalFat").textContent = round1(totalFat).toFixed(1);
  $("#resultTotalProtein").textContent = round1(totalProtein).toFixed(1);

  const bslVal = parseFloat($("#bsl").value);
  const iobVal = parseFloat($("#iob").value);

  const pre = getPrebolusSuggestion(
    Number.isFinite(bslVal) ? bslVal : NaN,
    Number.isFinite(iobVal) ? iobVal : 0,
    totalCarbs
  );
  $("#resultPrebolus").textContent = pre;

  const splitInfo = getSplitSuggestion(totalCarbs, totalFat);
  $("#resultSplit").textContent = splitInfo.split;

  const mealTypeSelect = $("#mealType");
  const foodType =
    mealTypeSelect && mealTypeSelect.value
      ? mealTypeSelect.value
      : loggedItems.length > 0
      ? "Meal"
      : "--";
  $("#resultFoodType").textContent = foodType;

  $("#resultReason").textContent = splitInfo.reason;
}

// History handling
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      historyTemplates = JSON.parse(raw);
      if (!Array.isArray(historyTemplates)) {
        historyTemplates = [];
      }
    } else {
      historyTemplates = [];
    }
  } catch (e) {
    historyTemplates = [];
  }
  renderHistoryTable();
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historyTemplates));
}

function renderHistoryTable() {
  const tbody = $("#historyTableBody");
  tbody.innerHTML = "";

  historyTemplates.forEach((tpl) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${tpl.name}</td>
      <td>${tpl.serving}</td>
      <td>${tpl.calories}</td>
      <td>${tpl.fat}</td>
      <td>${tpl.sodium}</td>
      <td>${tpl.carbs}</td>
      <td>${tpl.fiber}</td>
      <td>${tpl.sugar}</td>
      <td>${tpl.protein}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Save current logged items to history
function handleSaveToHistory() {
  if (!loggedItems.length) {
    return;
  }

  loggedItems.forEach((item) => {
    const servingTextParts = [];
    if (item.servingSize > 0) {
      servingTextParts.push(`${round1(item.servingSize)} g`);
    }
    if (item.servingPieces > 0) {
      servingTextParts.push(`${round1(item.servingPieces)} pcs`);
    }
    const servingText = servingTextParts.join(" / ") || "--";

    historyTemplates.push({
      name: item.name,
      serving: servingText,
      calories: round1(item.calories),
      fat: round1(item.fat),
      sodium: round1(item.sodium),
      carbs: round1(item.carbs),
      fiber: round1(item.fiber),
      sugar: round1(item.sugar),
      protein: round1(item.protein)
    });
  });

  saveHistory();
  renderHistoryTable();

  // Clear current meal
  loggedItems = [];
  renderLoggedItems();
  renderSummaryTable();
  calculateGuidance();
}

// Clear all history
function handleClearHistory() {
  if (!historyTemplates.length) return;
  if (!confirm("Clear all saved food templates?")) return;

  historyTemplates = [];
  saveHistory();
  renderHistoryTable();
}

// Service worker registration
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ignore failure
      });
    });
  }
}

// Init
function init() {
  // Tabs
  $("#tab-current").addEventListener("click", showCurrentScreen);
  $("#tab-history").addEventListener("click", showHistoryScreen);

  // Buttons
  $("#addItemBtn").addEventListener("click", handleAddItem);
  $("#saveToHistoryBtn").addEventListener("click", handleSaveToHistory);
  $("#clearHistoryBtn").addEventListener("click", handleClearHistory);

  // Auto recalc when BSL or IOB change
  ["bsl", "iob"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", calculateGuidance);
    }
  });

  loadHistory();
  calculateGuidance();
  registerServiceWorker();
}

document.addEventListener("DOMContentLoaded", init);
