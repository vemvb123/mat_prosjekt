import { startTransition } from "react";
import { useRouteState } from "./hooks/useRouteState";
import { updateUrl } from "./lib/router";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";

function App() {
  const { route, refreshRoute } = useRouteState();

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
