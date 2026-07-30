ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_status_check CHECK (status IN ('available','reserved','in_transit','active','returning'));
ALTER TABLE request DROP CONSTRAINT IF EXISTS request_status_check;
ALTER TABLE request ADD CONSTRAINT request_status_check CHECK (status IN ('pending','approved','rejected','active','returning','completed'));
CREATE TABLE IF NOT EXISTS anomaly (anomalyid varchar(30) PRIMARY KEY,equipmentid varchar(20) REFERENCES equipment(equipmentid),type varchar(100) NOT NULL,reason text NOT NULL,timestamp timestamp NOT NULL);
