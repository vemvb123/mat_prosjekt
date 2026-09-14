// Generisk statuspanel for søkesidene.
//
// Brukes både når søket laster og når backend returnerer en feil.
function StatusPanel({ title, message, tone = "default", action = null }) {
  // Error-tone får tydeligere styling enn vanlig "søker"-status.
  const className = tone === "error" ? "panel notice notice--error" : "panel status-panel";

  return (
    <section className={className}>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  );
}

export default StatusPanel;
