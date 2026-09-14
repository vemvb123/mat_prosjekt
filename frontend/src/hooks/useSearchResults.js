import { useEffect, useState } from "react";
import { fetchSearchResults } from "../lib/api";

// Henter søkeresultater for aktiv URL-state.
//
// Frontend ber bare om siden brukeren ser. Backend henter og cacher større
// vinduer på ti sider, så UI-koden trenger ikke vite om prefetchingen.
const PAGE_SIZE = 10;

function useSearchResults(route) {
  // State beskriver hele livssyklusen til et søk: idle, loading, success, error.
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: "",
    message: "",
  });

  useEffect(() => {
    // Uten aktiv /search-URL eller query skal ingen request kjøres.
    if (route.path !== "/search" || !route.query.trim()) {
      setState({
        status: "idle",
        data: null,
        error: "",
        message: "",
      });
      return;
    }

    let cancelled = false;

    // Sett loading-state før requesten starter, slik at UI viser "Søker".
    setState({
      status: "loading",
      data: null,
      error: "",
      message: "Henter rangerte produkter...",
    });

    fetchSearchResults({
      mode: route.mode,
      query: route.query,
      chains: route.chains,
      compareUnit: route.compareUnit,
      page: route.page,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        // Ignorer svar fra gamle requests hvis brukeren har byttet søk raskt.
        if (!cancelled) {
          setState({
            status: "success",
            data,
            error: "",
            message: "",
          });
        }
      })
      .catch((error) => {
        // Samme cancellation-sjekk for feil, så gammel feil ikke overskriver nytt søk.
        if (!cancelled) {
          setState({
            status: "error",
            data: null,
            error: error.message,
            message: "",
          });
        }
      });

    return () => {
      // Cleanup kjøres før neste effect og ved unmount.
      cancelled = true;
    };
  }, [route]);

  return state;
}

export { useSearchResults };
