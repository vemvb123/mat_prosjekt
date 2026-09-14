import { startTransition } from "react";
import { useRouteState } from "./hooks/useRouteState";
import { updateUrl } from "./lib/router";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";

// Rotkomponenten for frontend.
//
// App holder URL-en som sannhet for aktiv side, søkemodus, filter og side i
// pagineringen. Når URL-en endres, oppdateres route-state og riktig side vises.
function App() {
  const { route, refreshRoute } = useRouteState();

  // Starter et nytt søk og resetter paging til første side.
  function handleSearchSubmit(formState) {
    updateUrl("/search", {
      mode: formState.mode,
      q: formState.query,
      chain: formState.chains,
      compareUnit: formState.compareUnit,
      page: 1,
    });
    startTransition(refreshRoute);
  }

  // Oppdaterer kun page i URL når brukeren blar i resultater.
  function handlePageChange(page) {
    updateUrl("/search", {
      mode: route.mode,
      q: route.query,
      chain: route.chains,
      compareUnit: route.compareUnit,
      page,
    });
    startTransition(refreshRoute);
  }

  // Går hjem hvis det ikke finnes et aktivt søk, ellers bevarer søket i URL.
  function handleGoHome() {
    if (route.query) {
      updateUrl("/search", {
        mode: route.mode,
        q: route.query,
        chain: route.chains,
        compareUnit: route.compareUnit,
        page: route.page || 1,
      });
    } else {
      updateUrl("/", {});
    }
    startTransition(refreshRoute);
  }

  return (
    <div className="page-shell">
      {route.path === "/search" ? (
        <SearchPage route={route} onSubmit={handleSearchSubmit} onPageChange={handlePageChange} onBack={handleGoHome} />
      ) : (
        <HomePage route={route} onSubmit={handleSearchSubmit} />
      )}
    </div>
  );
}

export default App;
