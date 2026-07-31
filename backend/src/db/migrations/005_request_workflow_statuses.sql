ALTER TABLE request DROP CONSTRAINT IF EXISTS request_status_check;

ALTER TABLE request
  ADD CONSTRAINT request_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'returning', 'completed'));
