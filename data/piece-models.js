// Mapowanie przycisków marek -> plik z danymi
const BRAND_FILES = {
  ferroli:   "/data/ferroli.json",
  defro:     "/data/defro.json",
  stalmark:  "/data/stalmark.json",
  lazar:     "/data/lazar.json",
  pereko:    "/data/pereko.json"
};

// Elementy na stronie
let brandButtons;           // przyciski zakładek marek
let modelSelect;            // select z modelami
let priceEl;                // gdzie pokazujesz podsumowanie ceny (opcjonalnie)

document.addEventListener("DOMContentLoaded", () => {
  brandButtons = document.querySelectorAll("[data-brand]"); // np. button data-brand="ferroli" (Ferroli)
  modelSelect  = document.querySelector("#modelSelect");    // select id="modelSelect"
  priceEl      = document.querySelector("#summary-price");  // span id="summary-price"

  // Podłącz kliknięcia
  brandButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const brand = btn.getAttribute("data-brand");
      loadBrandModels(brand);
      setActiveBrand(btn);
    });
  });

  // Zmiana modelu = przelicz cenę/propozycję (jeśli używasz)
  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      const opt = modelSelect.selectedOptions[0];
      if (!opt) return;
      const base = Number(opt.dataset.price || 0);
      // tu możesz dodać dopłaty (zasobnik, komin itd.)
      if (priceEl) priceEl.textContent = base.toLocaleString("pl-PL") + " PLN";
    });
  }

  // Startowo załaduj np. Ferroli
  loadBrandModels("ferroli");
});

function setActiveBrand(activeBtn) {
  if (!brandButtons) return;
  brandButtons.forEach(b => b.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

async function loadBrandModels(brand) {
  try {
    const url = BRAND_FILES[brand];
    if (!url) throw new Error("Nieznana marka: " + brand);

    // pobierz JSON
    const res = await fetch(url);
    if (!res.ok) throw new Error("Błąd wczytywania " + url);
    const models = await res.json();

    // wyczyść i wstaw opcje
    if (!modelSelect) return;
    modelSelect.innerHTML = "";
    models.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.text  = `${m.name} · ${m.power} kW · ${m.price.toLocaleString("pl-PL")} PLN`;
      opt.dataset.price = String(m.price);
      opt.dataset.power = String(m.power);
      modelSelect.appendChild(opt);
    });

    // wywołaj change, aby odświeżyć podsumowanie
    modelSelect.dispatchEvent(new Event("change"));
  } catch (e) {
    console.error(e);
    if (modelSelect) modelSelect.innerHTML = "<option>Brak danych dla tej marki</option>";
    if (priceEl) priceEl.textContent = "—";
  }
}