import { Role } from "@prisma/client";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
