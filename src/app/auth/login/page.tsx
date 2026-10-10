"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const registered = searchParams?.get("registered")

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    setLoading(false)

    if (result?.error) {
      setError("Invalid email or password")
    } else {
      let callbackUrl = searchParams?.get("callbackUrl") || "/dashboard"
      // Prevent open redirects
      if (!callbackUrl.startsWith("/")) {
        callbackUrl = "/dashboard"
      }
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your email and password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
              Registration successful! Please log in.
            </div>
          )}

          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/reset-password" className="text-xs text-neutral-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>

            {error && (
              <div className="text-sm text-red-500 font-medium">{error}</div>
            )}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button" onClick={() => alert("Google OAuth not configured locally.")}>
                Google
              </Button>
              <Button variant="outline" type="button" onClick={() => alert("Apple OAuth not configured locally.")}>
                Apple
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-sm text-neutral-500 space-y-4">
          <div>
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-neutral-900 underline hover:text-neutral-700">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
