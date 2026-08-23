import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/events" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signup(form.email, form.password, form.name);
      navigate("/events", { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "登録に失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <form className="form card" onSubmit={submit}>
        <h1>新規登録</h1>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <label>
          表示名
          <input
            required
            maxLength={100}
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          メールアドレス
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <small>8文字以上で入力してください</small>
        </label>
        <button className="button" disabled={busy}>
          {busy ? "登録中…" : "登録する"}
        </button>
        <p>
          登録済みの方は <Link to="/login">ログイン</Link>
        </p>
      </form>
    </section>
  );
}
