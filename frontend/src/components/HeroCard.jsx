function HeroCard({ eyebrow, title, brand, store, subtitle, price, unit, description, imageUrl, actions }) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="hero-meta">{brand}</p>
        <p className="hero-meta">{store}</p>
        <p className="hero-meta">{subtitle}</p>
        <p className="hero-price">{price}</p>
        <p className="hero-unit">{unit}</p>
        <p className="hero-description">{description}</p>
        <div className="hero-actions">{actions}</div>
      </div>
      <div className="hero-image">
        <img src={imageUrl} alt={title} />
      </div>
    </section>
  );
}

export default HeroCard;
