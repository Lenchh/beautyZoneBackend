import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export const getBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const now = new Date();
    await prisma.booking.updateMany({
      where: {
        status: 'active',
        time: { lt: now },
      },
      data: {
        status: 'completed',
      },
    });
    const whereCondition = userRole === 'admin' ? {} : { userId: String(userId) };
    const bookings = await prisma.booking.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        procedure: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
    res.json(bookings);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити записи.' });
  }
};

export const getAvailableTimes = async (req: Request, res: Response) => {
  try {
    const { date, procedureId } = req.query;
    if (!date || !procedureId) {
      return res.status(400).json({ error: 'Не вказана дата або ID процедури' });
    }
    const allTimeSlots = ['09:00', '10:15', '11:30', '12:45', '14:00', '15:15', '16:30', '17:45', '19:00'];
    const searchDate = new Date(String(date));
    const startOfDay = new Date(
      Date.UTC(searchDate.getUTCFullYear(), searchDate.getUTCMonth(), searchDate.getUTCDate(), 0, 0, 0)
    );

    const endOfDay = new Date(
      Date.UTC(searchDate.getUTCFullYear(), searchDate.getUTCMonth(), searchDate.getUTCDate(), 23, 59, 59, 999)
    );
    const bookings = await prisma.booking.findMany({
      where: {
        procedureId: Number(procedureId),
        status: 'active',
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { time: true },
    });
    const bookedTimes = bookings.map((b) => {
      const timeString = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(b.time);

      return timeString;
    });
    const availableSlots = allTimeSlots.filter((slot) => !bookedTimes.includes(slot));
    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ error: 'Помилка завантаження вільного часу.' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { procedureId, date, time, guestName, guestSurname, guestPhone } = req.body;
    let userId: string | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
      try {
        const decoded = jwt.verify(token!, jwtSecret) as unknown as { id: string };
        userId = decoded.id;
      } catch (err) {
        return res.status(401).json({ error: 'Токен недійсний.' });
      }
    }
    if (!userId && (!guestName || !guestPhone)) {
      return res.status(400).json({ error: 'Для запису необхідні імʼя та телефон' });
    }
    const newBooking = await prisma.booking.create({
      data: {
        userId: userId,
        procedureId,
        date: new Date(date),
        time: new Date(time),
        status: 'active',
        guestName: userId ? null : guestName,
        guestSurname: userId ? null : guestSurname,
        guestPhone: userId ? null : guestPhone,
      },
    });
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Помилка при створенні запису: ', error);
    res.status(500).json({ error: 'Помилка при створенні запису.' });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id, status } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const booking = await prisma.booking.findUnique({
      where: { id: String(id) },
    });
    if (!booking) {
      return res.status(404).json({ error: 'Запис не знайдено' });
    }
    if (userRole !== 'admin' && booking.userId !== userId) {
      return res.status(403).json({ error: 'Ви не можете скасувати чужий запис' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: String(id) },
      data: { status },
    });
    res.json(updatedBooking);
  } catch (error) {
    console.error('Помилка при спробі змінити статус запису: ', error);
    res.status(500).json({ error: error });
  }
};
