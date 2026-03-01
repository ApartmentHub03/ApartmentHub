-- Help find where the webhook history is stored
-- 1. List all tables in the 'net' schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'net';

-- 2. Try to find the request 436 in the main table (often it's just 'http_request')
SELECT * FROM net.http_request WHERE id = 436;

-- 3. If that doesn't exist, try common variations
-- Some versions use 'audit_log' or similar
SELECT * FROM net._http_response WHERE id = 436;
