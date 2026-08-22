import { formatNok } from "../lib/format";

function ProductCard({ product, metric = "" }) {
  return (
    <article className="product-card">
      <img src={product.ImageUrl} alt={product.Name} loading="lazy" />
      <div className="product-card-body">
        <p className="product-brand">{product.Brand}</p>
        <p className="product-store">
          {product.ChainName} | {product.StoreName}
        </p>
        <h3>{product.Name}</h3>
        <p className="product-subtitle">{product.Subtitle}</p>
        <p className="product-price">{formatNok(product.Price)} kr</p>
        <p className="product-unit">
          {formatNok(product.PricePerCompareUnit)} kr/{product.CompareUnit}
        </p>
        {metric ? <p className="product-metric">{metric}</p> : null}
        <div className="product-links">
          <a className="text-link" href={product.ProductUrl} target="_blank" rel="noreferrer">
            Åpne produktside
          </a>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
