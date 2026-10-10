import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a verification link to confirm your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 mb-6">
            If transactional emails are not yet configured in this environment, this step cannot be completed. 
            For development, verification is currently bypassed in login logic.
          </p>
          <Link href="/auth/login" className="text-sm text-neutral-900 underline hover:text-neutral-700">
            Return to log in
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
