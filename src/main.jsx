import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { Admin } from "./Admin.jsx";
import "./styles.css";

const isAdmin =
  window.location.hash === "#/admin" ||
  new URLSearchParams(window.location.search).get("admin") === "1";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </React.StrictMode>,
);
