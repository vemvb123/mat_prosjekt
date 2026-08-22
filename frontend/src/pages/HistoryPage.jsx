import HeroCard from "../components/HeroCard";
import HistoryChart from "../components/HistoryChart";
import StatusPanel from "../components/StatusPanel";
import { useProductHistory } from "../hooks/useProductHistory";
import { formatDate, formatNok } from "../lib/format";

function HistoryPage({ route, onBack }) {
  const state = useProductHistory(route);

  if (state.status === "loading") {
    return <StatusPanel title="Henter prishistorikk" message="Vi laster tidsserien fra databasen." />;
  }

  if (state.status === "error") {
    return (
      <StatusPanel
        title="Noe gikk galt"
        message={state.error}
        tone="error"
        action={
          <button type="button" className="back-button" onClick={onBack}>
            Tilbake
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

  return (
    <>
      <div className="topbar">
        <button type="button" className="back-button" onClick={onBack}>
          Tilbake
        </button>
        <a className="text-link" href={product.ProductUrl} target="_blank" rel="noreferrer">
          Åpne produktside
        </a>
      </div>
      <HeroCard
        eyebrow="Prishistorikk"
        title={product.Name}
        brand={product.Brand}
        store={`${product.ChainName} | ${product.StoreName}`}
        subtitle={product.Subtitle}
        price={`${formatNok(product.CurrentPrice)} kr`}
        unit={`${formatNok(product.CurrentPricePerCompareUnit)} kr/${product.CompareUnit}`}
        description={product.Description}
        imageUrl={product.ImageUrl}
        actions={<p className="hero-meta">Siste lagrede punkt: {formatDate(history[history.length - 1]?.CapturedAt)}</p>}
      />
      <section className="panel chart-panel">
        <h2>Pris over tid</h2>
        <p>Lagrede ukespunkter fra snapshot-databasen.</p>
        <HistoryChart history={history} />
      </section>
    </>
  );
}

export default HistoryPage;
