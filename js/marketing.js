(() => {
  "use strict";

  const money = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  const fields = [
    document.querySelector("#builder-stay"),
    document.querySelector("#builder-excursion"),
    document.querySelector("#builder-activity"),
  ];
  const extras = [...document.querySelectorAll("[data-builder-extra]")];
  const total = document.querySelector("#builder-total");
  const summary = document.querySelector("#builder-summary");
  const reset = document.querySelector("#builder-reset");

  if (!fields.every(Boolean) || !total || !summary || !reset) return;

  const updateEstimate = () => {
    const selected = fields
      .filter((field) => Number(field.value) > 0)
      .map((field) => ({
        label: field.closest("label").firstChild.textContent.trim(),
        price: Number(field.value),
      }));
    extras
      .filter((field) => field.checked)
      .forEach((field) => {
        selected.push({
          label: field.parentElement.querySelector("span").childNodes[0].textContent.trim(),
          price: Number(field.value),
        });
      });

    const amount = selected.reduce((sum, item) => sum + item.price, 0);
    total.textContent = money.format(amount) + " ARS";

    if (!selected.length) {
      summary.textContent =
        "Elegí los servicios para calcular una estimación ilustrativa.";
      return;
    }

    summary.textContent =
      selected.map((item) => item.label).join(" · ") +
      ". Estimación de referencia: " +
      money.format(amount) +
      " ARS. No incluye una reserva ni confirma disponibilidad.";
  };

  [...fields, ...extras].forEach((field) =>
    field.addEventListener("change", updateEstimate),
  );

  reset.addEventListener("click", () => {
    fields.forEach((field) => (field.selectedIndex = 0));
    extras.forEach((field) => (field.checked = false));
    updateEstimate();
  });

  updateEstimate();
})();