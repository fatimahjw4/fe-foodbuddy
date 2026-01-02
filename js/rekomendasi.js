/**
 * rekomendasi.js
 * Logic untuk Wizard Form dan Integrasi API Rekomendasi ML
 * API Endpoint: https://srv1222479.hstgr.cloud/api/recommend
 */

// ==========================
// DOM Elements & State
// ==========================
const steps = document.querySelectorAll(".step");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const wizardContainer = document.getElementById("wizardContainer");
const recommendationContainer = document.getElementById("recommendationContainer");
const loadingState = document.getElementById("loadingState");
const mainTitle = document.getElementById("mainTitle");
const mealContainer = document.getElementById("mealContainer");

let currentStep = 0;
let lastPayload = null;


// ==========================
// Static Mapping
// ==========================
const titles = [
  "Atur Target Dietmu",
  "Data Fisik",
  "Informasi Dasar",
  "Level Aktivitas",
  "Konfirmasi Data"
];

const dietMap = {
  cutting: "Cutting (Defisit)",
  bulking: "Bulking (Surplus)",
  maintenance: "Maintenance"
};

const genderMap = { male: "Pria", female: "Wanita" };

const activityMap = {
  sedentary: "Sedentary (Jarang)",
  light: "Ringan (1-3x)",
  moderate: "Sedang (3-5x)",
  active: "Berat (6-7x)",
  very_active: "Sangat Berat"
};

const cardContainerMap = {
  dietInput: "dietSelectionContainer",
  genderInput: "genderSelectionContainer",
  activityInput: "activitySelectionContainer"
};

// ==========================
// FE CALCULATION (FALLBACK ONLY)
// Sesuai saran, fungsi ini tetap ada tapi hanya digunakan jika BE tidak mengirim data
// ==========================
function calculateNutrients(data) {
  const weight = parseFloat(data.weight) || 0;
  const height = parseFloat(data.height) || 0;
  const age = parseInt(data.age) || 0;

  let bmr =
    data.gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const tdee = bmr * (activityMultipliers[data.activity] || 1.2);

  let calorieTarget = tdee;
  if (data.diet === "cutting") calorieTarget *= 0.85;
  if (data.diet === "bulking") calorieTarget *= 1.15;

  return {
    total_cal: Math.round(calorieTarget),
    target_protein: Math.round((calorieTarget * 0.3) / 4),
    target_fat: Math.round((calorieTarget * 0.25) / 9),
    target_carb: Math.round((calorieTarget * 0.45) / 4),
    tdee: Math.round(tdee)
  };
}


// --- FUNGSI TAMPILAN WIZARD ---
function setupCardSelection(containerId, inputId, attributeName) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container) return;

    const cards = container.querySelectorAll('.choice-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            input.value = card.getAttribute(attributeName);
            
            container.style.border = 'none';
            container.classList.remove('p-1', 'border-red-500'); 
        });
    });
}

function validateStep(stepIndex) {
    const currentStepElement = steps[stepIndex];
    const inputs = currentStepElement.querySelectorAll('.input-field');
    let isValid = true;
    
    inputs.forEach(input => {
        input.classList.remove('input-error');
        const containerId = cardContainerMap[input.id];
        let container = containerId ? document.getElementById(containerId) : null;
        if (container) {
            container.classList.remove('p-1', 'border-red-500');
            container.style.border = 'none';
        }

        if (input.type === 'hidden' && input.value.trim() === "") {
            if (container) {
                container.style.border = '2px solid #ef4444';
                container.style.borderRadius = '0.75rem';
                container.classList.add('p-1', 'border-red-500'); 
                isValid = false;
            }
        } else if (input.type !== 'hidden' && (input.value.trim() === "" || (input.type === 'number' && (parseFloat(input.value) <= 0 || isNaN(parseFloat(input.value)))))) {
            input.classList.add('input-error');
            isValid = false;
        } else if (input.type !== 'hidden') {
            input.classList.remove('input-error');
        }
    });
    return isValid;
}

function updateReviewData() {
    const form = document.getElementById("wizardForm");
    const data = new FormData(form);
    const dietValue = data.get('diet');
    const genderValue = data.get('gender');
    const activityValue = data.get('activity');

    document.getElementById("reviewDiet").textContent = dietMap[dietValue] || dietValue;
    document.getElementById("reviewWeight").textContent = `${data.get('weight')} kg`;
    document.getElementById("reviewHeight").textContent = `${data.get('height')} cm`;
    document.getElementById("reviewAge").textContent = `${data.get('age')} tahun`;
    document.getElementById("reviewGender").textContent = genderMap[genderValue] || genderValue;
    document.getElementById("reviewActivity").textContent = activityMap[activityValue] || activityValue;
}

function showStep(step) {
    steps.forEach((s) => s.classList.add("hidden"));
    steps[step].classList.remove("hidden");

    prevBtn.style.display = step === 0 ? "none" : "inline-flex";
    
    if (step === 0) {
        nextBtn.classList.remove('ml-auto');
    } else {
        nextBtn.classList.add('ml-auto');
    }

    nextBtn.style.display = step === steps.length - 1 ? "none" : "inline-flex";
    submitBtn.style.display = step === steps.length - 1 ? "inline-flex" : "none";
    
    mainTitle.textContent = titles[step];

    const dots = document.querySelectorAll('.step-dot');
    const lines = document.querySelectorAll('.step-line');
    
    dots.forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if (index === step) {
            dot.classList.add('active');
        } else if (index < step) {
            dot.classList.add('completed');
        }
    });

    lines.forEach((line, index) => {
        line.classList.remove('completed-line');
        if (index < step) {
            line.classList.add('completed-line');
        }
    });

    if(step === steps.length - 1){
        updateReviewData();
    }
}


// ==========================
// RENDER RECOMMENDATION
// ==========================
const summaryDailyContainer = document.getElementById("summaryDaily");

function renderRecommendation(recommendationData, nutrients, meta = {}) {
    loadingState.classList.add("hidden");

    document.getElementById("totalCalories").textContent =
      nutrients.total_cal.toLocaleString("id-ID");

    document.getElementById("targetMacros").innerHTML = `
      <span class="font-bold text-green-700">P:</span> ${nutrients.target_protein}g •
      <span class="font-bold text-green-700">L:</span> ${nutrients.target_fat}g •
      <span class="font-bold text-green-700">K:</span> ${nutrients.target_carb}g
    `;

    const daily = meta.daily || {};

    const totalSummary = `
    <div class="max-w-4xl mx-auto">
        <div class="bg-green-100 p-5 rounded-xl mb-6 shadow-md border border-green-300">
            <h3 class="text-lg font-bold text-green-800 mb-4">
            📊 Ringkasan Asupan Harian
            </h3>

            <div class="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div class="bg-white rounded-lg p-3 shadow-sm">
                <p class="text-xs text-gray-500 font-semibold">Kalori</p>
                <p class="text-lg font-extrabold text-green-700">
                ${daily.cal ?? nutrients.total_cal}
                <span class="text-sm font-semibold text-gray-500"> / ${nutrients.total_cal} kcal</span>
                </p>
            </div>

            <div class="bg-white rounded-lg p-3 shadow-sm">
                <p class="text-xs text-gray-500 font-semibold">Protein</p>
                <p class="text-lg font-extrabold text-green-700">
                ${daily.protein ?? nutrients.target_protein}
                <span class="text-sm font-semibold text-gray-500"> / ${nutrients.target_protein} g</span>
                </p>
            </div>

            <div class="bg-white rounded-lg p-3 shadow-sm">
                <p class="text-xs text-gray-500 font-semibold">Lemak</p>
                <p class="text-lg font-extrabold text-green-700">
                ${daily.fat ?? nutrients.target_fat}
                <span class="text-sm font-semibold text-gray-500"> / ${nutrients.target_fat} g</span>
                </p>
            </div>

            <div class="bg-white rounded-lg p-3 shadow-sm">
                <p class="text-xs text-gray-500 font-semibold">Karbohidrat</p>
                <p class="text-lg font-extrabold text-green-700">
                ${daily.carb ?? nutrients.target_carb}
                <span class="text-sm font-semibold text-gray-500"> / ${nutrients.target_carb} g</span>
                </p>
            </div>

            ${
                daily.fiber !== undefined
                ? `
                <div class="bg-white rounded-lg p-3 shadow-sm col-span-2">
                    <p class="text-xs text-gray-500 font-semibold">Serat</p>
                    <p class="text-lg font-extrabold text-green-700">
                    ${daily.fiber}
                    <span class="text-sm font-semibold text-gray-500"> g</span>
                    </p>
                </div>
                `
                : ""
            }
            </div>
        </div>
    </div>
    `;   


    if (summaryDailyContainer) {
        summaryDailyContainer.innerHTML = totalSummary;
    }

    mealContainer.innerHTML = "";
    const grid = mealContainer;

    const ORDER = ["Sarapan", "Makan Siang", "Makan Malam"];
    ORDER.forEach(meal => {
        const data = recommendationData[meal];
        if (!data) return;

        const totalMeal = data.menu.reduce((acc, i) => {
            acc.kalori += i.kalori || 0;
            acc.protein += i.protein || 0;
            acc.fat += i.fat || 0;
            acc.carb += i.carb || 0;
            acc.fiber += i.fiber || 0;
            return acc;
        }, { kalori:0, protein:0, fat:0, carb:0, fiber:0 });

        const items = (data.menu || []).map(i => `
            <div class="menu-item bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition">
                <div class="flex justify-between items-start gap-2">
                    <strong class="text-gray-800 text-sm leading-snug">
                        ${i.makanan}
                    </strong>
                    <span class="text-xs font-semibold text-green-600 whitespace-nowrap">
                        ${i.kalori} kcal
                    </span>
                </div>

                <div class="text-[11px] text-gray-500 mt-1">
                    P ${i.protein}g • L ${i.fat}g • K ${i.carb}g
                    ${i.fiber ? ` • F ${i.fiber}g` : ""}
                </div>

                <div class="text-[11px] text-gray-400 mt-0.5">
                    Porsi: ${i.berat_g ?? "-"} g
                    ${i.is_addon ? `<span class="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Addon</span>` : ""}
                </div>
            </div>
        `).join("");

        grid.insertAdjacentHTML("beforeend", `
            <section class="meal-section bg-gradient-to-br from-green-50 to-white rounded-2xl p-5 shadow-lg border border-green-100 mb-6">
                
                <header class="mb-4">
                    <h3 class="text-lg font-extrabold text-green-700 flex items-center gap-2">
                        ${meal === "Sarapan" ? "🌅" : meal === "Makan Siang" ? "🍱" : "🌙"} ${meal}
                    </h3>

                    <p class="text-[11px] text-gray-400 mt-1">
                        Total: ${Math.round(totalMeal.kalori)} kcal •
                        P ${Math.round(totalMeal.protein)}g •
                        L ${Math.round(totalMeal.fat)}g •
                        K ${Math.round(totalMeal.carb)}g
                        ${totalMeal.fiber ? ` • F ${Math.round(totalMeal.fiber)}g` : ""}
                    </p>

                </header>

                <div class="space-y-3">
                    ${items}
                </div>
            </section>
        `);
    });
}



// --- EVENT HANDLERS ---

nextBtn.addEventListener("click", () => {
    if(validateStep(currentStep) && currentStep < steps.length - 1){
        currentStep++;
        showStep(currentStep);
    }
});

prevBtn.addEventListener("click", () => {
    if(currentStep > 0){
        currentStep--;
        showStep(currentStep);
    }
});

document.getElementById("wizardForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return; 

    const form = e.target;
    const formData = Object.fromEntries(new FormData(form).entries());
    
    // Perhitungan FE sekarang murni sebagai fallback jika BE bermasalah
    const feCalculated = calculateNutrients(formData);

    const payload = {
        age: +formData.age,
        height: +formData.height,
        weight: +formData.weight,
        gender: formData.gender,
        activity: formData.activity,
        diet: formData.diet,
        alternatives: 3
    };

    lastPayload = payload;

    wizardContainer.classList.add("hidden");
    document.getElementById("stepIndicator").classList.add("hidden"); 
    mainTitle.classList.add("hidden");
    
    recommendationContainer.classList.remove("hidden");
    loadingState.classList.remove("hidden");
    document.getElementById("mealContainer").innerHTML = '';
    
    try {
        const response = await fetch('https://srv1222479.hstgr.cloud/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // REVISI UTAMA: Mengambil Target dari BE secara mutlak
        const finalNutrients = result.calculated_nutrients
            ? {
                total_cal: Math.round(result.calculated_nutrients.total_cal_target),
                target_protein: Math.round(result.calculated_nutrients.target_macro_total?.Protein),
                target_fat: Math.round(result.calculated_nutrients.target_macro_total?.Fat),
                target_carb: Math.round(result.calculated_nutrients.target_macro_total?.Carb)
              }
            : feCalculated; // Fallback jika BE tidak kirim info nutrisi

        renderRecommendation(
            result.recommendation,
            finalNutrients,
            {
                daily: result.daily_totals_primary,
                warning: result.daily_warning
            }
        );

    } catch (error) {
        console.error("Gagal mendapatkan rekomendasi:", error);
        loadingState.classList.add("hidden");
        mealContainer.innerHTML = `
            <div class="bg-red-100 p-4 rounded-xl text-red-700 border border-red-300">
                <h4 class="font-bold mb-2">Terjadi Kesalahan Koneksi!</h4>
                <p>Gagal menghubungi server backend. Pastikan server di Hostinger sudah aktif.</p>
                <p class="mt-2 text-sm text-red-500">Detail: ${error.message}</p>
            </div>
        `;
    }
});


// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    setupCardSelection('dietSelectionContainer', 'dietInput', 'data-diet');
    setupCardSelection('genderSelectionContainer', 'genderInput', 'data-gender');
    setupCardSelection('activitySelectionContainer', 'activityInput', 'data-activity');
    showStep(currentStep);
});

document.addEventListener("DOMContentLoaded", () => {
  const rerollBtn = document.getElementById("rerollBtn");
  if (!rerollBtn) return;

  rerollBtn.addEventListener("click", async () => {
    if (!lastPayload) return;

    loadingState.classList.remove("hidden");
    mealContainer.innerHTML = "";

    try {
      const res = await fetch("https://srv1222479.hstgr.cloud/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastPayload)
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      // Sinkronkan nutrisi hasil reroll dari data BE
      renderRecommendation(
        result.recommendation,
        {
          total_cal: Math.round(result.calculated_nutrients.total_cal_target),
          target_protein: Math.round(result.calculated_nutrients.target_macro_total?.Protein),
          target_fat: Math.round(result.calculated_nutrients.target_macro_total?.Fat),
          target_carb: Math.round(result.calculated_nutrients.target_macro_total?.Carb)
        },
        {
          daily: result.daily_totals_primary,
          warning: result.daily_warning
        }
      );

    } catch (err) {
      alert("Gagal mengulang rekomendasi");
      console.error(err);
    }
  });
});
