const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token found' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.status(401).json({ message: 'Token is not valid or has expired' });
    }
};

const mechanicOnly = (req, res, next) => {
    if (req.user.role !== 'mechanic') {
        return res.status(403).json({ message: 'Access denied. Mechanics only.' });
    }
    next();
};

const userOnly = (req, res, next) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. Users only.' });
    }
    next();
};

module.exports = { auth, mechanicOnly, userOnly };
