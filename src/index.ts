import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

//auth
app.post('/api/auth/register', async (req, res) => {
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
});

app.post('/api/auth/login', async (req, res) => {
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
});

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

//GET
app.get('/api/procedures', async (req, res) => {
  try {
    const procedures = await prisma.procedure.findMany();
    res.json(procedures);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити процедури.' });
  }
});

app.get('/api/specialists', async (req, res) => {
  try {
    const specialists = await prisma.specialist.findMany();
    res.json(specialists);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити спеціалістів.' });
  }
});

app.get('/api/certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany();
    res.json(certificates);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити сертифікати.' });
  }
});

app.get('/api/bookings', authenticateToken, async (req: AuthRequest, res) => {
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
});

app.get('/api/users/profile', authenticateToken, async (req: AuthRequest, res) => {
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
});

app.get('/api/bookings/available-times', async (req, res) => {
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
      const hours = b.time.getUTCHours().toString().padStart(2, '0');
      const minutes = b.time.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });
    const availableSlots = allTimeSlots.filter((slot) => !bookedTimes.includes(slot));
    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ error: 'Помилка завантаження вільного часу.' });
  }
});

//POST
app.post('/api/bookings', async (req, res) => {
  try {
    console.log('Дані з фронтенду:', req.body);
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
});

//PATCH
app.patch('/api/bookings', authenticateToken, async (req: AuthRequest, res) => {
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
});

app.patch('/api/users/profile', authenticateToken, async (req: AuthRequest, res) => {
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
});

//ADMIN ROUTES
app.post('/api/procedures', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { category, description, duration, imgUrl, price, title } = req.body;
    const newProcedure = await prisma.procedure.create({
      data: {
        category,
        description,
        duration,
        imgUrl,
        price: Number(price),
        title,
      },
    });
    res.status(201).json(newProcedure);
  } catch (error) {
    res.status(500).json({ error: 'Не вдалося створити процедуру' });
  }
});

app.post('/api/specialists', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { description, imgUrl, experience, name, specialty, surname } = req.body;
    const newSpecialist = await prisma.specialist.create({
      data: {
        description,
        imgUrl,
        experience,
        name,
        specialty,
        surname,
      },
    });
    res.status(201).json(newSpecialist);
  } catch (error) {
    res.status(500).json({ error: 'Не вдалося додати фахівця' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер успешно запущен: http://localhost:${PORT}/api/specialists`);
});
