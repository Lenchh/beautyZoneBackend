import type { Response } from 'express';
import { prisma } from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id! },
      select: {
        id: true,
        created_at: true,
        name: true,
        surname: true,
        phone: true,
        email: true,
        role: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'Користувача не знайдено.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити інформацію про користувача.' });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, surname, phone, email } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: userId! },
      data: { name, surname, phone, email },
    });
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Користувач з таким email вже зареєстрований' });
    }
    console.error('Помилка при оновленні профілю: ', error);
    res.status(500).json({ error: 'Не вдалося оновити профіль.' });
  }
};
