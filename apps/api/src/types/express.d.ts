import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: Role;
    }
    interface Request {
      requestId: string;
    }
  }
}
export {};
