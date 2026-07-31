const jwt = require('jsonwebtoken');
exports.authenticate = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET || 'change-me'); next(); } catch { res.status(401).json({ message: 'Authentication required' }); } };
exports.authorize = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Insufficient permissions' });
