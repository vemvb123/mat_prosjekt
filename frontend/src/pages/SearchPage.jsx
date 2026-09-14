import NutrientResults from "../components/NutrientResults";
import ProductResults from "../components/ProductResults";
import SearchForm from "../components/SearchForm";
import StatusPanel from "../components/StatusPanel";
import { useSearchResults } from "../hooks/useSearchResults";

// Resultatside for både Produktsøk og Næringssøk.
//
// Siden viser samme skjema øverst, henter resultater basert på URL-state og
// velger riktig resultatkomponent ut fra aktiv søkemodus.
function SearchPage({ route, onSubmit, onPageChange }) {
  // Hooken håndterer loading/error/success og selve API-kallet.
  const searchState = useSearchResults(route);
  const result = searchState.data;

  return (
    <>
      <section className="masthead">
        <h1>Mat prisfinner</h1>
        <SearchForm route={route} onSubmit={onSubmit} />
      </section>
      <section className="results">
        {searchState.status === "loading" ? (
          <StatusPanel title="Søker" message={searchState.message || "Vi jobber med saken..."} />
        ) : null}
        {searchState.status === "error" ? (
          <StatusPanel title="Noe gikk galt" message={searchState.error} tone="error" />
        ) : null}
        {searchState.status === "success" && result && route.mode === "product" ? (
          <ProductResults result={result} onPageChange={onPageChange} />
        ) : null}
        {searchState.status === "success" && result && route.mode === "nutrient" ? (
          <NutrientResults result={result} onPageChange={onPageChange} />
        ) : null}
        {searchState.status === "idle" ? (
          <section className="panel empty-state">
            <h2>Ingen resultater ennå</h2>
            <p>Send inn et søk for å åpne en paginert resultatside med produkter.</p>
          </section>
        ) : null}
      </section>
    </>
  );
}

export default SearchPage;
