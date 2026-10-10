"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { registerOwner } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await registerOwner(formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push("/auth/login?registered=true")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create your business</CardTitle>
          <CardDescription>
            Enter your information to start using Vela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="terms" name="terms" value="on" required />
              <Label htmlFor="terms" className="text-sm font-normal">
                I agree to the terms and privacy policy
              </Label>
            </div>

            {error && (
              <div className="text-sm text-red-500 font-medium">{error}</div>
            )}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-sm text-neutral-500 space-y-4">
          <div>
            Already have an account?{" "}
            <Link href="/auth/login" className="text-neutral-900 underline hover:text-neutral-700">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
