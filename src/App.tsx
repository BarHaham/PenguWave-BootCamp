import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";

function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <Navbar onLoginClick={() => setShowLogin(true)} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

export default App;
