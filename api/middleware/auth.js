const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      details: ['Missing or invalid Authorization header'] 
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const expectedToken = process.env.ADMIN_TOKEN;

  if (token !== expectedToken) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      details: ['Invalid token'] 
    });
  }

  next();
};

module.exports = authMiddleware;
