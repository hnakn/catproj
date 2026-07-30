const router=require('express').Router(),c=require('../controllers/customerController');router.get('/',c.list);router.get('/:id/portal',c.portal);module.exports=router;
