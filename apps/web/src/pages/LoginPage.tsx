import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  if (user) return <Navigate to="/events" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(
        (location.state as { from?: string } | null)?.from ?? "/events",
        { replace: true },
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "ログインに失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <form className="form card" onSubmit={submit}>
        <h1>ログイン</h1>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <label>
          メールアドレス
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "ログイン中…" : "ログイン"}
        </button>
        <p>
          アカウントがない方は <Link to="/signup">新規登録</Link>
        </p>
      </form>
    </section>
  );
}
