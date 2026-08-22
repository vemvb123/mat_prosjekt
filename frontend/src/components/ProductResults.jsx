import HeroCard from "./HeroCard";
import ProductCard from "./ProductCard";
import { formatNok } from "../lib/format";

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
        Side {result.page} av {result.totalPages} • {result.total} treff
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

function ProductResults({ result, onPageChange }) {
  const products = result.items || [];

  if (products.length === 0) {
    return (
      <section className="panel empty-state">
        <h2>Ingen produkter funnet</h2>
        <p>Prøv et annet søkeord eller bytt butikkjede.</p>
      </section>
    );
  }

  const best = result.bestItem || products[0];

  return (
    <>
      <HeroCard
        eyebrow="Billigste funn per sammenligningsenhet"
        title={best.Name}
        brand={best.Brand}
        store={`${best.ChainName} | ${best.StoreName}`}
        subtitle={best.Subtitle}
        price={`${formatNok(best.Price)} kr`}
        unit={`${formatNok(best.PricePerCompareUnit)} kr/${best.CompareUnit}`}
        description={best.Description}
        imageUrl={best.ImageUrl}
        actions={
          <a className="text-link" href={best.ProductUrl} target="_blank" rel="noreferrer">
            Gå til produktsiden
          </a>
        }
      />
      <section className="results-grid">
        {products.map((product) => (
          <ProductCard key={product.ProductKey} product={product} />
        ))}
      </section>
      <Pager result={result} onPageChange={onPageChange} />
    </>
  );
}

export default ProductResults;
