import HeroCard from "../components/HeroCard";
import HistoryChart from "../components/HistoryChart";
import StatusPanel from "../components/StatusPanel";
import { useProductHistory } from "../hooks/useProductHistory";
import { formatDate, formatNok } from "../lib/format";

function ProductPage({ route, onBack }) {
  const state = useProductHistory(route);

  if (state.status === "loading") {
    return <StatusPanel title="Henter produkt" message="Vi laster produktdetaljer og prishistorikk fra databasen." />;
  }

  if (state.status === "error") {
    return (
      <StatusPanel
        title="Noe gikk galt"
        message={state.error}
        tone="error"
        action={
          <button type="button" className="back-button" onClick={onBack}>
            Tilbake til søkeresultater
          </button>
        }
      />
    );
  }

  if (!state.data) {
    return null;
  }

  const product = state.data.Product;
  const history = state.data.History || [];
  const latestPoint = history[history.length - 1];

  return (
    <>
      <div className="topbar">
        <button type="button" className="back-button" onClick={onBack}>
          Tilbake til søkeresultater
        </button>
        <a className="text-link" href={product.ProductUrl} target="_blank" rel="noreferrer">
          Åpne produktside
        </a>
      </div>
      <HeroCard
        eyebrow="Produkt"
        title={product.Name}
        brand={product.Brand}
        store={`${product.ChainName} | ${product.StoreName}`}
        subtitle={product.Subtitle}
        price={`${formatNok(product.CurrentPrice)} kr`}
        unit={`${formatNok(product.CurrentPricePerCompareUnit)} kr/${product.CompareUnit}`}
        description={product.Description}
        imageUrl={product.ImageUrl}
        actions={
          <p className="hero-meta">
            Siste lagrede punkt: {latestPoint ? formatDate(latestPoint.CapturedAt) : "Ingen historikk"}
          </p>
        }
      />
      <section className="panel chart-panel">
        <h2>Prishistorikk</h2>
        <p>Lagrede ukespunkter fra snapshot-databasen.</p>
        <HistoryChart history={history} />
      </section>
    </>
  );
}

export default ProductPage;
