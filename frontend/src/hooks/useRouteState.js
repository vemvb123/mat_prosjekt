import { useEffect, useState } from "react";
import { readLocationState } from "../lib/router";

// Holder React-state synkronisert med browserens URL.
//
// Appen bruker ikke en router-pakke. I stedet leser vi location manuelt og
// oppdaterer state når brukeren går frem/tilbake i historikken.
function useRouteState() {
  const [route, setRoute] = useState(() => readLocationState());

  useEffect(() => {
    // popstate fyres når brukeren bruker tilbake/frem-knappene i nettleseren.
    const onPopState = () => {
      setRoute(readLocationState());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return {
    route,
    // Brukes etter pushState, fordi pushState ikke trigger popstate av seg selv.
    refreshRoute: () => setRoute(readLocationState()),
  };
}

export { useRouteState };
