import { createFileRoute } from "@tanstack/react-router";
import { LedgerApp } from "@/components/budget/ledger-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LedgerApp />;
}
