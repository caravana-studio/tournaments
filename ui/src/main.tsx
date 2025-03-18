import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { StarknetProvider } from "@/context/starknet";
import { BrowserRouter as Router } from "react-router-dom";
import { DojoContextProvider } from "@/context/dojo";

async function main() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <StarknetProvider>
        <DojoContextProvider>
          <Router>
            <App />
          </Router>
        </DojoContextProvider>
      </StarknetProvider>
    </StrictMode>
  );
}

main().catch((error) => {
  console.error("Failed to initialize the application:", error);
});
