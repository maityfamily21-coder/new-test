import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { validateAdminAuth, createAdminUnauthorizedResponse } from "@/lib/admin-auth"
import { verifyAccountsPersonnelAuth } from "@/lib/accounts-personnel-auth"

// Helper to verify either admin or accounts personnel
async function verifyAuth(request: NextRequest) {
  const adminAuth = await validateAdminAuth(request)
  if (adminAuth.success) return { success: true, user: adminAuth.admin }
  
  const accountsAuth = await verifyAccountsPersonnelAuth(request)
  if (accountsAuth.authenticated) return { success: true, user: accountsAuth.personnel }
  
  return { success: false }
}

// GET: Fetch all fee structures or by course
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    let feeStructures

    if (courseId) {
      feeStructures = await sql`
        SELECT 
          fs.*,
          c.name as course_name,
          c.total_semesters
        FROM fee_structure fs
        JOIN courses c ON fs.course_id = c.id
        WHERE fs.course_id = ${courseId}
        ORDER BY fs.semester ASC
      `
    } else {
      feeStructures = await sql`
        SELECT 
          fs.*,
          c.name as course_name,
          c.total_semesters
        FROM fee_structure fs
        JOIN courses c ON fs.course_id = c.id
        ORDER BY c.name, fs.semester ASC
      `
    }

    return NextResponse.json({ success: true, feeStructures })
  } catch (error) {
    console.error("[Fee Structure API] Error fetching fee structures:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch fee structures" }, { status: 500 })
  }
}

// POST: Create or update fee structure
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { courseId, semester, semesterFee, examFee } = body

    if (!courseId || !semester || semesterFee === undefined || examFee === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (semesterFee < 0 || examFee < 0) {
      return NextResponse.json(
        { success: false, message: "Fees cannot be negative" },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO fee_structure (course_id, semester, semester_fee, exam_fee)
      VALUES (${courseId}, ${semester}, ${semesterFee}, ${examFee})
      ON CONFLICT (course_id, semester)
      DO UPDATE SET
        semester_fee = ${semesterFee},
        exam_fee = ${examFee},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `

    return NextResponse.json({ success: true, feeStructure: result[0] })
  } catch (error) {
    console.error("[Fee Structure API] Error creating/updating fee structure:", error)
    return NextResponse.json({ success: false, message: "Failed to save fee structure" }, { status: 500 })
  }
}

// PUT: Update existing fee structure
export async function PUT(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.success) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, courseId, semester, semesterFee, examFee } = body

    if (!id || !courseId || !semester || semesterFee === undefined || examFee === undefined) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      UPDATE fee_structure
      SET semester_fee = ${semesterFee},
          exam_fee = ${examFee},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ success: true, feeStructure: result[0] })
  } catch (error) {
    console.error("[Fee Structure API] Error updating fee structure:", error)
    return NextResponse.json({ success: false, message: "Failed to update fee structure" }, { status: 500 })
  }
}

// DELETE: Delete a fee structure
export async function DELETE(request: NextRequest) {
  const authResult = await validateAdminAuth(request)
  if (!authResult.success) {
    return createAdminUnauthorizedResponse(authResult.error)
  }

  if (authResult.admin?.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Only super admin can delete fee structures" },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, message: "Fee structure ID is required" }, { status: 400 })
    }

    await sql`DELETE FROM fee_structure WHERE id = ${id}`

    return NextResponse.json({ success: true, message: "Fee structure deleted successfully" })
  } catch (error) {
    console.error("[Fee Structure API] Error deleting fee structure:", error)
    return NextResponse.json({ success: false, message: "Failed to delete fee structure" }, { status: 500 })
  }
}
