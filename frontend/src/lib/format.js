// Formateringshjelpere for UI.
//
// Alle tall og datoer går gjennom disse, så produktkort og resultater får samme
// norske visning overalt.

// Formaterer kroner/tall med to desimaler.
function formatNok(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

// Formaterer generiske næringstall med to desimaler.
function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

// Formaterer datoer hvis vi senere viser snapshot- eller historikkdatoer igjen.
function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export { formatDate, formatNok, formatNumber };
