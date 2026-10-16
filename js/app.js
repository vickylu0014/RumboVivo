(() => {
  "use strict";

  const { destinations, stays, indicatorNames } = window.RUMBO_DATA;
  const $ = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  // La entrega en un solo HTML incluye estas imágenes como datos locales.
  const imageSource = (filename) =>
    window.RUMBO_IMAGE_SOURCES?.[filename] ?? `assets/images/${filename}`;
  const icon = (name) =>
    `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const money = (value) => `$ ${number.format(value)}`;
  const destinationById = (id) => destinations.find((item) => item.id === id);
  const stayById = (id) => stays.find((item) => item.id === id);
  const dateISO = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offsetDate = (offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return dateISO(date);
  };
  const formatDate = (value) =>
    new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  // UTC evita diferencias de noches por cambios de horario de verano.
  const nights = (arrival, departure) =>
    (Date.parse(`${departure}T00:00:00Z`) -
      Date.parse(`${arrival}T00:00:00Z`)) /
    86400000;
  let toastTimer;
  let warnedAboutStorage = false;
  const toast = (message) => {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("#toast").hidden = true;
    }, 4500);
  };
  const readStore = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writeStore = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      if (!warnedAboutStorage)
        toast(
          "Tu navegador no permite guardar datos. Podés seguir usando la web durante esta visita.",
        );
      warnedAboutStorage = true;
      return false;
    }
  };

  const savedFavorites = readStore("rumbo-vivo:favorites", []);
  const favorites = new Set(
    Array.isArray(savedFavorites)
      ? savedFavorites.filter((id) => stayById(id))
      : [],
  );
  const compared = new Set();
  const defaults = () => ({
    destination: "",
    budget: 150000,
    type: "",
    local: false,
    accessible: false,
    environmental: false,
    onlyFavorites: false,
    sort: "recommended",
    travelers: 2,
    arrival: "",
    departure: "",
  });
  let state = defaults();
  const preferences = readStore("rumbo-vivo:preferences", {});
  if (
    preferences &&
    typeof preferences === "object" &&
    !Array.isArray(preferences)
  ) {
    if (destinationById(preferences.destination))
      state.destination = preferences.destination;
    if (
      Number.isInteger(preferences.budget) &&
      preferences.budget >= 20000 &&
      preferences.budget <= 150000
    )
      state.budget = preferences.budget;
    if (
      ["Cabaña", "Posada", "Hotel", "Hostel", "Departamento"].includes(
        preferences.type,
      )
    )
      state.type = preferences.type;
    for (const key of ["local", "accessible", "environmental"])
      state[key] = preferences[key] === true;
    if (["recommended", "price-asc", "price-desc"].includes(preferences.sort))
      state.sort = preferences.sort;
    if (
      Number.isInteger(preferences.travelers) &&
      preferences.travelers >= 1 &&
      preferences.travelers <= 6
    )
      state.travelers = preferences.travelers;
  }
  let visibleLimit = 6;
  const persistPreferences = () => {
    const { arrival, departure, onlyFavorites, ...saved } = state;
    writeStore("rumbo-vivo:preferences", saved);
  };
  const scrollToResults = () =>
    $("#alojamientos").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  const available = (stay) =>
    !state.arrival ||
    !stay.blocked.some(
      ([from, to]) =>
        state.arrival < offsetDate(to) && state.departure > offsetDate(from),
    );
  const filteredStays = () => {
    const result = stays.filter(
      (stay) =>
        (!state.destination || stay.destination === state.destination) &&
        stay.price <= state.budget &&
        stay.capacity >= state.travelers &&
        (!state.type || stay.type === state.type) &&
        (!state.local || stay.local) &&
        (!state.accessible || stay.accessible) &&
        (!state.environmental || stay.environmental) &&
        (!state.onlyFavorites || favorites.has(stay.id)) &&
        available(stay),
    );
    if (state.sort === "price-asc") result.sort((a, b) => a.price - b.price);
    if (state.sort === "price-desc") result.sort((a, b) => b.price - a.price);
    return result;
  };

  const syncInputs = () => {
    $("#filter-destination").value = state.destination;
    $("#search-destination").value = state.destination;
    $("#filter-budget").value = state.budget;
    $("#filter-type").value = state.type;
    $("#filter-local").checked = state.local;
    $("#filter-accessible").checked = state.accessible;
    $("#filter-environmental").checked = state.environmental;
    $("#filter-favorites").checked = state.onlyFavorites;
    $("#sort").value = state.sort;
    $("#travelers").value = state.travelers;
    $("#check-in").value = state.arrival;
    $("#check-out").value = state.departure;
    $("#check-in").min = dateISO(today);
    $("#check-out").min = state.arrival
      ? (() => {
          const d = new Date(`${state.arrival}T12:00:00`);
          d.setDate(d.getDate() + 1);
          return dateISO(d);
        })()
      : offsetDate(1);
    $("#budget-value").textContent = `Hasta ${money(state.budget)} ARS`;
    // Un valor del deslizador también se refleja exactamente en el buscador.
    $("#custom-budget")?.remove();
    if (
      !all("#search-budget option").some(
        (option) => Number(option.value) === state.budget,
      )
    ) {
      const option = document.createElement("option");
      option.id = "custom-budget";
      option.value = state.budget;
      option.textContent = `${money(state.budget)} ARS`;
      $("#search-budget").append(option);
    }
    $("#search-budget").value = state.budget;
  };

  const stayCard = (stay) => {
    const dest = destinationById(stay.destination);
    const isFavorite = favorites.has(stay.id);
    return `<article class="stay-card" data-stay="${stay.id}">
      <div class="stay-photo"><img src="${imageSource(stay.image)}" alt="Imagen ilustrativa del alojamiento ficticio ${stay.name}" width="500" height="350" loading="lazy">
        <span class="photo-tag">${icon(stay.local ? "shop" : "leaf")}${stay.local ? "Conexión local" : "Prácticas ambientales"}</span>
        <button class="favorite-toggle icon-button" type="button" data-favorite="${stay.id}" aria-label="${isFavorite ? "Quitar" : "Guardar"} ${stay.name} ${isFavorite ? "de" : "en"} favoritos" aria-pressed="${isFavorite}">${icon("heart")}</button>
      </div><div class="stay-body"><p class="stay-location">${icon("pin")}${dest.name} · ${stay.area}</p><h3>${stay.name}</h3><p class="stay-info">${stay.type} · Hasta ${stay.capacity} personas · ${stay.services[0]}</p>
      <p class="stay-price"><strong>${money(stay.price)}</strong><span class="currency">ARS</span><small>/ noche</small></p>
      <div class="stay-actions"><button class="detail-button" type="button" data-detail="${stay.id}" aria-label="Ver detalles de ${stay.name}">Ver detalles ${icon("arrow")}</button><label class="compare-label"><input type="checkbox" data-compare="${stay.id}" ${compared.has(stay.id) ? "checked" : ""} aria-label="Comparar ${stay.name}">Comparar</label></div></div></article>`;
  };

  const renderStays = () => {
    const result = filteredStays();
    $("#stays-grid").innerHTML = result
      .slice(0, visibleLimit)
      .map(stayCard)
      .join("");
    $("#results-count").innerHTML =
      `<strong>${result.length}</strong> ${result.length === 1 ? "alojamiento" : "alojamientos"}${state.onlyFavorites ? " en favoritos" : " para descubrir"}`;
    $("#empty-state").hidden = result.length !== 0;
    $("#load-more").hidden = result.length <= visibleLimit;
    $("#load-more").firstChild.textContent =
      `Ver los ${result.length} alojamientos `;
    const dateText = state.arrival
      ? `${formatDate(state.arrival)} al ${formatDate(state.departure)} · ${nights(state.arrival, state.departure)} noches · disponibilidad simulada`
      : "Sin fechas · disponibilidad orientativa";
    $("#search-summary").textContent =
      `${state.travelers} ${state.travelers === 1 ? "viajero" : "viajeros"} · ${dateText}`;
    $("#favorite-count").textContent = favorites.size;
    $("#open-favorites").setAttribute(
      "aria-label",
      `Ver mis favoritos, ${favorites.size} guardados`,
    );
  };
  const applyFilters = () => {
    visibleLimit = 6;
    syncInputs();
    renderStays();
    persistPreferences();
  };
  const clearSearchErrors = () => {
    $("#search-error").textContent = "";
    for (const input of [$("#check-in"), $("#check-out")])
      input.removeAttribute("aria-invalid");
  };
  const resetFilters = () => {
    state = defaults();
    clearSearchErrors();
    applyFilters();
  };

  for (const select of [$("#search-destination"), $("#filter-destination")]) {
    for (const dest of destinations) {
      const option = document.createElement("option");
      option.value = dest.id;
      option.textContent = `${dest.name}, ${dest.country}`;
      select.append(option);
    }
  }
  $("#destination-grid").innerHTML = destinations
    .map(
      (dest) =>
        `<a class="destination-card reveal" href="#alojamientos" data-destination="${dest.id}" aria-label="Explorar alojamientos en ${dest.name}, ${dest.country}"><img src="${imageSource(dest.image)}" alt="Paisaje de ${dest.name}" loading="lazy" width="600" height="500"><span class="country">${icon("pin")}${dest.country}</span><div><h3>${dest.name}</h3><p>${dest.tag}</p></div><span class="round-arrow">${icon("northeast")}</span><div class="destination-description" aria-hidden="true"><h3>${dest.name}</h3><p>${dest.description}</p><span>Explorar alojamientos ${icon("arrow")}</span></div></a>`,
    )
    .join("");

  $("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    clearSearchErrors();
    const arrival = $("#check-in").value,
      departure = $("#check-out").value;
    let error = "",
      input;
    if (arrival && !departure) {
      error = "Elegí una fecha de salida para completar tu búsqueda.";
      input = $("#check-out");
    } else if (!arrival && departure) {
      error = "Elegí una fecha de entrada para completar tu búsqueda.";
      input = $("#check-in");
    } else if (arrival && arrival < dateISO(today)) {
      error = "La fecha de entrada no puede ser anterior a hoy.";
      input = $("#check-in");
    } else if (arrival && departure <= arrival) {
      error = "La salida debe ser posterior a la entrada.";
      input = $("#check-out");
    }
    if (error) {
      $("#search-error").textContent = error;
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    state.arrival = arrival;
    state.departure = departure;
    state.destination = $("#search-destination").value;
    state.budget = Number($("#search-budget").value);
    state.travelers = Number($("#travelers").value);
    applyFilters();
    scrollToResults();
  });
  $("#check-in").addEventListener("change", () => {
    const arrival = $("#check-in").value;
    const date = arrival ? new Date(`${arrival}T12:00:00`) : new Date(today);
    date.setDate(date.getDate() + 1);
    $("#check-out").min = dateISO(date);
    clearSearchErrors();
  });
  $("#check-out").addEventListener("change", clearSearchErrors);
  $("#filters-form").addEventListener("submit", (event) =>
    event.preventDefault(),
  );
  $("#filters-form").addEventListener("change", () => {
    state.destination = $("#filter-destination").value;
    state.budget = Number($("#filter-budget").value);
    state.type = $("#filter-type").value;
    state.local = $("#filter-local").checked;
    state.accessible = $("#filter-accessible").checked;
    state.environmental = $("#filter-environmental").checked;
    state.onlyFavorites = $("#filter-favorites").checked;
    applyFilters();
  });
  $("#filter-budget").addEventListener("input", () => {
    state.budget = Number($("#filter-budget").value);
    applyFilters();
  });
  $("#sort").addEventListener("change", () => {
    state.sort = $("#sort").value;
    applyFilters();
  });
  $("#clear-filters").addEventListener("click", resetFilters);
  $("#empty-reset").addEventListener("click", resetFilters);
  $("#load-more").addEventListener("click", () => {
    const firstNew = visibleLimit;
    visibleLimit = stays.length;
    renderStays();
    const next = all(".stay-card")[firstNew]?.querySelector("[data-detail]");
    next?.focus({ preventScroll: true });
    all(".stay-card")[firstNew]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  });
  $("#open-favorites").addEventListener("click", () => {
    state = { ...defaults(), onlyFavorites: true };
    clearSearchErrors();
    applyFilters();
    scrollToResults();
  });

  const openDialog = (dialog) => {
    closeMenu();
    dialog.showModal();
    document.body.classList.add("modal-open");
  };
  let currentDetailId = null;
  const showDetails = (id) => {
    const stay = stayById(id);
    if (!stay) return;
    currentDetailId = id;
    const dest = destinationById(stay.destination);
    $("#detail-content").innerHTML =
      `<img class="detail-photo" src="${imageSource(stay.image)}" alt="Imagen ilustrativa de ${stay.name}" width="700" height="300"><div class="detail-inner"><p class="eyebrow">ALOJAMIENTO FICTICIO · ${dest.country.toLocaleUpperCase("es-AR")}</p><h2 id="detail-title">${stay.name}</h2><p class="detail-meta">${dest.name} · ${stay.area}<br>${stay.type} · Capacidad máxima: ${stay.capacity} personas</p><p class="detail-description">${stay.description}</p><div class="detail-services">${stay.services.map((service) => `<span class="service">${service}</span>`).join("")}</div><h3>Lo que propone este lugar</h3><ul class="practice-list">${stay.practices.map((practice) => `<li>${icon("check")}<span>${practice}</span></li>`).join("")}</ul><h3>Indicadores de turismo responsable</h3><ul class="detail-indicators">${indicatorNames.map((name, index) => `<li><span>${name}</span><span class="indicator-status ${stay.indicators[index] ? "" : "unknown"}">${stay.indicators[index] ? "Práctica declarada" : "Sin información"}</span></li>`).join("")}</ul><p class="detail-notice"><strong>Información ilustrativa, sin verificación externa.</strong> No es una certificación ni una evaluación oficial. Las características de accesibilidad son ejemplos declarados; en un viaje real se deben confirmar las necesidades concretas con el establecimiento. La fotografía es de referencia.</p><div class="detail-bottom"><p class="detail-price">${money(stay.price)} ARS<small>Por unidad y noche · precio ilustrativo</small></p><button class="button button-green" id="demo-plan" type="button">Armar plan de ejemplo ${icon("arrow")}</button></div><div class="plan-result" id="plan-result" role="status" hidden></div></div>`;
    openDialog($("#detail-dialog"));
  };

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button,a");
    if (!target) return;
    if (target.dataset.destination) {
      state = { ...defaults(), destination: target.dataset.destination };
      clearSearchErrors();
      applyFilters();
    }
    if (target.dataset.impactFilter) {
      state = { ...defaults(), [target.dataset.impactFilter]: true };
      clearSearchErrors();
      applyFilters();
    }
    if (target.dataset.favorite) {
      const id = target.dataset.favorite;
      const removed = favorites.has(id);
      if (removed) favorites.delete(id);
      else favorites.add(id);
      const saved = writeStore("rumbo-vivo:favorites", [...favorites]);
      if (saved)
        toast(
          removed
            ? "Alojamiento quitado de tus favoritos."
            : "Guardado. Tu próximo viaje empieza a tomar forma.",
        );
      renderStays();
      const replacement = $(`[data-favorite="${id}"]`);
      if (replacement) replacement.focus({ preventScroll: true });
      else {
        $("#results-count").tabIndex = -1;
        $("#results-count").focus({ preventScroll: true });
      }
    }
    if (target.dataset.detail) showDetails(target.dataset.detail);
    if (target.dataset.close) $(`#${target.dataset.close}`).close();
    if (target.id === "demo-plan") {
      const stay = stayById(currentDetailId);
      const plan = $("#plan-result");
      let text;
      if (state.arrival && !available(stay))
        text =
          "Este alojamiento no está disponible en las fechas simuladas elegidas. Probá con otras fechas desde el buscador.";
      else if (state.travelers > stay.capacity)
        text = `La capacidad máxima es de ${stay.capacity} personas. Cambiá la cantidad de viajeros o elegí otro alojamiento.`;
      else if (state.arrival) {
        const count = nights(state.arrival, state.departure);
        text = `${formatDate(state.arrival)} al ${formatDate(state.departure)} · ${state.travelers} viajeros · ${count} ${count === 1 ? "noche" : "noches"}.<br><strong>Total ilustrativo de alojamiento: ${money(stay.price * count)} ARS.</strong> No incluye transporte, comidas ni posibles cargos de un viaje real.`;
      } else
        text = `Una idea para ${state.travelers} ${state.travelers === 1 ? "viajero" : "viajeros"}, desde ${money(stay.price)} ARS por unidad y noche. Elegí entrada y salida en el buscador para calcular un total ilustrativo.`;
      plan.innerHTML = `<h3>Tu plan de viaje · simulación</h3><p>${stay.name}, ${destinationById(stay.destination).name}.<br>${text}</p><p><strong>Esto no es una reserva.</strong> No se confirma disponibilidad real, no se procesa ningún pago ni se envían datos.</p>`;
      plan.hidden = false;
      plan.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  const updateCompare = () => {
    $("#compare-bar").hidden = compared.size === 0;
    $("#compare-count").textContent = compared.size;
    $("#open-compare").disabled = compared.size < 2;
    $("#open-compare").setAttribute(
      "aria-label",
      compared.size < 2
        ? "Elegí al menos dos alojamientos para comparar"
        : `Comparar ${compared.size} alojamientos`,
    );
    for (const checkbox of all("[data-compare]"))
      checkbox.checked = compared.has(checkbox.dataset.compare);
  };
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.dataset.compare) return;
    const id = input.dataset.compare;
    if (input.checked && compared.size >= 3) {
      input.checked = false;
      toast(
        "Podés comparar hasta 3 alojamientos. Quitá uno para agregar otro.",
      );
      return;
    }
    if (input.checked) compared.add(id);
    else compared.delete(id);
    updateCompare();
    if (compared.size === 1)
      toast("Elegí al menos otro alojamiento para abrir la comparación.");
  });
  $("#clear-compare").addEventListener("click", () => {
    compared.clear();
    updateCompare();
  });
  $("#open-compare").addEventListener("click", () => {
    if (compared.size < 2) return;
    const selected = [...compared].map(stayById);
    const row = (name, value) =>
      `<tr><th scope="row">${name}</th>${selected.map((stay) => `<td>${value(stay)}</td>`).join("")}</tr>`;
    $("#compare-content").innerHTML =
      `<table class="comparison-table"><caption class="sr-only">Comparación de alojamientos ficticios seleccionados</caption><thead><tr><th scope="col">Tu próxima estadía</th>${selected.map((stay) => `<th scope="col">${stay.name}</th>`).join("")}</tr></thead><tbody>${row("Destino", (stay) => `${destinationById(stay.destination).name} · ${stay.area}`)}${row("Precio por noche", (stay) => `<strong>${money(stay.price)} ARS</strong>`)}${row("Tipo y capacidad", (stay) => `${stay.type} · Hasta ${stay.capacity} personas`)}${row("Servicios", (stay) => stay.services.join(" · "))}${indicatorNames.map((name, index) => row(name, (stay) => (stay.indicators[index] ? "Práctica declarada" : "Sin información"))).join("")}${row("Verificación externa", () => "Sin verificación · ejemplo académico")}${row("Disponibilidad", (stay) => (state.arrival ? (available(stay) ? "Disponible en la simulación" : "No disponible en las fechas simuladas") : "Elegí fechas en el buscador"))}${row("Más información", (stay) => `<button class="text-link" type="button" data-compare-detail="${stay.id}">Ver detalles ${icon("arrow")}</button>`)}</tbody></table>`;
    openDialog($("#compare-dialog"));
  });
  $("#compare-content").addEventListener("click", (event) => {
    const button = event.target.closest("[data-compare-detail]");
    if (!button) return;
    $("#compare-dialog").close();
    showDetails(button.dataset.compareDetail);
  });
  for (const dialog of all("dialog")) {
    dialog.addEventListener("close", () => {
      if (!all("dialog").some((item) => item.open))
        document.body.classList.remove("modal-open");
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
  }

  const closeMenu = (returnFocus = false) => {
    $("#main-nav").classList.remove("is-open");
    $("#menu-toggle").setAttribute("aria-expanded", "false");
    $("#menu-toggle").setAttribute("aria-label", "Abrir menú");
    $("#menu-toggle use").setAttribute("href", "#i-menu");
    if (returnFocus) $("#menu-toggle").focus({ preventScroll: true });
  };
  $("#menu-toggle").addEventListener("click", () => {
    const isOpen = $("#main-nav").classList.toggle("is-open");
    $("#menu-toggle").setAttribute("aria-expanded", String(isOpen));
    $("#menu-toggle").setAttribute(
      "aria-label",
      isOpen ? "Cerrar menú" : "Abrir menú",
    );
    $("#menu-toggle use").setAttribute("href", isOpen ? "#i-close" : "#i-menu");
  });
  $("#main-nav").addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#main-nav").classList.contains("is-open"))
      closeMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-shell")) closeMenu();
  });
  matchMedia("(min-width: 1101px)").addEventListener("change", () =>
    closeMenu(),
  );

  $("#contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    $("#contact-result").hidden = true;
    const fields = [
      {
        input: $("#contact-name"),
        error: $("#name-error"),
        valid: (value) => value.trim().length >= 2 && /\p{L}/u.test(value),
        message: "Escribí tu nombre (al menos 2 caracteres).",
      },
      {
        input: $("#contact-email"),
        error: $("#email-error"),
        valid: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
        message: "Revisá el correo. Por ejemplo: vos@ejemplo.com.",
      },
      {
        input: $("#contact-reason"),
        error: $("#reason-error"),
        valid: (value) => Boolean(value),
        message: "Elegí un motivo de consulta.",
      },
      {
        input: $("#contact-message"),
        error: $("#message-error"),
        valid: (value) => value.trim().length >= 20,
        message:
          "Contanos un poco más: el mensaje necesita al menos 20 caracteres.",
      },
    ];
    let firstInvalid;
    for (const field of fields) {
      const valid = field.valid(field.input.value);
      field.error.textContent = valid ? "" : field.message;
      field.input.setAttribute("aria-invalid", String(!valid));
      if (!valid && !firstInvalid) firstInvalid = field.input;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    $("#contact-result").textContent =
      "Los datos pasan la validación. Esta prueba termina acá: el mensaje no se envió ni se guardó. Gracias por probar el formulario de Rumbo Vivo.";
    $("#contact-result").hidden = false;
  });
  $("#contact-form").addEventListener("input", (event) => {
    $("#contact-result").hidden = true;
    if (event.target.getAttribute("aria-invalid") === "true") {
      event.target.removeAttribute("aria-invalid");
      const errorId = event.target.getAttribute("aria-describedby");
      if (errorId) $(`#${errorId}`).textContent = "";
    }
  });

  document.addEventListener(
    "error",
    (event) => {
      if (event.target.tagName !== "IMG" || event.target.dataset.fallback)
        return;
      event.target.dataset.fallback = "true";
      event.target.src = imageSource("fallback.svg");
      event.target.alt = "Ilustración de un paisaje; fotografía no disponible";
    },
    true,
  );
  let scrollScheduled = false;
  const updateScroll = () => {
    $(".site-header").classList.toggle("scrolled", window.scrollY > 20);
    $("#back-top").hidden = window.scrollY < 700;
    scrollScheduled = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollScheduled) {
        requestAnimationFrame(updateScroll);
        scrollScheduled = true;
      }
    },
    { passive: true },
  );
  $("#back-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#current-year").textContent = new Date().getFullYear();
  syncInputs();
  renderStays();
  updateCompare();
  updateScroll();
  if ("IntersectionObserver" in window) {
    document.body.classList.add("js-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    all(".reveal").forEach((element) => observer.observe(element));
  }
})();
