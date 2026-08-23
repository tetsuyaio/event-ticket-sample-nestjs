export type Role = "USER" | "ADMIN";
export type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  reservedCount: number;
  status: EventStatus;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  status: "VALID" | "CANCELLED";
  issuedAt: string;
}

export interface Reservation {
  id: string;
  status: "RESERVED" | "CANCELLED";
  reservedAt: string;
  cancelledAt?: string | null;
  event: Event;
  ticket?: Ticket | null;
}

export interface EventInput {
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: EventStatus;
}
