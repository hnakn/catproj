UPDATE equipment SET status='free' WHERE LOWER(status) IN ('available','reserved','free');
UPDATE equipment SET status='occupied' WHERE LOWER(status) IN ('in_transit','active','returning','maintenance','occupied');
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_status_check CHECK (status IN ('free','occupied'));
