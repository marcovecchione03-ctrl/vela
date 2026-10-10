import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      actualUserId?: string;
      impersonatedTenantId?: string;
      impersonationStartedAt?: number;
      impersonationExpiresAt?: number;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    actualUserId?: string;
    impersonatedTenantId?: string;
    impersonationStartedAt?: number;
    impersonationExpiresAt?: number;
  }
}
