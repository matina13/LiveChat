import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
    const navigate = useNavigate();
    const username = localStorage.getItem("authUsername");

    function logout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUsername");
        localStorage.removeItem("authEmail");
        navigate("/login");
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="sidebar-brand" onClick={() => navigate("/home")}>
                    LiveChat
                </div>

                <nav className="sidebar-nav">
                    <NavLink className="sidebar-link" to="/home">
                        Home
                    </NavLink>
                    <NavLink className="sidebar-link" to="/rooms">
                        Rooms
                    </NavLink>
                    <button className="sidebar-link sidebar-link--btn" disabled>
                        Profile
                    </button>
                </nav>
            </div>

            <div className="sidebar-bottom">
                <button className="sidebar-link" type="button">
                    Settings
                </button>

                <div className="sidebar-user">
                    <div className="sidebar-user-name">{username || "User"}</div>
                    <div className="sidebar-user-sub">Signed in</div>
                </div>

                <button className="sidebar-logout" onClick={logout}>
                    Log out
                </button>
            </div>
        </aside>
    );
}
