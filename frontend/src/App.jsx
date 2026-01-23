import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";

export default function App() {
    const isAuthed = Boolean(localStorage.getItem("authToken"));
    return (
        <Routes>
            <Route path="/" element={<Navigate to={isAuthed ? "/home" : "/login"} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/home" element={<HomePage />} />
        </Routes>
    );
}
