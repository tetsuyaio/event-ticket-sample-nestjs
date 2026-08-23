import { useState, type FormEvent } from "react";
import type { EventInput, EventStatus } from "../types";

const empty: EventInput = {
  title: "",
  description: "",
  venue: "",
  startsAt: "",
  endsAt: "",
  capacity: 1,
  status: "DRAFT",
};

const toLocal = (iso: string) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: EventInput;
  submitLabel: string;
  onSubmit(input: EventInput): Promise<void>;
}) {
  const source = initial ?? empty;
  const [form, setForm] = useState({
    ...source,
    startsAt: toLocal(source.startsAt),
    endsAt: toLocal(source.endsAt),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (new Date(form.startsAt) >= new Date(form.endsAt)) {
      setError("終了日時は開始日時より後にしてください。");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form card" onSubmit={submit}>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <label>
        イベント名
        <input
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </label>
      <label>
        説明
        <textarea
          required
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <label>
        会場
        <input
          required
          maxLength={200}
          value={form.venue}
          onChange={(e) => setForm({ ...form, venue: e.target.value })}
        />
      </label>
      <div className="form-row">
        <label>
          開始日時
          <input
            required
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </label>
        <label>
          終了日時
          <input
            required
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          定員
          <input
            required
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) =>
              setForm({ ...form, capacity: Number(e.target.value) })
            }
          />
        </label>
        <label>
          状態
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as EventStatus })
            }
          >
            <option value="DRAFT">下書き</option>
            <option value="PUBLISHED">公開</option>
            <option value="CLOSED">締切</option>
            <option value="CANCELLED">中止</option>
          </select>
        </label>
      </div>
      <button className="button" disabled={saving}>
        {saving ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
