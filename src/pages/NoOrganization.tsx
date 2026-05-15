import { Navigate } from "react-router-dom";

export default function NoOrganization() {
  return <Navigate to="/dashboard" replace />;
}
