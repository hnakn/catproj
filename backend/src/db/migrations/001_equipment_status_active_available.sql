-- Convert legacy states before limiting the allowed equipment lifecycle states.
UPDATE equipment SET status = 'available' WHERE status IN ('reserved', 'maintenance');

ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment
  ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('available', 'active'));
