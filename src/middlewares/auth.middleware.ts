import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

//Перевіряє чи є взагалі токен
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Доступ заборонено. Немає токена.' });
  }
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Токен недійсний або прострочений.' });
    }
    req.user = decoded as { id: string; role: string };
    next();
  });
};

//Перевіряє чи є користувач адміном
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Спочатку потрібно авторизуватися.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ заборонено. Тільки для адміністраторів.' });
  }
  next();
};
