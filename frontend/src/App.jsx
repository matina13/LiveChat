import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import RoomViewPage from "./pages/RoomViewPage";

export default function App() {
    const isAuthed = Boolean(localStorage.getItem("authToken"));
    return (
        <Routes>
            <Route path="/" element={<Navigate to={isAuthed ? "/home" : "/login"} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomViewPage />} />
        </Routes>
    );
}
