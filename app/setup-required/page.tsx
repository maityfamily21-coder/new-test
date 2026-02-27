'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SetupRequiredPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-4">
      <Card className="w-full max-w-2xl bg-slate-800 border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-500 text-2xl">Database Setup Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-950/30 border border-red-500/30 rounded p-4">
            <p className="text-red-300 font-semibold mb-2">⚠️ Database Not Initialized</p>
            <p className="text-slate-300">
              The database tables for lecture QR attendance are not set up yet. You need to run the migrations before students can mark attendance.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-white">What to do:</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Click the button below to go to the Setup page</li>
              <li>Click "Run Migration Sequence"</li>
              <li>Wait for all migrations to complete (you'll see green checkmarks)</li>
              <li>Return to the dashboard and try scanning the QR code again</li>
            </ol>
          </div>

          <Link href="/setup-db" className="block">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Go to Database Setup
            </Button>
          </Link>

          <div className="bg-slate-700/30 border border-slate-600/30 rounded p-4 text-sm text-slate-400">
            <p className="font-semibold mb-1">Estimated time:</p>
            <p>~30 seconds to 2 minutes depending on your database connection</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
