const db=require('../config/database');
exports.summary=async(req,res,next)=>{try{const result=await db.query(`SELECT COUNT(*)::int AS "totalEquipment", COUNT(*) FILTER (WHERE status='available')::int AS "availableEquipment", COUNT(*) FILTER (WHERE status='active')::int AS "activeEquipment" FROM equipment`);res.json(result.rows[0])}catch(e){next(e)}};
