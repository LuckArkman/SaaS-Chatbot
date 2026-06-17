// index.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        profile: string;
        companyId: number;
        canViewAllContacts?: boolean;
      };
    }
  }
}

export {};
