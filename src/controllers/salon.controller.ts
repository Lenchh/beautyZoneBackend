import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export const getProcedures = async (req: Request, res: Response) => {
  try {
    const procedures = await prisma.procedure.findMany();
    res.json(procedures);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити процедури.' });
  }
};

export const createProcedure = async (req: AuthRequest, res: Response) => {
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
};

export const getSpecialists = async (req: Request, res: Response) => {
  try {
    const specialists = await prisma.specialist.findMany();
    res.json(specialists);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити спеціалістів.' });
  }
};

export const createSpecialist = async (req: AuthRequest, res: Response) => {
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
};

export const getCertificates = async (req: Request, res: Response) => {
  try {
    const certificates = await prisma.certificate.findMany();
    res.json(certificates);
  } catch (error) {
    console.error('Помилка бази даних: ', error);
    res.status(500).json({ error: 'Не вдалося завантажити сертифікати.' });
  }
};
