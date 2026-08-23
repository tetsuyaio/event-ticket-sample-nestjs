import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { formatDate } from "../components/EventCard";
import type { Reservation } from "../types";

export function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  useEffect(() => {
    api
      .reservations()
      .then(setItems)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "取得に失敗しました。"),
      )
      .finally(() => setLoading(false));
  }, []);
  async function cancel(id: string) {
    if (!window.confirm("この予約をキャンセルしますか？")) return;
    setBusyId(id);
    setError("");
    try {
      const result = await api.cancelReservation(id);
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                ...result,
                status: "CANCELLED",
                ticket: item.ticket
                  ? { ...item.ticket, status: "CANCELLED" }
                  : item.ticket,
              }
            : item,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "キャンセルに失敗しました。",
      );
    } finally {
      setBusyId("");
    }
  }
  return (
    <section>
      <div className="page-title">
        <div>
          <p className="eyebrow">MY TICKETS</p>
          <h1>予約履歴</h1>
        </div>
      </div>
      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <p className="state">読み込み中…</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>予約はまだありません。</p>
          <Link className="button" to="/events">
            イベントを探す
          </Link>
        </div>
      ) : (
        <div className="reservation-list">
          {items.map((reservation) => (
            <article className="card reservation" key={reservation.id}>
              <div>
                <span className={`badge ${reservation.status.toLowerCase()}`}>
                  {reservation.status}
                </span>
                <h2>
                  <Link to={`/events/${reservation.event.id}`}>
                    {reservation.event.title}
                  </Link>
                </h2>
                <p>
                  {formatDate(reservation.event.startsAt)} ·{" "}
                  {reservation.event.venue}
                </p>
              </div>
              <div className="ticket">
                <span>チケット番号</span>
                <strong>{reservation.ticket?.ticketNumber ?? "—"}</strong>
                <small>予約日 {formatDate(reservation.reservedAt)}</small>
              </div>
              {reservation.status === "RESERVED" && (
                <button
                  className="button danger compact"
                  disabled={busyId === reservation.id}
                  onClick={() => cancel(reservation.id)}
                >
                  {busyId === reservation.id ? "処理中…" : "キャンセル"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
