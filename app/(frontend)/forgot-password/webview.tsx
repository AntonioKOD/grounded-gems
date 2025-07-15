"use client"

import React, { useState } from "react"
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Status = "idle" | "loading" | "success" | "error"

export default function ForgotPasswordWebView() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setError("")

    try {
      const response = await fetch("/api/users/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      let data
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        } else {
          data = {}
        }
      } catch (parseError) {
        throw new Error("Server returned an invalid response. Please try again.")
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to send reset email")
      }

      setStatus("success")
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="flex justify-center items-center min-h-[70vh] px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              If you don't see the email within a few minutes, please check your spam folder.
            </p>
            <p className="text-sm text-gray-600">
              The reset link will expire in 1 hour for security reasons.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={() => { setStatus("idle"); setEmail(""); setError("") }} 
              variant="outline"
              className="w-full"
            >
              Send another email
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  required
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]" 
              disabled={status === "loading" || !email.trim()}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset email...
                </>
              ) : (
                "Send reset email"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 