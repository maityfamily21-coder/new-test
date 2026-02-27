import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { studentId, caste, gender } = body;

    // validation
    if (!studentId || !caste || !gender) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // update student profile
    const result = await pool.query(
      `
      UPDATE students
      SET caste = $1,
          gender = $2,
          profile_completed = true
      WHERE id = $3
      RETURNING id, caste, gender, profile_completed
      `,
      [caste, gender, studentId]
    );

    return NextResponse.json({
      success: true,
      student: result.rows[0],
    });

  } catch (error) {
    console.error("Profile update error:", error);

    return NextResponse.json(
      { error: "Database update failed" },
      { status: 500 }
    );
  }
}