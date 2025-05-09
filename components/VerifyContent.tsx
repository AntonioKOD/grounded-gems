"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, AlertCircle, Loader2, RefreshCw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Status = "verifying" | "success" | "error"

export default function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const router = useRouter()
  const [status, setStatus] = useState<Status>("verifying")
  const [errorMessage, setErrorMessage] = useState<string>("Your verification link is invalid or has expired.")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      return
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/users/verify/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (res.ok) {
          setStatus("success")
          // let them see the success message before redirecting
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        } else {
          const data = await res.json().catch(() => ({}))
          setErrorMessage(data.message || "Verification failed. Please request a new link.")
          setStatus("error")
        }
      } catch (err) {
        console.error("Verification error:", err)
        setStatus("error")
      }
    }

    verify()
  }, [token, router])

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        {status === "verifying" && (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-center">Verifying Your Email</CardTitle>
              <CardDescription className="text-center">Please wait while we verify your email address</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-[#FF6B6B]/10 p-6 mb-6">
                <Loader2 className="h-12 w-12 text-[#FF6B6B] animate-spin" />
              </div>
              <p className="text-center text-muted-foreground">This will only take a moment...</p>
            </CardContent>
          </>
        )}

        {status === "success" && (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-center text-green-600">Email Verified!</CardTitle>
              <CardDescription className="text-center">Your email has been successfully verified</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-green-100 p-6 mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-center text-muted-foreground mb-2">Thank you for verifying your email address.</p>
              <p className="text-center font-medium">Redirecting you to login...</p>
            </CardContent>
            <CardFooter className="flex justify-center pb-6">
              <Button onClick={() => router.push("/login")} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white">
                Go to Login <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {status === "error" && (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-center text-red-600">Verification Failed</CardTitle>
              <CardDescription className="text-center">We couldn&apos;t verify your email address</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="rounded-full bg-red-100 p-6 mb-6">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <p className="text-center text-muted-foreground">
                Please request a new verification link or contact support if you continue to experience issues.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pb-6">
              <Button
                onClick={() => router.push("/resend-verification")}
                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Request New Link
              </Button>
              <Button variant="outline" onClick={() => router.push("/login")} className="w-full sm:w-auto">
                Return to Login
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}
