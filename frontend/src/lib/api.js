function buildApiUrl(path, params) {
  const url = new URL(path, window.location.origin);

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

  return `${url.pathname}${url.search}`;
}

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
    throw new Error("Serveren svarte ikke med gyldig JSON. Sjekk backend/proxy-oppsettet.");
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

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
