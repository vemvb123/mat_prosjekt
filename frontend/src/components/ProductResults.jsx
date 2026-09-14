import ProductCard from "./ProductCard";

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

  return (
    <>
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
