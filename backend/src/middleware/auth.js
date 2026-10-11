const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

async function authenticateToken(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).json({message:'Authentication required'});
    }

    const token = authorization.slice(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (typeof payload.userid !== 'string' || !ObjectId.isValid(payload.userid)) {
            return res.status(401).json({message:'Invalid or expired token'});
        }

        const db = req.app.locals.db;

        const user = await db.collection('users').findOne({
            _id: new ObjectId(payload.userid),
            isActive: true
        }, {
            projection: {
                password: 0
            }
        });

        if (!user) {
            return res.status(401).json({message:'Account not found'});
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({message:'Invalid or expired token'});
        }

        console.error("Auth failed: ", err.message);

        return res.status(500).json({message:'Unable to authenticate request'});
    }
}

async function adminVerify(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({message:'Admin access required'});
    }

    next();
}

module.exports = { authenticateToken, adminVerify };