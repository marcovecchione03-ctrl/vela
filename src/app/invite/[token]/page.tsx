import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { createHash } from "crypto"
import { redirect } from "next/navigation"
import { AcceptInviteForm } from "./AcceptInviteForm"

export const metadata = {
  title: "Accept Invitation | Vela",
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions)
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const invite = await prisma.teamInvitation.findUnique({
    where: { tokenHash },
    include: { tenant: true }
  })

  if (!invite) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-xl text-red-500">Invalid or expired invitation.</p>
      </div>
    )
  }

  if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-xl text-red-500">This invitation is no longer valid.</p>
      </div>
    )
  }

  // Check if they are already logged in
  if (!session?.user) {
    const callbackUrl = encodeURIComponent(`/invite/${token}`)
    redirect(`/auth/login?callbackUrl=${callbackUrl}`)
  }

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Join {invite.tenant.name}</h1>
        <p className="text-muted-foreground mb-6">
          You have been invited to join {invite.tenant.name} as a {invite.role}.
        </p>

        <AcceptInviteForm token={token} email={session.user.email!} />
      </div>
    </div>
  )
}
