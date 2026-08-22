import { useEffect, useState } from "react";
import { fetchProductHistory } from "../lib/api";

function useProductHistory(route) {
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: "",
  });

  useEffect(() => {
    if (route.path !== "/product" || !route.productKey) {
      setState({
        status: "idle",
        data: null,
        error: "",
      });
      return;
    }

    let cancelled = false;
    setState({
      status: "loading",
      data: null,
      error: "",
    });

    fetchProductHistory(route.productKey, route.compareUnit)
      .then((data) => {
        if (!cancelled) {
          setState({
            status: "success",
            data,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            data: null,
            error: error.message,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [route]);

  return state;
}

export { useProductHistory };
