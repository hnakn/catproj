const service=require('../services/rentalService');
exports.create=async(req,res,next)=>{try{res.status(201).json(await service.createRequest(req.body))}catch(e){next(e)}};
exports.scan=async(req,res,next)=>{try{res.json(await service.scanRfid(req.body))}catch(e){next(e)}};
