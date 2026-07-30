const service = require('../services/equipmentService');
exports.list = async (req,res,next)=>{try{res.json(await service.list())}catch(e){next(e)}};
exports.telemetry = async (req,res,next)=>{try{res.json(await service.telemetry(req.params.id))}catch(e){next(e)}};
exports.create = async (req,res,next)=>{try{res.status(201).json(await service.create(req.body))}catch(e){next(e)}};
exports.status = async (req,res,next)=>{try{res.json(await service.updateStatus(req.params.id,req.body.status))}catch(e){next(e)}};
exports.remove = async (req,res,next)=>{try{await service.remove(req.params.id);res.status(204).end()}catch(e){next(e)}};
