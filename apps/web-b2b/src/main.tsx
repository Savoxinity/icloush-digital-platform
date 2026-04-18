import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import App from "./App";
import { trpc } from "./lib/trpc";
import "./index.css";

function AppProviders() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${window.location.origin}/api/trpc`,
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

createRoot(container).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
