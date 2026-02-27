import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function fixConstraint() {
  try {
    console.log('Starting constraint fix...');
    
    // First, check if the constraint exists
    console.log('Checking existing constraint...');
    const constraintCheck = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'personnel_attendance' 
      AND constraint_name = 'check_valid_user_type'
    `;
    
    if (constraintCheck.length > 0) {
      console.log('Found existing constraint, dropping it...');
      await sql`
        ALTER TABLE personnel_attendance 
        DROP CONSTRAINT check_valid_user_type
      `;
      console.log('Constraint dropped successfully');
    } else {
      console.log('Constraint does not exist, proceeding with creation...');
    }
    
    // Add the new constraint with the correct user types
    console.log('Adding new constraint with correct user types...');
    await sql`
      ALTER TABLE personnel_attendance 
      ADD CONSTRAINT check_valid_user_type 
      CHECK (user_type IN ('admin_personnel', 'accounts_personnel', 'technical_team', 'peon'))
    `;
    
    console.log('✓ Constraint fixed successfully!');
    console.log('Allowed user types: admin_personnel, accounts_personnel, technical_team, peon');
    
    // Verify the constraint was added
    const verifyCheck = await sql`
      SELECT constraint_name, check_clause
      FROM information_schema.table_constraints
      WHERE table_name = 'personnel_attendance' 
      AND constraint_name = 'check_valid_user_type'
    `;
    
    if (verifyCheck.length > 0) {
      console.log('✓ Constraint verification successful');
    }
    
  } catch (error) {
    console.error('Error fixing constraint:', error);
    process.exit(1);
  }
}

fixConstraint();
