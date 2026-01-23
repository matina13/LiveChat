import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import "../App.css";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [status, setStatus] = useState({ type: "", text: "" });

    // focus state
    const [focus, setFocus] = useState({
        password: false,
        confirmPassword: false,
    });

    // Individual checks
    const rules = useMemo(() => {
        const pwd = form.password;

        return {
            minLen: pwd.length >= 8,
            hasCapital: /[A-Z]/.test(pwd),
            hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
            confirmOk:
                form.confirmPassword.length > 0 &&
                form.confirmPassword === form.password,
        };
    }, [form.password, form.confirmPassword]);

    const allPasswordOk = rules.minLen && rules.hasCapital && rules.hasSpecial;
    const allOk = allPasswordOk && rules.confirmOk;

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setStatus({ type: "", text: "" });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.username || !form.email || !form.password || !form.confirmPassword) {
            setStatus({ type: "err", text: "Please fill all fields." });
            return;
        }

        if (!allPasswordOk) {
            setStatus({ type: "err", text: "Password does not meet requirements." });
            return;
        }

        if (!rules.confirmOk) {
            setStatus({ type: "err", text: "Passwords do not match." });
            return;
        }

        try {
            await register({
                username: form.username,
                email: form.email,
                password: form.password,
            });
            setStatus({ type: "ok", text: "Account created. You can sign in now." });
            navigate("/login");
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Registration failed. Please try again.";
            setStatus({ type: "err", text: message });
        }
    }

    function ruleClass(ok) {
        return `rule ${ok ? "rule--ok" : "rule--bad"}`;
    }

    return (
        <div className="auth-center-page">
            <div className="auth-card">
                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">Register to start chatting in real time.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="field">
                        <label className="label">Username</label>
                        <input
                            className="input"
                            name="username"
                            placeholder="Username"
                            value={form.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

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

                    {/* PASSWORD */}
                    <div className="field">
                        <label className="label">Password</label>
                        <input
                            className="input"
                            name="password"
                            type="password"
                            placeholder="Enter a strong password"
                            value={form.password}
                            onChange={handleChange}
                            onFocus={() => setFocus((f) => ({ ...f, password: true }))}
                            onBlur={() => setFocus((f) => ({ ...f, password: false }))}
                            required
                        />

                        <div className={`rules-float ${focus.password ? "show" : ""}`}>
                            <ul className="rules">
                                <li className={ruleClass(rules.minLen)}>
                                    <span className="rule-dot" />
                                    At least 8 characters
                                </li>
                                <li className={ruleClass(rules.hasCapital)}>
                                    <span className="rule-dot" />
                                    At least 1 capital letter (A-Z)
                                </li>
                                <li className={ruleClass(rules.hasSpecial)}>
                                    <span className="rule-dot" />
                                    At least 1 special character (e.g. !@#)
                                </li>
                            </ul>
                        </div>
                    </div>


                    {/* CONFIRM PASSWORD */}
                    <div className="field">
                        <label className="label">Confirm Password</label>
                        <input
                            className="input"
                            name="confirmPassword"
                            type="password"
                            placeholder="Re-enter password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            onFocus={() => setFocus((f) => ({ ...f, confirmPassword: true }))}
                            onBlur={() => setFocus((f) => ({ ...f, confirmPassword: false }))}
                            required
                        />

                        <div className={`rules-float ${focus.confirmPassword ? "show" : ""}`}>
                            <ul className="rules">
                                <li className={ruleClass(rules.confirmOk)}>
                                    <span className="rule-dot" />
                                    Passwords match
                                </li>
                            </ul>
                        </div>
                    </div>


                    <button className="btn-primary" type="submit" disabled={!allOk}>
                        Create account
                    </button>
                </form>

                {status.text && (
                    <p className={`msg ${status.type === "ok" ? "msg--ok" : "msg--err"}`}>
                        {status.text}
                    </p>
                )}

                <div className="auth-footer">
                    Already have an account? <a href="/login">Sign in</a>
                </div>
            </div>
        </div>
    );
}
