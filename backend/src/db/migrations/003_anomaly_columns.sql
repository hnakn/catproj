ALTER TABLE anomaly ADD COLUMN IF NOT EXISTS equipmentid varchar(20);
ALTER TABLE anomaly ADD COLUMN IF NOT EXISTS type varchar(100);
ALTER TABLE anomaly ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE anomaly ADD COLUMN IF NOT EXISTS timestamp timestamp;
