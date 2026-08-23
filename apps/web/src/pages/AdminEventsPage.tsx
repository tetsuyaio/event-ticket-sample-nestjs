import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EventForm } from "../components/EventForm";
import { formatDate } from "../components/EventCard";
import type { Event, EventInput } from "../types";

export function AdminEventsPage() {
  const [items, setItems] = useState<Event[]>([]);
  const [editing, setEditing] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    try {
      setItems(await api.events("?page=1&limit=100"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function remove(item: Event) {
    if (!window.confirm(`「${item.title}」を削除しますか？`)) return;
    try {
      await api.deleteEvent(item.id);
      setItems((current) => current.filter((value) => value.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました。");
    }
  }
  const inputOf = (item: Event): EventInput => ({
    title: item.title,
    description: item.description,
    venue: item.venue,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    capacity: item.capacity,
    status: item.status,
  });
  if (editing)
    return (
      <section className="narrow">
        <button className="back as-link" onClick={() => setEditing(null)}>
          ← イベント管理
        </button>
        <div className="page-title">
          <h1>イベントを編集</h1>
        </div>
        <EventForm
          initial={inputOf(editing)}
          submitLabel="変更を保存"
          onSubmit={async (input) => {
            await api.updateEvent(editing.id, input);
            setEditing(null);
            await load();
          }}
        />
      </section>
    );
  return (
    <section>
      <div className="page-title spread">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>イベント管理</h1>
        </div>
        <Link className="button" to="/admin/events/new">
          ＋ 新規イベント
        </Link>
      </div>
      {error && <p className="alert error">{error}</p>}
      {loading ? (
        <p className="state">読み込み中…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>イベント</th>
                <th>日時</th>
                <th>状態</th>
                <th>予約</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.venue}</small>
                  </td>
                  <td>{formatDate(item.startsAt)}</td>
                  <td>
                    <span className={`badge ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {item.reservedCount} / {item.capacity}
                  </td>
                  <td className="actions">
                    <button
                      className="button secondary compact"
                      onClick={() => setEditing(item)}
                    >
                      編集
                    </button>
                    <button
                      className="button danger compact"
                      onClick={() => remove(item)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="state">イベントがありません。</p>
          )}
        </div>
      )}
    </section>
  );
}
