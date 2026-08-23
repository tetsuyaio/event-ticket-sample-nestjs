import { Link } from "react-router-dom";
import type { Event } from "../types";

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function EventCard({ event }: { event: Event }) {
  const remaining = Math.max(0, event.capacity - event.reservedCount);
  return (
    <article className="card event-card">
      <div className="spread">
        <span className={`badge ${event.status.toLowerCase()}`}>
          {event.status}
        </span>
        <span>残り {remaining} 席</span>
      </div>
      <h2>
        <Link to={`/events/${event.id}`}>{event.title}</Link>
      </h2>
      <dl>
        <div>
          <dt>日時</dt>
          <dd>{formatDate(event.startsAt)}</dd>
        </div>
        <div>
          <dt>会場</dt>
          <dd>{event.venue}</dd>
        </div>
      </dl>
      <Link className="text-link" to={`/events/${event.id}`}>
        詳細を見る →
      </Link>
    </article>
  );
}
