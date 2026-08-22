import HeroCard from "./HeroCard";
import ProductCard from "./ProductCard";
import { formatNok, formatNumber } from "../lib/format";

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

  const best = result.bestItem || products[0];
  const compareUnit = best.CompareUnit || "kg";
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
      <HeroCard
        eyebrow={`Mest ${best.NutrientName} per krone`}
        title={best.Name}
        brand={best.Brand}
        store={`${best.ChainName} | ${best.StoreName}`}
        subtitle={best.Subtitle}
        price={`${formatNok(best.Price)} kr`}
        unit={`${formatNok(best.PricePerCompareUnit)} kr/${compareUnit}`}
        description={`${formatNumber(best.NutrientAmountPer100g)} ${best.NutrientUnit} per ${baseAmountLabel} | ${formatNumber(best.NutrientAmountPerPackage)} ${best.NutrientUnit} per pakke | ${formatNumber(best.NutrientAmountPerKrone)} ${best.NutrientUnit} per krone`}
        imageUrl={best.ImageUrl}
        actions={
          <a className="text-link" href={best.ProductUrl} target="_blank" rel="noreferrer">
            Gå til produktsiden
          </a>
        }
      />
      <section className="results-grid">
        {products.map((product) => (
          <ProductCard
            key={`${product.ProductKey}-${product.NutrientName}`}
            product={product}
            metric={`${formatNumber(product.NutrientAmountPer100g)} ${product.NutrientUnit} per ${compareUnit === "l" ? "100 ml" : "100 g"} | ${formatNumber(product.NutrientAmountPerPackage)} ${product.NutrientUnit} per pakke | ${formatNumber(product.NutrientAmountPerKrone)} ${product.NutrientUnit} per krone`}
          />
        ))}
      </section>
      <Pager result={result} onPageChange={onPageChange} />
    </>
  );
}

export default NutrientResults;
