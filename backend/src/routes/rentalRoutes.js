const router=require('express').Router(),c=require('../controllers/rentalController');router.post('/',c.create);router.post('/rfid/scan',c.scan);module.exports=router;
