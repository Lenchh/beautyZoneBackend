import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, surname, email, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        surname,
        email,
        phone,
        password: hashedPassword,
        role: 'client',
      },
    });
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Користувач з таким email вже зареєстрований' });
    }
    console.error('Помилка при створенні профілю: ', error);
    res.status(500).json({ error: 'Помилка реєстрації.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '24h' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Помилка авторизації.' });
  }
};
