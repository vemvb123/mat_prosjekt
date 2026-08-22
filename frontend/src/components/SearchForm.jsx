import { useEffect, useState } from "react";

function SearchForm({ route, onSubmit }) {
  const [mode, setMode] = useState(route.mode);
  const [query, setQuery] = useState(route.query);
  const [chains, setChains] = useState(route.chains);
  const [compareUnit, setCompareUnit] = useState(route.compareUnit);

  useEffect(() => {
    setMode(route.mode);
    setQuery(route.query);
    setChains(route.chains);
    setCompareUnit(route.compareUnit);
  }, [route]);

  function toggleChain(chainKey) {
    setChains((current) => {
      if (current.includes(chainKey)) {
        const next = current.filter((value) => value !== chainKey);
        return next.length > 0 ? next : current;
      }

      return [...current, chainKey];
    });
  }

  function submit(event) {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }

    onSubmit({
      mode,
      query: query.trim(),
      chains,
      compareUnit,
    });
  }

  return (
    <form className="search-form" onSubmit={submit}>
      <div className="search-row search-row--primary">
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="nutrient">Næringssøk</option>
          <option value="product">Produktsøk</option>
        </select>
        <div className="chain-picker">
          <label>
            <input type="checkbox" checked={chains.includes("spar")} onChange={() => toggleChain("spar")} />
            SPAR
          </label>
          <label>
            <input type="checkbox" checked={chains.includes("meny")} onChange={() => toggleChain("meny")} />
            MENY
          </label>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Prøv for eksempel mettet fett eller skinke"
          required
        />
      </div>
      <div className="search-row">
        <div className="chain-picker">
          <label>
            <input
              type="radio"
              name="compareUnit"
              value="kg"
              checked={compareUnit === "kg"}
              onChange={(event) => setCompareUnit(event.target.value)}
            />
            kr/kg
          </label>
          <label>
            <input
              type="radio"
              name="compareUnit"
              value="l"
              checked={compareUnit === "l"}
              onChange={(event) => setCompareUnit(event.target.value)}
            />
            kr/l
          </label>
        </div>
        <button type="submit">Finn billigst</button>
      </div>
    </form>
  );
}

export default SearchForm;
