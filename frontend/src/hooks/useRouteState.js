import { useEffect, useState } from "react";
import { readLocationState } from "../lib/router";

function useRouteState() {
  const [route, setRoute] = useState(() => readLocationState());

  useEffect(() => {
    const onPopState = () => {
      setRoute(readLocationState());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return {
    route,
    refreshRoute: () => setRoute(readLocationState()),
  };
}

export { useRouteState };
