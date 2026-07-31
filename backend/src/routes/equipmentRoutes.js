const router=require('express').Router(),c=require('../controllers/equipmentController');
router.get('/',c.list);router.get('/:id/telemetry',c.telemetry);router.post('/',c.create);router.patch('/:id/status',c.status);router.delete('/:id',c.remove);module.exports=router;
