import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/customers")({
  component: CustomersLayout,
});

function CustomersLayout() {
  return <Outlet />;
}
