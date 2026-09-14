// Parser URL-parametere til kontrakten søkemodulene bruker.
//
// Dette holder validering/defaults samlet ett sted for både produkt- og
// næringssøk.

// Hvis ingen kjede er valgt, søker vi i begge støttede kjeder.
function getSelectedChains(url) {
  const chains = url.searchParams.getAll("chain").filter(Boolean);
  return chains.length > 0 ? [...new Set(chains)] : ["spar", "meny"];
}

// Bare kg og liter støttes som sammenligningsenhet i UI og gold-tabell.
function getCompareUnit(url) {
  return url.searchParams.get("compareUnit") === "l" ? "l" : "kg";
}

// Leser tall fra URL og faller tilbake hvis verdien mangler eller er ugyldig.
function getPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Normaliserer alle søkeparametere til typer resten av backend forventer.
function getSearchParams(url) {
  return {
    query: (url.searchParams.get("q") || "").trim(),
    mode: url.searchParams.get("mode") === "nutrient" ? "nutrient" : "product",
    chains: getSelectedChains(url),
    compareUnit: getCompareUnit(url),
    page: Math.max(1, getPositiveNumber(url.searchParams.get("page"), 1)),
    pageSize: Math.min(100, Math.max(1, getPositiveNumber(url.searchParams.get("pageSize"), 24))),
  };
}

export { getSearchParams };
