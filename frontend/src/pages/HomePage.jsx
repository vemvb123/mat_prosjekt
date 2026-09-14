import SearchForm from "../components/SearchForm";

// Forsiden.
//
// Den viser selve søkeopplevelsen direkte, uten en separat landingsside.
function HomePage({ route, onSubmit }) {
  return (
    <>
      <section className="masthead">
        <p className="eyebrow">React-frontend</p>
        <h1>Mat prisfinner</h1>
        <SearchForm route={route} onSubmit={onSubmit} />
      </section>
    </>
  );
}

export default HomePage;
