import { formatNok } from "../lib/format";

function titleCase(value) {
  return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}` : "";
}

function productSearchUrl(product) {
  const chainKey = (product.ChainKey || product.ChainName || "").toLowerCase();
  const host = chainKey === "spar" ? "https://spar.no" : "https://meny.no";
  const params = new URLSearchParams({
    query: product.Name || "",
    expanded: "products",
  });

  return `${host}/sok?${params.toString()}`;
}

function ProductCard({ product, metric = "" }) {
  const store = [titleCase(product.ChainName), product.StoreName].filter(Boolean).join(" | ");
  const productUrl = productSearchUrl(product);

  return (
    <article className="product-card">
      <img src={product.ImageUrl} alt={product.Name} loading="lazy" />
      <div className="product-card-body">
        {store ? <p className="product-store">{store}</p> : null}
        <h3>{product.Name}</h3>
        <p className="product-subtitle">{product.Subtitle}</p>
        <p className="product-price">{formatNok(product.Price)} kr</p>
        <p className="product-unit">
          {formatNok(product.PricePerCompareUnit)} kr/{product.CompareUnit}
        </p>
        {metric ? <p className="product-metric">{metric}</p> : null}
        <div className="product-links">
          <a className="text-link" href={productUrl} target="_blank" rel="noreferrer">
            Åpne produktside
          </a>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
