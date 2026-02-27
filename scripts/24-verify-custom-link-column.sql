-- Check if custom_link column exists and has data
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name = 'custom_link';

-- Show companies with custom_link values
SELECT id, name, custom_link FROM companies WHERE custom_link IS NOT NULL LIMIT 10;

-- Count companies with custom_link
SELECT COUNT(*) as total_companies, COUNT(custom_link) as with_custom_link FROM companies;
