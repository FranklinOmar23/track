import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload.username;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'No autorizado' });
  }
};
