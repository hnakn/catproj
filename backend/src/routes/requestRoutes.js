const router=require('express').Router(),c=require('../controllers/requestController');router.get('/',c.list);router.post('/',c.create);router.post('/:id/approve',c.approve);module.exports=router;
