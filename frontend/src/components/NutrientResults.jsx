import ProductCard from "./ProductCard";
import { formatNumber } from "../lib/format";

// Viser resultater for Næringssøk.
//
// Backend har allerede rangert produktene etter valgt næring per krone. Denne
// komponenten viser listen, eventuelle advarsler og paging-kontroller.

// Enkel pager som bare ber App endre URL-en til forrige/neste side.
function Pager({ result, onPageChange }) {
  return (
    <div className="pager">
      <button
        type="button"
        className="load-more-button"
        onClick={() => onPageChange(result.page - 1)}
        disabled={result.page <= 1}
      >
        Forrige
      </button>
      <p className="pager-label">
        Side {result.page} av {result.totalPages} • {result.total} produkter
      </p>
      <button
        type="button"
        className="load-more-button"
        onClick={() => onPageChange(result.page + 1)}
        disabled={result.page >= result.totalPages}
      >
        Neste
      </button>
    </div>
  );
}

function NutrientResults({ result, onPageChange }) {
  // API-et kan returnere tomme arrays/verdier, så UI bruker trygge defaults.
  const products = result.items || [];
  const nutrient = result.nutrient;
  const warnings = result.warnings || [];
  const missingQueries = result.missingQueries || [];

  if (products.length === 0) {
    return (
      <>
        {warnings.length > 0 || missingQueries.length > 0 ? (
          <section className="panel notice">
            <h2>Status</h2>
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </section>
        ) : null}
        <section className="panel empty-state">
          <h2>Ingen produkter å rangere for {nutrient?.DisplayName || "næringsstoff"}</h2>
          <p>Vi fant ingen produkter med positivt innhold og brukbar pris i snapshotet.</p>
        </section>
      </>
    );
  }

  const compareUnit = products[0]?.CompareUnit || "kg";
  // Per 100 g brukes for kg-varer, og per 100 ml brukes for liter-varer.
  const baseAmountLabel = compareUnit === "l" ? "100 ml" : "100 g";

  return (
    <>
      {warnings.length > 0 || missingQueries.length > 0 ? (
        <section className="panel notice">
          <h2>Status</h2>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}
      <section className="results-grid">
        {products.map((product) => (
          <ProductCard
            key={`${product.ProductKey}-${product.NutrientName}`}
            product={product}
            metric={`${formatNumber(product.NutrientAmountPer100g)} ${product.NutrientUnit} per ${baseAmountLabel}`}
          />
        ))}
      </section>
      <Pager result={result} onPageChange={onPageChange} />
    </>
  );
}

export default NutrientResults;
