function getSelectedChains(url) {
  const chains = url.searchParams.getAll("chain").filter(Boolean);
  return chains.length > 0 ? [...new Set(chains)] : ["spar", "meny"];
}

function getCompareUnit(url) {
  return url.searchParams.get("compareUnit") === "l" ? "l" : "kg";
}

function getPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
