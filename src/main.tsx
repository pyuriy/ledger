import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LedgerApp } from "@/components/budget/ledger-app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <LedgerApp />
  </StrictMode>,
);
