-- Safely drop existing CHECK constraint(s) on messages.message_type, then recreate including 'students'
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'messages' AND c.contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ';';
  END LOOP;
END
$$;

ALTER TABLE messages
ADD CONSTRAINT messages_message_type_check
CHECK (message_type IN ('interest', 'course_semester', 'students'));
