import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { EventForm } from "../components/EventForm";

export function CreateEventPage() {
  const navigate = useNavigate();
  return (
    <section className="narrow">
      <Link className="back" to="/admin/events">
        ← イベント管理
      </Link>
      <div className="page-title">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>イベントを作成</h1>
        </div>
      </div>
      <EventForm
        submitLabel="イベントを作成"
        onSubmit={async (input) => {
          await api.createEvent(input);
          navigate("/admin/events");
        }}
      />
    </section>
  );
}
