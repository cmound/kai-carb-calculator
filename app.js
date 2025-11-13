// ===== Helpers =====
const $ = id => document.getElementById(id);
const fmt = n => (isFinite(n) ? Number(n).toFixed(1) : "0.0");

// App state
let meal = []; // current logged items
let templates = JSON.parse(localStorage.getItem("kc_templates") || "[]"); // per-serving label templates

// ===== Templates / history =====
function saveTemplates() {
  localStorage.setItem("kc_templates", JSON.stringify(templates));
  renderTemplates();
  refreshFoodNameDatalist();
}

function upsertTemplate(tpl) {
  const i = templates.findIndex(x => x.name.toLowerCase() === tpl.name.toLowerCase());
  if (i >= 0) templates[i] = tpl; else templates.push(tpl);
  saveTemplates();
}

function renderTemplates() {
  const tb = $("templates").querySelector("tbody");
  if (!tb) return;
  tb.innerHTML = "";
  templates.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(t.name)}</td>
      <td>${t.servingSize || 0}${t.servingPieces ? ` / ${t.servingPieces} pcs` : ""}</td>
      <td>${fmt(t.calories)}</td>
      <td>${fmt(t.fat)}</td>
      <td>${fmt(t.sodium)}</td>
      <td>${fmt(t.carbs)}</td>
      <td>${fmt(t.fiber)}</td>
      <td>${fmt(t.sugar)}</td>
      <td>${fmt(t.protein)}</td>
    `;
    tb.appendChild(tr);
  });
}

function refreshFoodNameDatalist() {
  const dl = $("foodNames");
  if (!dl) return;
  dl.innerHTML = "";
  templates
    .slice()
    .sort((a,b)=>a.name.localeCompare(b.name))
    .forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.name;
      dl.appendChild(opt);
    });
}

function tryAutofillFromHistory() {
  const name = $("foodName").value.trim();
  if (!name) return;
  const hit = templates.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (!hit) return;
  $("servingSize").value    = hit.servingSize ?? 100;
  if ($("servingPieces")) $("servingPieces").value = hit.servingPieces ?? 0;
  $("labelCalories").value  = hit.calories ?? 0;
  $("labelFat").value       = hit.fat ?? 0;
  $("labelSodium").value    = hit.sodium ?? 0;
  $("labelCarbs").value     = hit.carbs ?? 0;
  $("labelFiber").value     = hit.fiber ?? 0;
  $("labelSugar").value     = hit.sugar ?? 0;
  $("labelProtein").value   = hit.protein ?? 0;
}

// ===== Meal logging =====
function addItem(){
  const name = $("foodName").value.trim() || "Food";

  // Label per-serving values
  const servingSize   = parseFloat($("servingSize").value)   || 0;   // grams/mL
  const servingPieces = parseFloat($("servingPieces")?.value) || 0;  // pieces per serving (optional)
  const labelCalories = parseFloat($("labelCalories").value) || 0;
  const labelFat      = parseFloat($("labelFat").value)      || 0;
  const labelSodium   = parseFloat($("labelSodium").value)   || 0;
  const labelCarbs    = parseFloat($("labelCarbs").value)    || 0;
  const labelFiber    = parseFloat($("labelFiber").value)    || 0;
  const labelSugar    = parseFloat($("labelSugar").value)    || 0;
  const labelProtein  = parseFloat($("labelProtein").value)  || 0;

  // Portion the user ate
  const amountEaten   = parseFloat($("amountEaten")?.value)   || 0;  // grams/mL
  const amountPieces  = parseFloat($("amountPieces")?.value)  || 0;  // pieces

  // Compute fraction of a serving
  let fraction = 0;
  if (servingPieces > 0 && amountPieces > 0) {
    fraction = amountPieces / servingPieces;
  } else if (servingSize > 0 && amountEaten > 0) {
    fraction = amountEaten / servingSize;
  } else {
    alert("Enter either grams/mL or pieces for the portion, and set the matching serving field.");
    return;
  }

  const item = {
    name,
    calories: labelCalories * fraction,
    fat:      labelFat      * fraction,
    sodium:   labelSodium   * fraction,
    carbs:    labelCarbs    * fraction,
    fiber:    labelFiber    * fraction,
    sugar:    labelSugar    * fraction,
    protein:  labelProtein  * fraction
  };

  meal.push(item);
  // Save a template for future autofill
  upsertTemplate({
    name, servingSize, servingPieces,
    calories: labelCalories, fat: labelFat, sodium: labelSodium,
    carbs: labelCarbs, fiber: labelFiber, sugar: labelSugar, protein: labelProtein
  });

  // Clear STEP 2 fields after adding
  if ($("amountEaten"))  $("amountEaten").value  = "";
  if ($("amountPieces")) $("amountPieces").value = "";

  renderMeal();
}

function removeItem(idx){
  meal.splice(idx,1);
  renderMeal();
}

function renderMeal(){
  const tb = $("loggedFoods").querySelector("tbody");
  tb.innerHTML = "";
  meal.forEach((m,i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(m.name)}</td>
      <td>${fmt(m.calories)}</td>
      <td>${fmt(m.fat)}</td>
      <td>${fmt(m.sodium)}</td>
      <td>${fmt(m.carbs)}</td>
      <td>${fmt(m.fiber)}</td>
      <td>${fmt(m.sugar)}</td>
      <td>${fmt(m.protein)}</td>
      <td><button class="secondary" data-i="${i}">Remove</button></td>
    `;
    tb.appendChild(tr);
  });

  // Remove handlers
  tb.querySelectorAll("button[data-i]").forEach(btn => {
    btn.addEventListener("click", e => removeItem(parseInt(btn.dataset.i,10)));
  });

  // Totals
  const totals = meal.reduce((a,m)=>({
    calories:a.calories+m.calories,
    fat:a.fat+m.fat,
    sodium:a.sodium+m.sodium,
    carbs:a.carbs+m.carbs,
    fiber:a.fiber+m.fiber,
    sugar:a.sugar+m.sugar,
    protein:a.protein+m.protein
  }), {calories:0,fat:0,sodium:0,carbs:0,fiber:0,sugar:0,protein:0});

  $("totalCarbs").textContent   = fmt(totals.carbs);
  $("totalFat").textContent     = fmt(totals.fat);
  $("totalProtein").textContent = fmt(totals.protein);
}

function clearCurrentMeal(){
  meal = [];
  renderMeal();
}

// ===== Guidance =====
function calculateGuidance(){
  // Inputs
  const bsl = parseFloat($("bsl").value) || 0;
  const iob = parseFloat($("iob").value) || 0;
  const type = $("foodType").value;

  // Totals
  const carbs   = parseFloat($("totalCarbs").textContent)   || 0;
  const fat     = parseFloat($("totalFat").textContent)     || 0;
  const protein = parseFloat($("totalProtein").textContent) || 0;

  // Pre-bolus recommendation
  let preBolusMin = "0–2 min";
  if (bsl >= 130 && bsl < 180) preBolusMin = "6–8 min";
  if (bsl >= 180)              preBolusMin = "10–12 min";
  if (iob >= 0.5)              preBolusMin = "0–2 min"; // extra caution when IOB present

  // Split recommendation, duration and reason based on fat/protein load
  // Uses a simple breakpoint table similar to your Excel:
  // 0: full upfront, 10: 50/50 over 2h, 15: 55/45 over 2h15, 18: 55/45 over 2h30, 20: 55/45 over 3h, up to 40: 55/45 over 3h30
  const fatLoad = fat; // already grams across the meal
  const breakpoints = [
    {bp: 40, text: "55/45 over 3 hours 30 mins", reason: "High fat, slow digesting"},
    {bp: 35, text: "55/45 over 3 hours 30 mins", reason: "High fat, slow digesting"},
    {bp: 30, text: "55/45 over 3 hours 30 mins", reason: "High fat, slow digesting"},
    {bp: 25, text: "55/45 over 3 hours 15 mins", reason: "High fat, slow digesting"},
    {bp: 20, text: "55/45 over 3 hours",        reason: "Moderate fat, slower digesting"},
    {bp: 18, text: "55/45 over 2 hours 30 mins", reason: "Moderate fat"},
    {bp: 15, text: "55/45 over 2 hours 15 mins", reason: "Moderate fat"},
    {bp: 10, text: "50/50 over 2 hours",        reason: "Some fat present"},
    {bp:  0, text: "No split recommended",      reason: "Low fat, fast digesting"}
  ];
  let splitText = "No split recommended", reason = "Low fat, fast digesting";
  for (const row of breakpoints) {
    if (fatLoad >= row.bp) { splitText = row.text; reason = row.reason; break; }
  }

  // Food type echo
  const typeResult = type;

  $("preBolus").textContent = preBolusMin;
  $("split").textContent     = splitText;
  $("typeResult").textContent= typeResult;
  $("reason").textContent    = reason;
}

// ===== Save to history button (just clears current meal; templates already persist) =====
$("saveHistory").addEventListener("click", () => {
  clearCurrentMeal();
});

// ===== Tabs =====
function showTab(which){
  $("tabcurrent").classList.toggle("active", which==="current");
  $("tabhistory").classList.toggle("active", which==="history");
  $("currentView").style.display = which==="current" ? "" : "none";
  $("historyView").style.display = which==="history" ? "" : "none";
}

// ===== Utility =====
function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ===== Event wiring =====
function init(){
  // Buttons
  $("addBtn").addEventListener("click", addItem);
  $("calcBtn").addEventListener("click", calculateGuidance);
  $("clearHistory").addEventListener("click", () => {
    if (confirm("Clear all saved templates?")) {
      templates = [];
      saveTemplates();
    }
  });
  $("tabcurrent").addEventListener("click", () => showTab("current"));
  $("tabhistory").addEventListener("click", () => showTab("history"));

  // Autofill when foodName loses focus or changes
  $("foodName").addEventListener("change", tryAutofillFromHistory);
  $("foodName").addEventListener("blur",   tryAutofillFromHistory);

  // Initial renders
  refreshFoodNameDatalist();
  renderTemplates();
  renderMeal();
  showTab("current");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
