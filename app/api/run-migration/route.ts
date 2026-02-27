export const dynamic = 'force-dynamic'; // <--- IMPORTANT: This must be line 1

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export async function GET() {
  const scriptDir = path.join(process.cwd(), 'scripts');
  
  if (!fs.existsSync(scriptDir)) {
    return NextResponse.json({ error: "Folder 'scripts' not found" }, { status: 404 });
  }

  // 2. Get all SQL files
  let pendingFiles = fs.readdirSync(scriptDir).filter(f => f.endsWith('.sql'));
  let logs: string[] = [];
  logs.push(`🚀 Found ${pendingFiles.length} files. Starting...`);

  // 3. Connect to Database
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    let passCount = 0;

    // --- THE RETRY LOOP ---
    while (pendingFiles.length > 0) {
      passCount++;
      let successfulFiles: string[] = [];
      const startCount = pendingFiles.length;

      logs.push(`--- Pass ${passCount} (Files left: ${startCount}) ---`);

      for (const file of pendingFiles) {
        const filePath = path.join(scriptDir, file);
        const sqlContent = fs.readFileSync(filePath, 'utf-8');

        try {
          await client.query(sqlContent);
          logs.push(`✅ Success: ${file}`);
          successfulFiles.push(file);
        } catch (err: any) {
          // Log the error for debugging
          logs.push(`❌ Error in ${file}: ${err?.message?.substring(0, 100) || err}`);
          // Ignore error and try again next loop
        }
      }

      pendingFiles = pendingFiles.filter(f => !successfulFiles.includes(f));

      if (pendingFiles.length === startCount) {
        logs.push(`⛔ STUCK! Remaining files have errors: ${pendingFiles.join(', ')}`);
        break;
      }
    }

    client.release();
  } catch (err: any) {
    return NextResponse.json({ error: "DB Connection Failed", details: err.message }, { status: 500 });
  }

  return NextResponse.json({ 
    status: pendingFiles.length === 0 ? "Success" : "Partial Failure",
    logs: logs 
  });
}
