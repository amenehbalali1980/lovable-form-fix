import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

startTransition(async () => {
  const router = getRouter();
  await router.load();
  const root = document.getElementById("root");
  if (!root) throw new Error('Root element "#root" not found');
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
