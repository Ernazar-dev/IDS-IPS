import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SocketProvider } from "./hooks/useSocket";
import Layout    from "./components/Layout";
import Login     from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Demo      from "./pages/Demo";
import History   from "./pages/History";
import Settings  from "./pages/Settings";

function Splash({ label = "Júklenbekte" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#ffffff", color: "#64748b",
      fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, gap: 10,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: "50%",
        background: "#2563eb", animation: "pulse 1.4s ease-in-out infinite",
      }} />
      {label}…
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Splash />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function LoginWrapper() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Splash />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout />
                </SocketProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="demo"      element={<Demo      />} />
            <Route path="history"   element={<History   />} />
            <Route path="settings"  element={<Settings  />} />
            <Route path="*"         element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
