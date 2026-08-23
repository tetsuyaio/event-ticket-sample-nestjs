import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { formatDate } from "../components/EventCard";
import type { Event } from "../types";

export function EventDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<Event | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api
      .event(id)
      .then(setItem)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "取得に失敗しました。"),
      );
  }, [id]);
  async function reserve() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.reserve(id);
      setMessage("予約が完了しました。チケットは予約履歴から確認できます。");
      setItem((current) =>
        current
          ? { ...current, reservedCount: current.reservedCount + 1 }
          : current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "予約に失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!item && !error) return <p className="state">読み込み中…</p>;
  if (!item) return <p className="alert error">{error}</p>;
  const remaining = Math.max(0, item.capacity - item.reservedCount);
  return (
    <section className="detail">
      <Link className="back" to="/events">
        ← イベント一覧
      </Link>
      <div className="card detail-card">
        <div className="spread">
          <span className={`badge ${item.status.toLowerCase()}`}>
            {item.status}
          </span>
          <strong>残り {remaining} 席</strong>
        </div>
        <h1>{item.title}</h1>
        <p className="description">{item.description}</p>
        <dl className="facts">
          <div>
            <dt>開催日時</dt>
            <dd>
              {formatDate(item.startsAt)} 〜<br />
              {formatDate(item.endsAt)}
            </dd>
          </div>
          <div>
            <dt>会場</dt>
            <dd>{item.venue}</dd>
          </div>
          <div>
            <dt>定員</dt>
            <dd>{item.capacity}名</dd>
          </div>
        </dl>
        {message && <p className="alert success">{message}</p>}
        {error && <p className="alert error">{error}</p>}
        {!user ? (
          <p className="callout">
            <Link to="/login" state={{ from: `/events/${id}` }}>
              ログイン
            </Link>
            すると予約できます。
          </p>
        ) : user.role === "USER" ? (
          <button
            className="button wide"
            disabled={busy || item.status !== "PUBLISHED" || remaining === 0}
            onClick={reserve}
          >
            {busy
              ? "予約中…"
              : remaining === 0
                ? "満席です"
                : "このイベントを予約する"}
          </button>
        ) : (
          <p className="callout">管理者アカウントでは予約できません。</p>
        )}
      </div>
    </section>
  );
}
