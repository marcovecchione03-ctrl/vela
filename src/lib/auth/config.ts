import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      
      if (trigger === "update" && session?.impersonate) {
        if (token.actualUserId) {
          // Deny nested impersonation
          return token;
        }

        const actorId = token.id;
        // Verify Super Admin status before allowing impersonation
        const dbUser = await prisma.user.findUnique({ where: { id: actorId }, select: { isSuperAdmin: true } });
        
        if (dbUser?.isSuperAdmin) {
          // Verify Target is OWNER or ADMIN and not Super Admin
          const targetMembership = await prisma.tenantMembership.findUnique({
            where: {
              tenantId_userId: {
                userId: session.impersonate.userId,
                tenantId: session.impersonate.tenantId
              }
            }
          });
          const targetUser = await prisma.user.findUnique({ where: { id: session.impersonate.userId } });

          if (!targetMembership || !['OWNER', 'ADMIN'].includes(targetMembership.role) || targetUser?.isSuperAdmin) {
            console.error("Invalid impersonation target");
            return token;
          }

          token.actualUserId = actorId;
          token.id = session.impersonate.userId;
          token.impersonatedTenantId = session.impersonate.tenantId;
          token.impersonationStartedAt = Date.now();
          token.impersonationExpiresAt = Date.now() + 30 * 60 * 1000;

          // Audit log the impersonation
          await prisma.auditLog.create({
            data: {
              tenantId: session.impersonate.tenantId,
              actorId: actorId,
              action: "IMPERSONATION_STARTED",
              entityType: "User",
              entityId: session.impersonate.userId
            }
          });
        }
      } else if (trigger === "update" && session?.exitImpersonation) {
        if (token.actualUserId) {
          token.id = token.actualUserId;
          delete token.actualUserId;
          delete token.impersonatedTenantId;
          delete token.impersonationExpiresAt;
        }
      }

      if (token.impersonationExpiresAt && Date.now() >= token.impersonationExpiresAt) {
        if (token.actualUserId) {
          token.id = token.actualUserId;
          delete token.actualUserId;
          delete token.impersonatedTenantId;
          delete token.impersonationExpiresAt;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        if (token.actualUserId) {
          session.user.actualUserId = token.actualUserId;
          session.user.impersonatedTenantId = token.impersonatedTenantId;
          session.user.impersonationStartedAt = token.impersonationStartedAt;
          session.user.impersonationExpiresAt = token.impersonationExpiresAt;
        }
      }
      return session;
    },
  },
};
