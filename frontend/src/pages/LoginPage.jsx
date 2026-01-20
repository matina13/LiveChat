import { useState } from "react";
import "../App.css";

export default function LoginPage() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [status, setStatus] = useState({ type: "", text: "" });

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

        // προσωρινό feedback μέχρι να συνδέσουμε backend
        setStatus({ type: "ok", text: "Looks good! Next we connect it to Spring Boot." });
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
