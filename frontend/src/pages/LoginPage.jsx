import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { login } from "../api/authApi";
import { isTokenValid } from "../utils/auth";
import "../App.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [status, setStatus] = useState({ type: "", text: "" });

    if (isTokenValid()) return <Navigate to="/home" replace />;

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setStatus({ type: "", text: "" });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.email || !form.password) {
            setStatus({ type: "err", text: "Please enter email and password." });
            return;
        }

        try {
            const { data } = await login({
                email: form.email,
                password: form.password,
            });
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("refreshToken", data.refreshToken);
            localStorage.setItem("authUsername", data.username);
            localStorage.setItem("authEmail", data.email);
            localStorage.setItem("authAvatarUrl", data.avatarUrl || "");
            setStatus({ type: "ok", text: `Welcome back, ${data.username}!` });
            navigate("/home");
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Login failed. Please check your credentials.";
            setStatus({ type: "err", text: message });
        }

    }

    return (
        <div className="auth-center-page">
            <div className="auth-card">
                <h1 className="auth-title">Sign in</h1>
                <p className="auth-subtitle">
                    Enter your details to continue.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="field">
                        <label className="label">Email</label>
                        <input
                            className="input"
                            name="email"
                            type="email"
                            placeholder="example@gmail.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="field">
                        <label className="label">Password</label>
                        <input
                            className="input"
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button className="btn-primary" type="submit">
                        Sign in
                    </button>

                    <div className="divider">or</div>

                    <button className="btn-secondary" type="button">
                        Continue with Google
                    </button>
                </form>

                {status.text && (
                    <p className={`msg ${status.type === "ok" ? "msg--ok" : "msg--err"}`}>
                        {status.text}
                    </p>
                )}

                <div className="auth-footer">
                    Don&apos;t have an account? <a href="/register">Create one</a>
                </div>
            </div>
        </div>
    );
}
