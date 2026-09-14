import SearchForm from "../components/SearchForm";

function HomePage({ route, onSubmit }) {
  return (
    <>
      <section className="masthead">
        <p className="eyebrow">React-frontend</p>
        <h1>Mat prisfinner</h1>
        <SearchForm route={route} onSubmit={onSubmit} />
      </section>
      <section className="results">
        <section className="panel empty-state">
          <h2>To egne sider finnes nå</h2>
          <p>Et søk sender deg til en resultatside, og hvert produkt åpnes på en egen produktside med prishistorikk.</p>
        </section>
      </section>
    </>
  );
}

export default HomePage;
