import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Vite-entrypoint for React-appen.
//
// StrictMode hjelper med å finne sideeffekter i utvikling.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
