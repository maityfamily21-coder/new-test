import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Generates the next unique alphabetic code (A-Z only)
 * Starts with 4 letters (AAAA) and expands as needed.
 */
export async function generateUniqueStudentCode(): Promise<string> {
  // Get the most recent code assigned (highest length, then highest alphabetical)
  const [lastStudent] = await sql`
    SELECT unique_code FROM students 
    WHERE unique_code IS NOT NULL 
    ORDER BY LENGTH(unique_code) DESC, unique_code DESC 
    LIMIT 1
  `

  if (!lastStudent || !lastStudent.unique_code) {
    return "AAAA" // Initial code
  }

  return getNextAlphabeticCode(lastStudent.unique_code)
}

/**
 * Calculates the next alphabetical code (e.g., AAAA -> AAAB, ZZZZ -> AAAAA)
 */
function getNextAlphabeticCode(currentCode: string): string {
  const chars = currentCode.split("")
  let i = chars.length - 1

  while (i >= 0) {
    if (chars[i] === "Z") {
      chars[i] = "A"
      i--
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1)
      return chars.join("")
    }
  }

  // If all characters were 'Z', add a new 'A' to the front (Z -> AA, ZZZZ -> AAAAA)
  return "A" + chars.join("")
}
