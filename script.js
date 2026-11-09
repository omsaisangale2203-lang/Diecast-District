
"use strict";

const STORAGE_KEY = "diecastDistrictGarage";

// ------------------------------
// ELEMENTS
// ------------------------------

const carForm = document.querySelector("#car-form");
const showFormButton = document.querySelector("#show-car-form");
const cancelFormButton = document.querySelector("#cancel-car-form");
const carList = document.querySelector("#car-list");
const emptyMessage = document.querySelector("#empty-message");
const searchInput = document.querySelector("#car-search");
const brandFilter = document.querySelector("#brand-filter");
const formMessage = document.querySelector("#form-message");

const photoInput = document.querySelector("#photo");
const photoUrlInput = document.querySelector("#photo-url");
const photoPreview = document.querySelector("#photo-preview");
const previewImage = document.querySelector("#preview-image");
const removePhotoButton = document.querySelector("#remove-photo");

const brandSearchInput = document.querySelector("#brand-search");
const brandGrid = document.querySelector("#brand-grid");
const brandNoResults = document.querySelector("#brand-no-results");

let cars = loadCars();
let previewObjectUrl = null;

// Keep the selected brand separately so rendering cannot reset it.
let selectedGarageBrand = "all";

// ------------------------------
// STORAGE
// ------------------------------

function loadCars() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed)
      ? parsed.filter(
          car =>
            car &&
            typeof car.id === "string" &&
            typeof car.model === "string" &&
            typeof car.brand === "string"
        )
      : [];
  } catch (error) {
    console.error("Could not load the garage:", error);
    return [];
  }
}

function saveCars() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
    return true;
  } catch (error) {
    console.error("Could not save the garage:", error);
    return false;
  }
}

// ------------------------------
// HELPERS
// ------------------------------

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function getSafeImageUrl(value) {
  if (typeof value !== "string" || !value) return "";

  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}

// ------------------------------
// IMAGE COMPRESSION
// ------------------------------

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please select a valid image file."));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Please choose an image smaller than 10 MB."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read this image. Try another photo."));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(new Error("This image could not be opened."));
      };

      image.onload = () => {
        const ratio = Math.min(
          900 / image.width,
          700 / image.height,
          1
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Could not process this image."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        try {
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch (error) {
          reject(new Error("Could not process this image."));
        }
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

// ------------------------------
// PHOTO PREVIEW
// ------------------------------

function clearPhotoPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  if (photoPreview) photoPreview.hidden = true;
  if (previewImage) previewImage.removeAttribute("src");
}

function showPhotoPreview(source, isUploadedFile = false) {
  if (!photoPreview || !previewImage || !source) return;

  clearPhotoPreview();

  previewImage.src = isUploadedFile
    ? URL.createObjectURL(source)
    : source;

  if (isUploadedFile) {
    previewObjectUrl = previewImage.src;
  }

  photoPreview.hidden = false;
}

if (photoInput) {
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) {
      clearPhotoPreview();
      return;
    }

    if (!file.type.startsWith("image/")) {
      photoInput.value = "";
      clearPhotoPreview();

      if (formMessage) {
        formMessage.textContent = "Please select an image file.";
      }
      return;
    }

    if (photoUrlInput) photoUrlInput.value = "";

    showPhotoPreview(file, true);

    if (formMessage) formMessage.textContent = "";
  });
}

if (photoUrlInput) {
  photoUrlInput.addEventListener("input", () => {
    const url = photoUrlInput.value.trim();

    if (url && photoInput) photoInput.value = "";

    clearPhotoPreview();

    const safeUrl = getSafeImageUrl(url);

    if (safeUrl) showPhotoPreview(safeUrl);

    if (formMessage) formMessage.textContent = "";
  });
}

if (previewImage) {
  previewImage.addEventListener("error", () => {
    clearPhotoPreview();

    if (formMessage) {
      formMessage.textContent =
        "Could not display that image. Try another photo or URL.";
    }
  });
}

if (removePhotoButton) {
  removePhotoButton.addEventListener("click", () => {
    if (photoInput) photoInput.value = "";
    if (photoUrlInput) photoUrlInput.value = "";

    clearPhotoPreview();

    if (formMessage) formMessage.textContent = "";
  });
}

// ------------------------------
// BRAND FILTER OPTIONS
// ------------------------------

function updateBrandFilter() {
  if (!brandFilter) return;

  const brands = [
    ...new Set(
      cars.map(car => car.brand.trim()).filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  // Remember the selected brand before rebuilding the options.
  const previousSelection = selectedGarageBrand;

  brandFilter.replaceChildren();
  brandFilter.add(new Option("All brands", "all"));

  brands.forEach(brand => {
    brandFilter.add(new Option(brand, brand));
  });

  const matchingBrand = brands.find(
    brand =>
      brand.toLowerCase() === previousSelection.trim().toLowerCase()
  );

  selectedGarageBrand = matchingBrand || "all";
  brandFilter.value = selectedGarageBrand;
}

// ------------------------------
// CAR DETAILS MODAL
// ------------------------------
// ==========================================
// MARKET VALUATION - HELPER FUNCTIONS
// ==========================================

// Format prices in Indian Rupees
function formatMarketPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}


// Calculate the median of comparable sale prices
function calculateMarketMedian(prices) {

    const validPrices = prices
        .map(Number)
        .filter(price => Number.isFinite(price) && price > 0)
        .sort((a, b) => a - b);

    if (validPrices.length < 3) {
        return null;
    }

    const middle = Math.floor(validPrices.length / 2);

    if (validPrices.length % 2 === 0) {
        return (
            validPrices[middle - 1] +
            validPrices[middle]
        ) / 2;
    }

    return validPrices[middle];
}


// Save a confirmed market valuation for a car
function saveMarketValuation(carId, sales) {

    const validSales = sales.filter(sale =>
        Number.isFinite(Number(sale.price)) &&
        Number(sale.price) > 0
    );

    if (validSales.length < 3) {
        return {
            success: false,
            message: "Please enter at least 3 valid comparable sale prices."
        };
    }

    const marketMedian = calculateMarketMedian(
        validSales.map(sale => sale.price)
    );

    if (marketMedian === null) {
        return {
            success: false,
            message: "Could not calculate the market value."
        };
    }

    const carIndex = cars.findIndex(car => car.id === carId);

    if (carIndex === -1) {
        return {
            success: false,
            message: "Car not found in your Garage."
        };
    }

    const previousCar = { ...cars[carIndex] };

    cars[carIndex].marketValue = marketMedian;

    cars[carIndex].marketValuation = {
        sales: validSales.map(sale => ({
            price: Number(sale.price),
            source: String(sale.source || "").trim(),
            date: sale.date || new Date().toISOString().slice(0, 10)
        })),
        median: marketMedian,
        confirmed: true,
        confirmedAt: new Date().toISOString()
    };

    if (!saveCars()) {

        cars[carIndex] = previousCar;

        return {
            success: false,
            message: "Could not save the valuation. Please try again."
        };
    }

    updateCollectionDashboard();

    return {
        success: true,
        message: "Market valuation saved successfully!",
        value: marketMedian
    };
}
// ==========================================
// MARKET VALUATION - DETAILS INTERFACE
// ==========================================

function createMarketValuationSection(car) {

    const section = makeElement("section", "market-valuation-panel");

    const heading = makeElement("h3", "", "Market Valuation");

    const description = makeElement(
        "p",
        "",
        "Enter at least 3 comparable completed sale prices to estimate this model's market value."
    );

    section.append(heading, description);

    // Show existing valuation, if available
    if (car.marketValuation && car.marketValuation.confirmed) {

        const savedValue = makeElement(
            "div",
            "market-valuation-result",
            "Confirmed estimated value: " +
            formatMarketPrice(car.marketValuation.median)
        );

        const saleCount = makeElement(
            "p",
            "",
            car.marketValuation.sales.length +
            " comparable sales recorded."
        );

        section.append(savedValue, saleCount);
    } else {

        section.append(
            makeElement(
                "p",
                "market-valuation-status",
                "No market valuation saved yet."
            )
        );
    }

    const form = makeElement("form", "market-valuation-form");

    // Create three comparable sale price fields
    for (let i = 1; i <= 3; i++) {

        const saleGroup = makeElement("div", "market-sale-input-group");

        const saleLabel = makeElement(
            "label",
            "",
            "Comparable sale " + i
        );

        const priceInput = makeElement("input");

        priceInput.type = "number";
        priceInput.min = "1";
        priceInput.step = "0.01";
        priceInput.placeholder = "Sale price in ₹";
        priceInput.required = true;
        priceInput.dataset.marketPrice = "true";

        const sourceInput = makeElement("input");

        sourceInput.type = "url";
        sourceInput.placeholder = "Source URL (optional)";
        sourceInput.dataset.marketSource = "true";

        saleGroup.append(
            saleLabel,
            priceInput,
            sourceInput
        );

        form.append(saleGroup);
    }

    const saveButton = makeElement(
        "button",
        "save-market-valuation",
        "Calculate & Save Valuation"
    );

    saveButton.type = "submit";

    const message = makeElement(
        "p",
        "market-valuation-message"
    );

    form.append(saveButton, message);

    form.addEventListener("submit", event => {

        event.preventDefault();

        const priceInputs = form.querySelectorAll("[data-market-price]");
        const sourceInputs = form.querySelectorAll("[data-market-source]");

        const sales = [...priceInputs].map((input, index) => ({
            price: Number(input.value),
            source: sourceInputs[index].value.trim(),
            date: new Date().toISOString().slice(0, 10)
        }));

        const result = saveMarketValuation(car.id, sales);

        message.textContent = result.message;

        if (result.success) {

            message.textContent +=
                " Estimated value: " + formatMarketPrice(result.value);

            // Refresh the saved valuation display
            const updatedCar = cars.find(item => item.id === car.id);

            if (updatedCar) {
                const refreshedSection =
                    createMarketValuationSection(updatedCar);

                section.replaceWith(refreshedSection);
            }
        }
    });

    section.append(form);

    return section;
}
function openCarDetails(car) {
  let modal = document.querySelector("#car-detail-modal");

  if (!modal) {
    modal = makeElement("div", "car-detail-modal");
    modal.id = "car-detail-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Car details");
    document.body.append(modal);
  }

  modal.replaceChildren();

  const panel = makeElement("div", "car-detail-panel");
  const closeButton = makeElement("button", "detail-close", "×");

  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close car details");

  const photo = makeElement("div", "detail-photo");
  const imageUrl = getSafeImageUrl(car.photo);

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = car.model;

    image.addEventListener("error", () => {
      image.remove();
      photo.append(makeElement("span", "car-placeholder", "DD"));
    }, { once: true });

    photo.append(image);
  } else {
    photo.append(makeElement("span", "car-placeholder", "DD"));
  }

  const info = makeElement("div", "detail-info");

  info.append(makeElement("p", "car-brand", car.brand));
  info.append(makeElement("h2", "detail-title", car.model));
  info.append(makeElement("span", "detail-scale", car.scale || "1:64"));

  const specs = makeElement("div", "detail-specs");
  const rows = [
    ["Brand", car.brand],
    ["Scale", car.scale || "1:64"]
  ];

  if (car.price !== null && car.price !== undefined) {
    rows.push([
      "Purchase price",
      `₹${Number(car.price).toLocaleString("en-IN")}`
    ]);
  }

  rows.forEach(([label, value]) => {
    const row = makeElement("div", "detail-spec-row");

    row.append(
      makeElement("span", "", label),
      makeElement("strong", "", value)
    );

    specs.append(row);
  });

  info.append(specs);
  // Add Market Valuation section
info.append(createMarketValuationSection(car));
  info.append(
    makeElement(
      "p",
      "detail-note",
      "Part of this collector's personal garage."
    )
  );

  panel.append(closeButton, photo, info);
  modal.append(panel);

  function closeModal() {
    modal.hidden = true;
    modal.style.display = "none";
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") closeModal();
  }

  closeButton.addEventListener("click", closeModal);

  modal.onclick = event => {
    if (event.target === modal) closeModal();
  };

  document.addEventListener("keydown", onKeyDown);

  modal.hidden = false;
  modal.style.display = "flex";
  closeButton.focus();
}

// ------------------------------
// CAR CARD
// ------------------------------

function createCarCard(car) {
  const card = makeElement("article", "car-card");
  const photoArea = makeElement("div", "car-photo");
  const imageUrl = getSafeImageUrl(car.photo);

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = car.model;
    image.loading = "lazy";

    image.addEventListener("error", () => {
      image.remove();
      photoArea.append(makeElement("span", "car-placeholder", "DD"));
    }, { once: true });

    photoArea.append(image);
  } else {
    photoArea.append(makeElement("span", "car-placeholder", "DD"));
  }

  const details = makeElement("div", "car-details");

  details.append(makeElement("p", "car-brand", car.brand));
  details.append(makeElement("h4", "", car.model));
  details.append(
    makeElement("p", "car-meta", `Scale: ${car.scale || "1:64"}`)
  );

  if (car.price !== null && car.price !== undefined) {
    details.append(
      makeElement(
        "p",
        "car-price",
        `Purchase price: ₹${Number(car.price).toLocaleString("en-IN")}`
      )
    );
  }

  const viewButton = makeElement(
    "button",
    "view-details",
    "View Details ↗"
  );

  viewButton.type = "button";
  viewButton.addEventListener("click", () => openCarDetails(car));

  const deleteButton = makeElement(
    "button",
    "delete-car",
    "Remove from garage"
  );

  deleteButton.type = "button";

  deleteButton.addEventListener("click", () => {
    if (!window.confirm(`Remove ${car.model} from your garage?`)) {
      return;
    }

    const previousCars = cars;
    cars = cars.filter(item => item.id !== car.id);

    if (!saveCars()) {
      cars = previousCars;
      window.alert("Could not save the change. Your car was not removed.");
      return;
    }

    renderGarage();
  });

  details.append(viewButton, deleteButton);
  card.append(photoArea, details);

  return card;
}

// ------------------------------
// RENDER GARAGE
// ------------------------------

function renderGarage() {
  if (!carList || !emptyMessage || !searchInput || !brandFilter) return;

  // Rebuild options without losing the separately stored selection.
  updateBrandFilter();

  const query = searchInput.value.trim().toLowerCase();
  const selectedBrand = selectedGarageBrand.toLowerCase();

  const filteredCars = cars.filter(car => {
    const matchesSearch =
      car.model.toLowerCase().includes(query) ||
      car.brand.toLowerCase().includes(query);

    const matchesBrand =
      selectedBrand === "all" ||
      car.brand.trim().toLowerCase() === selectedBrand;

    return matchesSearch && matchesBrand;
  });

  carList.replaceChildren();

  filteredCars.forEach(car => {
    carList.append(createCarCard(car));
  });

  const totalCars = document.querySelector("#total-cars");
  const totalBrands = document.querySelector("#total-brands");

  if (totalCars) totalCars.textContent = cars.length;

  if (totalBrands) {
    totalBrands.textContent = new Set(
      cars.map(car => car.brand.trim().toLowerCase())
    ).size;
  }

  emptyMessage.hidden = filteredCars.length > 0;

  if (cars.length > 0 && filteredCars.length === 0) {
    emptyMessage.textContent = "No cars match your search.";
  } else {
    emptyMessage.textContent =
      "Your garage is waiting. Add your first model to get started.";
  }
}

// ------------------------------
// FORM CONTROLS
// ------------------------------

if (showFormButton && carForm) {
  showFormButton.addEventListener("click", () => {
    carForm.hidden = false;

    if (formMessage) formMessage.textContent = "";

    if (carForm.elements.model) {
      carForm.elements.model.focus();
    }
  });
}

if (cancelFormButton && carForm) {
  cancelFormButton.addEventListener("click", () => {
    carForm.reset();
    clearPhotoPreview();
    carForm.hidden = true;

    if (formMessage) formMessage.textContent = "";
  });
}

// ------------------------------
// ADD A CAR
// ------------------------------

if (carForm) {
  carForm.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(carForm);

    const model = String(formData.get("model") || "").trim();
    const brand = String(formData.get("brand") || "").trim();
    const scale = String(formData.get("scale") || "1:64");
    const rawPrice = String(formData.get("price") || "").trim();

    const photoFile = photoInput?.files?.[0] || null;
    const photoUrl = photoUrlInput?.value.trim() || "";

    if (!model || !brand) {
      if (formMessage) {
        formMessage.textContent = "Please enter a model name and brand.";
      }
      return;
    }

    if (photoFile && photoUrl) {
      if (formMessage) {
        formMessage.textContent =
          "Please upload a photo OR enter an image URL, not both.";
      }
      return;
    }

    let price = null;

    if (rawPrice !== "") {
      price = Number(rawPrice);

      if (!Number.isFinite(price) || price < 0) {
        if (formMessage) {
          formMessage.textContent = "Enter a valid purchase price.";
        }
        return;
      }
    }

    let photo = "";

    if (photoUrl) {
      photo = getSafeImageUrl(photoUrl);

      if (!photo) {
        if (formMessage) {
          formMessage.textContent =
            "Enter a valid HTTP or HTTPS image URL.";
        }
        return;
      }
    }

    if (photoFile) {
      if (formMessage) formMessage.textContent = "Processing your photo...";

      try {
        photo = await compressImage(photoFile);
      } catch (error) {
        if (formMessage) formMessage.textContent = error.message;
        return;
      }
    }

    const car = {
      id: crypto.randomUUID(),
      model,
      brand,
      scale,
      price,
      photo
    };

    cars.push(car);

    if (!saveCars()) {
      cars.pop();

      if (formMessage) {
        formMessage.textContent =
          "Could not save. Browser storage may be full. Try a smaller photo.";
      }
      return;
    }

    carForm.reset();
    clearPhotoPreview();
    carForm.hidden = true;

    if (searchInput) searchInput.value = "";

    selectedGarageBrand = "all";

    if (formMessage) formMessage.textContent = "";

    renderGarage();
  });
}

// ------------------------------
// SEARCH AND DROPDOWN EVENTS
// ------------------------------

if (searchInput) {
  searchInput.addEventListener("input", renderGarage);
}

if (brandFilter) {
  brandFilter.addEventListener("change", () => {
    selectedGarageBrand = brandFilter.value || "all";
    renderGarage();
  });
}

// ------------------------------
// EXPLORE BRANDS SEARCH
// ------------------------------

if (brandSearchInput && brandGrid) {
  brandSearchInput.addEventListener("input", () => {
    const query = brandSearchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    brandGrid.querySelectorAll(".brand-card").forEach(card => {
      const brandName = (card.dataset.brand || "").toLowerCase();
      const matches = brandName.includes(query);

      card.hidden = !matches;

      if (matches) visibleCount++;
    });

    if (brandNoResults) {
      brandNoResults.hidden = visibleCount > 0;
    }
  });

  // Only one click handler for all Explore Brand buttons.
  brandGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-filter-brand]");
    if (!button) return;

    const requestedBrand = (
      button.dataset.filterBrand || ""
    ).trim();

    if (!requestedBrand) return;

    if (requestedBrand.toLowerCase() === "other") {
      selectedGarageBrand = "all";
    } else {
      // Match against actual saved cars, ignoring capitalization/spaces.
      const matchingCar = cars.find(
        car =>
          car.brand.trim().toLowerCase() ===
          requestedBrand.toLowerCase()
      );

      selectedGarageBrand = matchingCar
        ? matchingCar.brand.trim()
        : requestedBrand;
    }

    // Update the dropdown options, then select the requested brand.
    updateBrandFilter();

    if (
      selectedGarageBrand !== "all" &&
      ![...brandFilter.options].some(
        option =>
          option.value.toLowerCase() ===
          selectedGarageBrand.toLowerCase()
      )
    ) {
      // A brand with no cars can still be selected to show zero results.
      brandFilter.add(new Option(selectedGarageBrand, selectedGarageBrand));
    }

    brandFilter.value = selectedGarageBrand;

    // Apply the filter and scroll to My Garage.
    renderGarage();

    const garageSection = document.querySelector("#garage");

    if (garageSection) {
      garageSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

// ------------------------------
// STARTUP
// ------------------------------

renderGarage();
// ==========================================
// DIECAST DISTRICT - COLLECTION VALUE DASHBOARD
// ==========================================

function updateCollectionDashboard() {

    const STORAGE_KEY = "diecastDistrictGarage";

    // Get saved cars from Local Storage
    const cars = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    let totalPurchaseSpend = 0;
    let estimatedMarketValue = 0;

    let pricedCarCount = 0;
    let marketDataCount = 0;

    let difference = 0;
    let comparableCarCount = 0;

    cars.forEach(car => {

        // Calculate purchase price
        const purchasePrice = Number(car.price);

        if (car.price !== "" && car.price !== undefined &&
            Number.isFinite(purchasePrice) && purchasePrice >= 0) {

            totalPurchaseSpend += purchasePrice;
            pricedCarCount++;
        }

        // Calculate market value when available
        const marketValue = Number(car.marketValue);

        if (car.marketValue !== undefined &&
            car.marketValue !== "" &&
            Number.isFinite(marketValue) &&
            marketValue >= 0) {

            estimatedMarketValue += marketValue;
            marketDataCount++;

            // Compare only cars having both values
            if (car.price !== "" &&
                car.price !== undefined &&
                Number.isFinite(purchasePrice) &&
                purchasePrice >= 0) {

                difference += marketValue - purchasePrice;
                comparableCarCount++;
            }
        }
    });

    // Format currency
    const formatPrice = amount =>
        "₹" + amount.toLocaleString("en-IN");

    // Update dashboard
    document.getElementById("total-purchase-spend").textContent =
        formatPrice(totalPurchaseSpend);

    document.getElementById("priced-car-count").textContent =
        pricedCarCount;

    document.getElementById("market-data-count").textContent =
        marketDataCount;

    document.getElementById("estimated-market-value").textContent =
        marketDataCount > 0
            ? formatPrice(estimatedMarketValue)
            : "Not calculated";

    document.getElementById("market-value-caption").textContent =
        marketDataCount > 0
            ? marketDataCount + " cars have market estimates."
            : "Add market comparison data to calculate this value.";

    document.getElementById("collection-value-difference").textContent =
        comparableCarCount > 0
            ? (difference >= 0 ? "+" : "-") + formatPrice(Math.abs(difference))
            : "Not calculated";

    document.getElementById("collection-difference-caption").textContent =
        comparableCarCount > 0
            ? "Based on " + comparableCarCount + " comparable cars."
            : "Purchase and market values are needed for comparison.";
}

// Run when the page loads
document.addEventListener("DOMContentLoaded", () => {

    updateCollectionDashboard();

    // Update dashboard when Garage cards change
    const carList = document.getElementById("car-list");

    if (carList) {
        const observer = new MutationObserver(() => {
            updateCollectionDashboard();
        });

        observer.observe(carList, {
            childList: true,
            subtree: true
        });
    }
});