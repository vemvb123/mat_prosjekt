import { useEffect, useState } from "react";
import { fetchSearchResults } from "../lib/api";

const PAGE_SIZE = 10;

function useSearchResults(route) {
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: "",
    message: "",
  });

  useEffect(() => {
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
      cancelled = true;
    };
  }, [route]);

  return state;
}

export { useSearchResults };
