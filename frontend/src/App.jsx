import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoomsPage from "./pages/RoomsPage";
import SettingsPage from "./pages/SettingsPage";
import { isTokenValid } from "./utils/auth";

function PrivateRoute({ children }) {
    return isTokenValid() ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const isAuthed = isTokenValid();
    return (
        <Routes>
            <Route path="/" element={<Navigate to={isAuthed ? "/home" : "/login"} replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/home" element={<PrivateRoute><RoomsPage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        </Routes>
    );
}
