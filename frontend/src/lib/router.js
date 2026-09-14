const DEFAULT_CHAINS = ["spar", "meny"];
const DEFAULT_COMPARE_UNIT = "kg";
const DEFAULT_MODE = "nutrient";

// Minimal klientrouter.
//
// Appen bruker browserens URL som state i stedet for en full routerpakke. Dette
// gjør at søk kan deles som URL-er og at tilbake/frem fungerer.

// Leser aktiv URL og gjør den om til route-objektet resten av frontend bruker.
function readLocationState() {
  const url = new URL(window.location.href);
  const chains = url.searchParams.getAll("chain");

  return {
    path: url.pathname,
    query: url.searchParams.get("q") ?? "",
    mode: url.searchParams.get("mode") ?? DEFAULT_MODE,
    chains: chains.length > 0 ? chains : DEFAULT_CHAINS,
    compareUnit: url.searchParams.get("compareUnit") ?? DEFAULT_COMPARE_UNIT,
    page: Math.max(1, Number(url.searchParams.get("page") ?? "1")),
  };
}

// Skriver ny URL uten full side-refresh.
function updateUrl(path, params) {
  const url = new URL(window.location.origin);
  url.pathname = path;

  // Arrays legges inn som repeterte parametere, for eksempel chain=spar&chain=meny.
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        url.searchParams.append(key, item);
      });
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  window.history.pushState({}, "", `${url.pathname}${url.search}`);
}

export { readLocationState, updateUrl };
