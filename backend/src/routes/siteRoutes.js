const router=require('express').Router(),c=require('../controllers/siteController');router.post('/',c.create);module.exports=router;
