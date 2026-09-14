import SearchForm from "../components/SearchForm";

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
