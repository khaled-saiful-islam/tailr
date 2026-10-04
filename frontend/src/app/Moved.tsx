import { Navigate, useLocation, useParams } from "react-router";

/** An address that moved: keeps its parameters and query string. */
export function Moved({ to }: { to: string }) {
  const params = useParams();
  const { search } = useLocation();
  const path = to.replace(/:(\w+)/g, (_, name: string) => params[name] ?? "");
  return <Navigate to={`${path}${search}`} replace />;
}
