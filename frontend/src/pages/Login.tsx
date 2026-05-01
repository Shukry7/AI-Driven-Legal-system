import { Navigate } from "react-router-dom";

// Legacy file kept to avoid accidental imports with incorrect casing.
// Use the folder-based route in src/pages/login/index.tsx instead.
export default function LegacyLoginRedirect() {
  return <Navigate to="/login" replace />;
}
