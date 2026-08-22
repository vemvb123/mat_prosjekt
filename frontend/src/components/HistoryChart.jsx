import { formatDate, formatNok } from "../lib/format";

function HistoryChart({ history }) {
  if (history.length === 0) {
    return <p>Ingen historikk tilgjengelig.</p>;
  }

  const width = 860;
  const height = 340;
  const padding = 40;
  const prices = history.map((entry) => Number(entry.Price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  const points = history.map((entry, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(history.length - 1, 1);
    const y = height - padding - ((Number(entry.Price) - minPrice) / range) * (height - padding * 2);
    return { x, y, entry };
  });
  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Prisgraf">
      <path
        d={`${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
        className="history-area"
      />
      <path d={pathData} className="history-line" />
      {points.map((point) => (
        <g key={point.entry.CapturedAt}>
          <circle cx={point.x} cy={point.y} r="4" className="history-dot" />
          <title>{`${formatDate(point.entry.CapturedAt)}: ${formatNok(point.entry.Price)} kr`}</title>
        </g>
      ))}
    </svg>
  );
}

export default HistoryChart;
