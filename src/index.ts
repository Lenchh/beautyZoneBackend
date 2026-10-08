import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = 3000;

app.use(express.json());

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

app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        procedure: true,
      },
    });
    res.json(bookings);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити записи.' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
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

//POST
app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, procedureId, date, time } = req.body;
    const newBooking = await prisma.booking.create({
      data: {
        userId,
        procedureId,
        date: new Date(date),
        time: new Date(time),
        status: 'active',
      },
    });
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Помилка при створенні запису: ', error);
    res.status(500).json({ error: 'Помилка при створенні запису.' });
  }
});

//PATCH
app.patch('/api/bookings', async (req, res) => {
  try {
    const { id, status } = req.body;
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

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, surname, phone, email } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
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

app.listen(PORT, () => {
  console.log(`Сервер успешно запущен: http://localhost:${PORT}/api/specialists`);
});
