const router=require('express').Router(),c=require('../controllers/dashboardController');router.get('/',c.summary);module.exports=router;
