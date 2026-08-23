import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  return (
    <>
      <header>
        <nav aria-label="メインナビゲーション" className="nav shell">
          <Link to="/events" className="brand">
            Event Ticket
          </Link>
          <div className="nav-links">
            <NavLink to="/events" className={linkClass}>
              イベント
            </NavLink>
            {user && (
              <NavLink to="/my/reservations" className={linkClass}>
                予約履歴
              </NavLink>
            )}
            {user?.role === "ADMIN" && (
              <NavLink to="/admin/events" className={linkClass}>
                イベント管理
              </NavLink>
            )}
          </div>
          <div className="account">
            {user ? (
              <>
                <span>
                  {user.name}
                  <small>{user.role}</small>
                </span>
                <button
                  className="button secondary compact"
                  onClick={() => {
                    logout();
                    navigate("/events");
                  }}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link to="/login">ログイン</Link>
                <Link className="button compact" to="/signup">
                  新規登録
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="shell">
        <Outlet />
      </main>
      <footer className="shell">Event Ticket Reservation</footer>
    </>
  );
}
