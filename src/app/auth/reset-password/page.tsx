"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we will send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
            If an account exists for this email, instructions will be sent.
          </p>
          <form className="space-y-4" action={() => alert("Password reset emails are currently disabled in development.")}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>

            <Button className="w-full" type="submit">
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-sm text-neutral-500 space-y-4">
          <div>
            Remember your password?{" "}
            <Link href="/auth/login" className="text-neutral-900 underline hover:text-neutral-700">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
