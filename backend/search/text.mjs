// Teksthjelpere for søk.
//
// Målet er at matching skal tåle store/små bokstaver, aksenter og ekstra tegn.

// Normaliserer tekst til små bokstaver, uten aksenter og med enkel spacing.
function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Splitter flere næringsønsker hvis tekstsøk brukes, for eksempel "protein og salt".
function splitNutrientQueries(searchQuery) {
  return [...new Set((searchQuery || "").split(/\s*(?:,|;|\+|\/|\bog\b|\band\b)\s*/i).map((part) => part.trim()).filter(Boolean))];
}

export { normalizeText, splitNutrientQueries };
