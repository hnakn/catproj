BEGIN;

ALTER TABLE anomaly
  ALTER COLUMN equipmentid TYPE varchar(20)
  USING equipmentid::varchar(20);

ALTER TABLE anomaly
  ADD CONSTRAINT anomaly_equipmentid_fkey
  FOREIGN KEY (equipmentid) REFERENCES equipment(equipmentid);

CREATE TABLE IF NOT EXISTS anomaly_detection_run (
  runid uuid PRIMARY KEY,
  run_date date NOT NULL,
  startedat timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completedat timestamp,
  rows_read integer NOT NULL DEFAULT 0,
  rule_hits integer NOT NULL DEFAULT 0,
  ml_flags integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'RUNNING',
  error_message text
);

COMMIT;
