"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SetupPage() {
  const [status, setStatus] = useState("Idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function runMigration() {
    setLoading(true);
    setStatus("Running...");
    setLogs(["Request sent... waiting for server..."]);

    try {
      // Call the API route you created
      const res = await fetch("/api/run-migration");
      const data = await res.json();

      if (data.logs) {
        setLogs(data.logs);
      }
      setStatus(data.status || "Done");
    } catch (error) {
      setStatus("Error");
      setLogs((prev) => [...prev, "Failed to connect to API."]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Database Migration Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400">
            Click below to run all SQL scripts in the /scripts folder.
          </p>

          <Button 
            onClick={runMigration} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2"
          >
            {loading ? "Running Loop..." : "Run Migration Sequence"}
          </Button>

          {logs.length > 0 && (
            <div className="mt-4 p-4 bg-zinc-950 rounded border border-zinc-800 font-mono text-sm h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="mb-1 text-green-400 border-b border-zinc-900 pb-1">
                  {log}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
