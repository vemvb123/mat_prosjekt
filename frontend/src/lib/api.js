// Frontend API-klient.
//
// VITE_API_BASE_URL kan peke til Azure Functions i deploy eller lokal Node-server
// i utvikling. Uten den brukes samme origin som frontend serveres fra.

// Bygger URL med støtte for query-parametere som kan ha flere verdier, som chain.
function buildApiUrl(path, params) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const url = new URL(path, baseUrl);

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

  return import.meta.env.VITE_API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`;
}

// Henter JSON og gir tydelige feil hvis serveren svarer tomt eller med HTML/tekst.
async function requestJson(url, options) {
  const response = await fetch(url, options);
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error("Serveren svarte tomt. Sjekk at Node-backenden kjører på port 3001.");
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Serveren svarte ikke med gyldig JSON. Første del av svaret: ${raw.slice(0, 160)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

// Kaller backend sitt /api/search-endpoint med samme parameterkontrakt som route.
function fetchSearchResults({ mode, query, chains, compareUnit, page, pageSize }) {
  return requestJson(
    buildApiUrl("/api/search", {
      mode,
      q: query,
      chain: chains,
      compareUnit,
      page,
      pageSize,
    }),
  );
}

export { fetchSearchResults };
