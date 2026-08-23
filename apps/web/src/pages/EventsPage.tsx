import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { EventCard } from "../components/EventCard";
import type { Event } from "../types";

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(query = "") {
    setLoading(true);
    setError("");
    try {
      setEvents(await api.events(query));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "イベントを取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load("?status=PUBLISHED&page=1&limit=20");
  }, []);
  function search(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      status: "PUBLISHED",
      page: "1",
      limit: "20",
    });
    if (keyword.trim()) params.set("keyword", keyword.trim());
    void load(`?${params}`);
  }

  return (
    <section>
      <div className="hero">
        <p className="eyebrow">DISCOVER YOUR NEXT EVENT</p>
        <h1>イベントを見つけよう</h1>
        <p>気になるイベントを探して、その場でチケットを予約できます。</p>
      </div>
      <form className="search" onSubmit={search}>
        <input
          aria-label="キーワード"
          placeholder="イベント名・会場で検索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button className="button">検索</button>
      </form>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="state">読み込み中…</p>
      ) : events.length === 0 ? (
        <p className="state">該当するイベントはありません。</p>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
