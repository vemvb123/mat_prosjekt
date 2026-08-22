function StatusPanel({ title, message, tone = "default", action = null }) {
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
