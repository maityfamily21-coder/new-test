'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, CreditCard } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SemesterPayButtonProps {
  semester: number
  remaining: number
  studentId: string
  enrollmentNumber: string
  fullName: string
  courseName: string
  status: string
  onPaymentComplete?: () => void
}

export function SemesterPayButton({
  semester,
  remaining,
  studentId,
  enrollmentNumber,
  fullName,
  courseName,
  status,
  onPaymentComplete,
}: SemesterPayButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feeType, setFeeType] = useState('Both')
  const [error, setError] = useState('')

  // Only show button if there's a remaining amount and status is not fully paid
  const canPay = remaining > 0 && status !== 'Paid'

  const handlePayNow = async () => {
    if (!canPay) return

    setError('')
    setLoading(true)

    try {
      // Step 1: Initiate payment
      const response = await fetch('/api/student/fees/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('studentToken')}`,
        },
        body: JSON.stringify({
          semester,
          feeType: feeType === 'Both' ? 'Semester + Exam' : feeType,
          amount: remaining,
          studentId,
          enrollmentNumber,
          fullName,
          courseName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate payment')
      }

      const data = await response.json()

      // Step 2: Create form and submit to CCAvenue
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.redirectUrl

      const encRequestInput = document.createElement('input')
      encRequestInput.type = 'hidden'
      encRequestInput.name = 'encRequest'
      encRequestInput.value = data.encRequest

      const accessCodeInput = document.createElement('input')
      accessCodeInput.type = 'hidden'
      accessCodeInput.name = 'access_code'
      accessCodeInput.value = data.accessCode

      form.appendChild(encRequestInput)
      form.appendChild(accessCodeInput)
      document.body.appendChild(form)
      form.submit()

      setOpen(false)
      // Note: Page will redirect to bank gateway
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment initiation failed'
      setError(errorMsg)
      console.error('[v0] Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!canPay) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="gap-2"
        disabled={loading}
      >
        <CreditCard className="h-4 w-4" />
        {loading ? 'Processing...' : 'Pay Now'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Semester {semester} Fees</DialogTitle>
            <DialogDescription>
              Complete your payment through secure online gateway
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Student Name:</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Enrollment:</span>
                  <span className="font-medium font-mono">{enrollmentNumber}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Course:</span>
                  <span className="font-medium">{courseName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Semester:</span>
                  <Badge variant="secondary">Semester {semester}</Badge>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Amount Due:</span>
                    <span className="text-xl font-bold text-blue-600">₹{remaining.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold text-sm">Secure Online Payment</p>
                    <p className="text-xs text-muted-foreground">CCAvenue Gateway (Bank Integration)</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to a secure payment gateway. Your banking details are encrypted and protected.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayNow}
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
