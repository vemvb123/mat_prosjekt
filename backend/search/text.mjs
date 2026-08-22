function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function splitNutrientQueries(searchQuery) {
  return [...new Set((searchQuery || "").split(/\s*(?:,|;|\+|\/|\bog\b|\band\b)\s*/i).map((part) => part.trim()).filter(Boolean))];
}

export { normalizeText, splitNutrientQueries };
