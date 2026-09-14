import { useEffect, useState } from "react";

// Søkskjema for både Produktsøk og Næringssøk.
//
// Produktsøk bruker et tekstfelt. Næringssøk bruker radio-knapper fordi backend
// bare kan rangere næringene som finnes som ferdige kolonner i gold-tabellen.

// Næringene må matche backend sin NUTRIENTS-liste.
const NUTRIENT_OPTIONS = [
  { value: "energy", label: "Energi" },
  { value: "calories", label: "Kalorier" },
  { value: "fat", label: "Fett" },
  { value: "saturated_fat", label: "Mettet fett" },
  { value: "carbohydrates", label: "Karbohydrater" },
  { value: "sugars", label: "Sukkerarter" },
  { value: "protein", label: "Protein" },
  { value: "salt", label: "Salt" },
];

// Gjør gamle URL-er og label-verdier om til den stabile value-en backend forventer.
function normalizeNutrientQuery(value) {
  const normalized = (value || "").toLowerCase().trim().replace(/\s+/g, "_");
  const match = NUTRIENT_OPTIONS.find((nutrient) => nutrient.value === normalized || nutrient.label.toLowerCase().replace(/\s+/g, "_") === normalized);
  return match?.value || NUTRIENT_OPTIONS[0].value;
}

function SearchForm({ route, onSubmit }) {
  // Lokal state gjør at brukeren kan endre skjemaet uten å endre URL før submit.
  const [mode, setMode] = useState(route.mode);
  const [query, setQuery] = useState(route.query);
  const [chains, setChains] = useState(route.chains);
  const [compareUnit, setCompareUnit] = useState(route.compareUnit);

  // Når browserhistorikk eller paging endrer route, synkroniseres skjemaet.
  useEffect(() => {
    setMode(route.mode);
    setQuery(route.mode === "nutrient" ? normalizeNutrientQuery(route.query) : route.query);
    setChains(route.chains);
    setCompareUnit(route.compareUnit);
  }, [route]);

  // Minst én kjede må alltid være valgt, ellers ville søket bli tomt.
  function toggleChain(chainKey) {
    setChains((current) => {
      if (current.includes(chainKey)) {
        const next = current.filter((value) => value !== chainKey);
        return next.length > 0 ? next : current;
      }

      return [...current, chainKey];
    });
  }

  // Sender bare det backend trenger: modus, søketekst/næring, kjeder og enhet.
  function submit(event) {
    event.preventDefault();
    const submittedQuery = mode === "nutrient" ? query || NUTRIENT_OPTIONS[0].value : query.trim();

    if (!submittedQuery) {
      return;
    }

    onSubmit({
      mode,
      query: submittedQuery,
      chains,
      compareUnit,
    });
  }

  // Ved modusbytte resettes query til riktig type input.
  function changeMode(nextMode) {
    setMode(nextMode);
    setQuery(nextMode === "nutrient" ? NUTRIENT_OPTIONS[0].value : "");
  }

  const helperText = mode === "nutrient"
    ? "Finn produkter med meste næring for prisen"
    : "Finn billigste produkter";

  return (
    <form className="search-form" onSubmit={submit}>
      <div className="search-row search-row--primary">
        <select value={mode} onChange={(event) => changeMode(event.target.value)}>
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
        <p className="search-helper">{helperText}</p>
      </div>
      {mode === "nutrient" ? (
        <fieldset className="nutrient-picker">
          {NUTRIENT_OPTIONS.map((nutrient) => (
            <label key={nutrient.value}>
              <input
                type="radio"
                name="nutrient"
                value={nutrient.value}
                checked={(query || NUTRIENT_OPTIONS[0].value) === nutrient.value}
                onChange={(event) => setQuery(event.target.value)}
              />
              {nutrient.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Søk etter produkt, for eksempel skinke"
          required
        />
      )}
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
        <button type="submit">{mode === "nutrient" ? "Finn næring" : "Finn billigst"}</button>
      </div>
    </form>
  );
}

export default SearchForm;
