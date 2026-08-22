const DEFAULT_CHAINS = ["spar", "meny"];
const DEFAULT_COMPARE_UNIT = "kg";
const DEFAULT_MODE = "nutrient";

function readLocationState() {
  const url = new URL(window.location.href);
  const chains = url.searchParams.getAll("chain");
  const path = url.pathname === "/product-history" ? "/product" : url.pathname;

  return {
    path,
    query: url.searchParams.get("q") ?? "",
    mode: url.searchParams.get("mode") ?? DEFAULT_MODE,
    chains: chains.length > 0 ? chains : DEFAULT_CHAINS,
    compareUnit: url.searchParams.get("compareUnit") ?? DEFAULT_COMPARE_UNIT,
    page: Math.max(1, Number(url.searchParams.get("page") ?? "1")),
    productKey: url.searchParams.get("productKey") ?? "",
  };
}

function updateUrl(path, params) {
  const url = new URL(window.location.origin);
  url.pathname = path;

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
