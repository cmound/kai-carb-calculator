// Basic helpers
function scaled(valuePerServing, amountEaten, servingSize){
  if (servingSize <= 0) return 0;
  return valuePerServing * (amountEaten / servingSize);
}

function splitRecommendation(totalFat){
  if (totalFat < 10) return "Full upfront";
  if (totalFat < 15) return "50/50 over 2 hours";
  if (totalFat < 18) return "55/45 over 2 hours 15 mins";
  if (totalFat < 20) return "55/45 over 2 hours 30 mins";
  if (totalFat < 25) return "55/45 over 3 hours";
  if (totalFat < 30) return "55/45 over 3 hours 15 mins";
  return "55/45 over 3 hours 30 mins";
}

function preBolus(bsl, iob, foodType){
  // Simple starter rule. Replace with your exact logic later.
  if (bsl < 90 || iob >= 0.5) return "0–2 min";
  if (foodType === "Simple Carbs") return "6–8 min";
  return "4–6 min";
}

function $(id){return document.getElementById(id)}

function calculate(){
  const servingSize = parseFloat($("servingSize").value)||0;
  const labelCarbs = parseFloat($("labelCarbs").value)||0;
  const labelFat = parseFloat($("labelFat").value)||0;
  const labelProtein = parseFloat($("labelProtein").value)||0;
  const amountEaten = parseFloat($("amountEaten").value)||0;
  const bsl = parseFloat($("bsl").value)||0;
  const iob = parseFloat($("iob").value)||0;
  const foodType = $("foodType").value;

  const pCarbs = scaled(labelCarbs, amountEaten, servingSize);
  const pFat = scaled(labelFat, amountEaten, servingSize);
  const pProtein = scaled(labelProtein, amountEaten, servingSize);

  $("portionCarbs").textContent = pCarbs.toFixed(1);
  $("portionFat").textContent = pFat.toFixed(1);
  $("portionProtein").textContent = pProtein.toFixed(1);

  $("prebolus").textContent = preBolus(bsl, iob, foodType);
  $("splitText").textContent = splitRecommendation(pFat);
}

function loadRecents(){
  const list = JSON.parse(localStorage.getItem("kai_recents")||"[]");
  const ul = $("recentList");
  ul.innerHTML = "";
  list.forEach((item, idx)=>{
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.name||"Food"} • ${item.amountEaten}${item.unit||""}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "Load";
    btn.onclick = ()=>{
      $("servingSize").value = item.servingSize;
      $("labelCarbs").value = item.labelCarbs;
      $("labelFat").value = item.labelFat;
      $("labelProtein").value = item.labelProtein;
      $("amountEaten").value = item.amountEaten;
      $("bsl").value = item.bsl;
      $("iob").value = item.iob;
      $("foodType").value = item.foodType;
      calculate();
      window.scrollTo({top:0, behavior:"smooth"});
    };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function saveRecent(){
  const list = JSON.parse(localStorage.getItem("kai_recents")||"[]");
  const item = {
    name: "Saved item " + (list.length+1),
    servingSize: parseFloat($("servingSize").value)||0,
    labelCarbs: parseFloat($("labelCarbs").value)||0,
    labelFat: parseFloat($("labelFat").value)||0,
    labelProtein: parseFloat($("labelProtein").value)||0,
    amountEaten: parseFloat($("amountEaten").value)||0,
    bsl: parseFloat($("bsl").value)||0,
    iob: parseFloat($("iob").value)||0,
    foodType: $("foodType").value,
    unit: ""
  };
  list.unshift(item);
  localStorage.setItem("kai_recents", JSON.stringify(list.slice(0,20)));
  loadRecents();
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("calcBtn").addEventListener("click", calculate);
  $("saveBtn").addEventListener("click", saveRecent);
  loadRecents();
  calculate();
});
