import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

export function RequireAuth() {
  const { userId, loading } = useAuth();
  if (loading) return <div className="text-ink-light">Loading…</div>;
  if (!userId) return <Navigate to="/signin" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { userId, role, isVerified, loading } = useAuth();
  if (loading) return <div className="text-ink-light">Loading…</div>;
  if (!userId) return <Navigate to="/signin" replace />;
  if (role !== "admin" || !isVerified) return <Navigate to="/" replace />;
  return <Outlet />;
}
