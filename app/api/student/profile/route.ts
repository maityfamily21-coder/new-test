import { NextRequest, NextResponse } from "next/server"
import { validateStudentAuth, createStudentUnauthorizedResponse } from "@/lib/student-auth-server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {

  try {

    // ✅ Validate student auth
    const authResult = await validateStudentAuth(request)

    if (!authResult.success) {
      return createStudentUnauthorizedResponse(authResult.error)
    }

    const body = await request.json()

    const {
      studentId,
      caste,
      gender,

      emergency_contact_number,
      date_of_birth,

      address_house,
      address_block,
      address_landmark,
      address_area,
      address_city,
      address_state,
      address_pincode

    } = body

    if (!studentId) {

      return NextResponse.json({
        success: false,
        message: "Student ID required"
      })

    }

    // ✅ Update student profile
    await sql`

      UPDATE students SET

        caste = ${caste},
        gender = ${gender},

        emergency_contact_number = ${emergency_contact_number},
        date_of_birth = ${date_of_birth},

        address_house = ${address_house},
        address_block = ${address_block},
        address_landmark = ${address_landmark},
        address_area = ${address_area},
        address_city = ${address_city},
        address_state = ${address_state},
        address_pincode = ${address_pincode},

        profile_completed = TRUE

      WHERE id = ${studentId}

    `

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    })

  }

  catch (error) {

    console.error("Profile update error:", error)

    return NextResponse.json({
      success: false,
      message: "Server error"
    })

  }

}
