const router=require('express').Router(),c=require('../controllers/notificationController');router.get('/admin',c.admin);router.get('/customer/:id',c.customer);module.exports=router;
