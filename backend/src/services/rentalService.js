const db = require('../config/database');
exports.createRequest = async ({ customerId, siteId, equipmentType, startDate, endDate }) => {
  const client = await db.pool.connect();
  try { await client.query('BEGIN');
    const available = await client.query(`SELECT e.equipmentid FROM equipment e WHERE e.equipmenttype=$1 AND e.status='available' AND NOT EXISTS (SELECT 1 FROM request r WHERE r.assignedequipmentid=e.equipmentid AND r.status IN ('approved','active') AND daterange(r.startdate,r.enddate,'[]') && daterange($2::date,$3::date,'[]')) LIMIT 1 FOR UPDATE`, [equipmentType,startDate,endDate]);
    const equipmentId = available.rows[0]?.equipmentid || null, status = equipmentId ? 'approved' : 'rejected';
    const request = await client.query('INSERT INTO request (requestid,customerid,siteid,equipmenttype,assignedequipmentid,startdate,enddate,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[`REQ-${Date.now()}`,customerId,siteId,equipmentType,equipmentId,startDate,endDate,status]);
    if(equipmentId) await client.query("UPDATE equipment SET status='reserved' WHERE equipmentid=$1",[equipmentId]); await client.query('COMMIT'); return request.rows[0];
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
};
exports.scanRfid = async ({ rfidTag, action }) => { const e = await db.query('SELECT * FROM equipment WHERE rfidtag=$1',[rfidTag]); if(!e.rows[0]) throw Object.assign(new Error('RFID tag not found'),{status:404}); const equipment=e.rows[0]; const status=action==='pickup'?'active':'available'; await db.query('UPDATE equipment SET status=$1 WHERE equipmentid=$2',[status,equipment.equipmentid]); if(action==='return') await db.query("UPDATE request SET status='completed' WHERE assignedequipmentid=$1 AND status='active'",[equipment.equipmentid]); return {...equipment,status}; };
