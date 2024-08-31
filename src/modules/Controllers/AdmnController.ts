import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const redis = new Redis();

const prisma = new PrismaClient();

class AdmnController {

  async filterByAge(req: Request, res: Response) {
  try {
    // Obtenha todas as classes
    const classes = await prisma.classes.findMany();

    for (const classe of classes) {
      const pointsArray = [];

      // Crie objetos no array 'points' com base no número de 'pontos'
      for (let i = 0; i < classe.pontos; i++) {
        pointsArray.push({
          classId: classe.id,
        });
      }

      // Crie registros em 'Points' associados à classe
      await prisma.points.createMany({
        data: pointsArray,
      });
    }

    res.status(200).send('Todos os pontos foram atualizados para as classes.');
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao atualizar pontos para as classes.');
  }
};
}

export default new AdmnController();
