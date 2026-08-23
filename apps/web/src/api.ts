import type { Event, EventInput, Reservation, User } from "./types";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3000";
const TOKEN_KEY = "event-ticket.access-token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => undefined)) as
    { message?: string | string[]; code?: string } | undefined;
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : (payload?.message ?? `リクエストに失敗しました (${response.status})`);
    throw new ApiError(message, response.status, payload?.code);
  }
  return payload as T;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface EventListResponse {
  data?: Event[];
  items?: Event[];
  total?: number;
  page?: number;
  limit?: number;
}

export const api = {
  signup: (body: { email: string; password: string; name: string }) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<User>("/auth/me"),
  async events(query = ""): Promise<Event[]> {
    const value = await request<Event[] | EventListResponse>(`/events${query}`);
    return Array.isArray(value) ? value : (value.data ?? value.items ?? []);
  },
  event: (id: string) => request<Event>(`/events/${id}`),
  createEvent: (body: EventInput) =>
    request<Event>("/events", { method: "POST", body: JSON.stringify(body) }),
  updateEvent: (id: string, body: Partial<EventInput>) =>
    request<Event>(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEvent: (id: string) =>
    request<void>(`/events/${id}`, { method: "DELETE" }),
  reserve: (eventId: string) =>
    request<Reservation>(`/events/${eventId}/reservations`, { method: "POST" }),
  async reservations(): Promise<Reservation[]> {
    const value = await request<
      Reservation[] | { data?: Reservation[]; items?: Reservation[] }
    >("/me/reservations");
    return Array.isArray(value) ? value : (value.data ?? value.items ?? []);
  },
  cancelReservation: (id: string) =>
    request<Reservation>(`/me/reservations/${id}`, { method: "DELETE" }),
};
