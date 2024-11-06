import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class AdmnController {

  // Função para definir valores padrão nas novas colunas
  async setDefaultValues(req: Request, res: Response) {
    try {
      // Atualizar registros existentes na tabela Points
      const points = await prisma.points.findMany();
      for (const point of points) {
        await prisma.points.update({
          where: { id: point.id },
          data: {
            userId: point.userId ?? 1, // Define userId como 1, se estiver vazio
            createdAt: point.createdAt ?? new Date(), // Define createdAt como data atual, se estiver vazio
          },
        });
      }

      // Atualizar registros existentes na tabela Presence
      const presences = await prisma.presence.findMany();
      for (const presence of presences) {
        await prisma.presence.update({
          where: { id: presence.id },
          data: {
            createdAt: presence.createdAt ?? new Date(), // Define createdAt como data atual, se estiver vazio
            userId: presence.userId ?? 1, // Define userId como 1, se estiver vazio
          },
        });
      }

      res.status(200).send('Valores padrão foram definidos para as novas colunas.');
    } catch (e) {
      console.error(e);
      res.status(500).send('Erro ao definir valores padrão para as novas colunas.');
    }
  }

}

export default new AdmnController();