import { neon } from "@neondatabase/serverless"

/**
 * Generates the next sequential alphabetic code.
 * AAAA -> AAAB ... -> ZZZZ -> AAAAA
 */
function getNextAlphabeticCode(currentCode: string): string {
  const letters = currentCode.split("")
  let i = letters.length - 1

  while (i >= 0) {
    if (letters[i] === "Z") {
      letters[i] = "A"
      i--
    } else {
      letters[i] = String.fromCharCode(letters[i].charCodeAt(0) + 1)
      return letters.join("")
    }
  }

  // If all were Z, add a new A at the start
  return "A".repeat(letters.length + 1)
}

/**
 * Generates a unique sequential student code.
 * Exported as generateUniqueStudentCode to resolve deployment error.
 */
export async function generateUniqueStudentCode(): Promise<string> {
  const sql = neon(process.env.DATABASE_URL!)

  // Get the last assigned code alphabetically sorted by length then value
  const result = await sql`
    SELECT unique_code 
    FROM students 
    WHERE unique_code IS NOT NULL 
    ORDER BY LENGTH(unique_code) DESC, unique_code DESC 
    LIMIT 1
  `

  if (result.length === 0) {
    return "AAAA" // Starting point
  }

  const lastCode = result[0].unique_code
  return getNextAlphabeticCode(lastCode)
}
