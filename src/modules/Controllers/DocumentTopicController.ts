
import 'dotenv/config';
import type { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../../services/cloudinary.service';

const prisma = new PrismaClient();

class DocumentTopicController {

  // Criar tópico
  async create(req: Request, res: Response) {
    try {
      const { title, description, endDate } = req.body;

      if (
        typeof title !== 'string' || !title.trim() ||
        typeof description !== 'string' || !description.trim() ||
        !endDate
      ) {
        return res.status(400).send(
          'Título, descrição e prazo de entrega são obrigatórios.'
        );
      }

      const parsedDate = new Date(endDate);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).send('Data de entrega inválida.');
      }

      const topic = await prisma.documentTopic.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          endDate: parsedDate,
        },
      });

      return res.status(201).json(topic);
    } catch (e) {
      console.error(e);
      return res.status(500).send('Erro ao criar tópico.');
    }
  }

  // Listar tópicos
  async findAll(req: Request, res: Response) {
    try {
      const topics = await prisma.documentTopic.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(topics);
    } catch (e) {
      console.error(e);
      return res.status(500).send('Erro ao buscar tópicos.');
    }
  }

  // Listar usuários e situação das entregas
  async findUsersDelivery(req: Request, res: Response) {
    try {
      const topicId = Number(req.params.id);

      if (!Number.isInteger(topicId) || topicId <= 0) {
        return res.status(400).send('ID do tópico inválido.');
      }

      const topic = await prisma.documentTopic.findUnique({
        where: { id: topicId },
      });

      if (!topic) {
        return res.status(404).send('Tópico não encontrado.');
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          position: true,
          isActive: true,

          DocumentSubmissions: {
            where: {
              topicId,
            },
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              submittedAt: true,
            },
          },
        },
        orderBy: {
          username: 'asc',
        },
      });

      const usersDelivery = users.map((user) => {
        const submission = user.DocumentSubmissions[0] ?? null;

        const onTime = submission
          ? submission.submittedAt <= topic.endDate
          : null;

        return {
          id: user.id,
          username: user.username,
          position: user.position,
          isActive: user.isActive,
          delivered: !!submission,
          status: !submission
            ? 'PENDENTE'
            : onTime
              ? 'ENTREGUE_NO_PRAZO'
              : 'ENTREGUE_COM_ATRASO',

          submission: submission
            ? {
                id: submission.id,
                fileName: submission.fileName,
                fileUrl: submission.fileUrl,
                submittedAt: submission.submittedAt,
                onTime,
              }
            : null,
        };
      });

      const delivered = usersDelivery.filter(
        (user) => user.delivered
      ).length;

      const pending = usersDelivery.length - delivered;

      return res.status(200).json({
        topic: {
          id: topic.id,
          title: topic.title,
          endDate: topic.endDate,
        },
        totalUsers: usersDelivery.length,
        delivered,
        pending,
        users: usersDelivery,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).send(
        'Erro ao buscar entregas dos usuários.'
      );
    }
  }

  // Buscar tópico por ID
  async findById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send('ID inválido.');
      }

      const topic = await prisma.documentTopic.findUnique({
        where: { id },
      });

      if (!topic) {
        return res.status(404).send('Tópico não encontrado.');
      }

      return res.status(200).json(topic);
    } catch (e) {
      console.error(e);
      return res.status(500).send('Erro ao buscar tópico.');
    }
  }

  // Atualizar tópico
  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send('ID inválido.');
      }

      const { title, description, endDate } = req.body;

      if (
        title !== undefined &&
        (typeof title !== 'string' || !title.trim())
      ) {
        return res.status(400).send('Título inválido.');
      }

      if (
        description !== undefined &&
        (typeof description !== 'string' || !description.trim())
      ) {
        return res.status(400).send('Descrição inválida.');
      }

      let parsedDate: Date | undefined;

      if (endDate !== undefined) {
        parsedDate = new Date(endDate);

        if (isNaN(parsedDate.getTime())) {
          return res.status(400).send('Data de entrega inválida.');
        }
      }

      const topic = await prisma.documentTopic.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && {
            description: description.trim(),
          }),
          ...(parsedDate && { endDate: parsedDate }),
        },
      });

      return res.status(200).json(topic);
    } catch (e) {
      console.error(e);

      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        return res.status(404).send('Tópico não encontrado.');
      }

      return res.status(500).send('Erro ao atualizar tópico.');
    }
  }

  // Excluir tópico
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send('ID inválido.');
      }

      await prisma.documentTopic.delete({
        where: { id },
      });

      return res.status(200).send('Tópico excluído com sucesso.');
    } catch (e) {
      console.error(e);

      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        return res.status(404).send('Tópico não encontrado.');
      }

      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        return res.status(409).send(
          'Não é possível excluir: existem entregas vinculadas a este tópico.'
        );
      }

      return res.status(500).send('Erro ao excluir tópico.');
    }
  }

  // Enviar documento
  async uploadDocument(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);
    const topicId = Number(req.params.topicId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(topicId) ||
      topicId <= 0
    ) {
      return res.status(400).json({
        error: "ID de usuário ou tópico inválido.",
        received: {
          userId: req.params.userId,
          topicId: req.params.topicId,
        },
      });
    }

      if (!req.file) {
        return res.status(400).send('Nenhum arquivo enviado.');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).send('Usuário não encontrado.');
      }

      const topic = await prisma.documentTopic.findUnique({
        where: { id: topicId },
      });

      if (!topic) {
        return res.status(404).send('Tópico não encontrado.');
      }

      // Verificar se já existe uma entrega
      const existing = await prisma.documentSubmission.findUnique({
        where: {
          userId_topicId: {
            userId,
            topicId,
          },
        },
      });

      if (existing) {
        return res.status(409).send(
          'Você já realizou essa entrega.'
        );
      }

      const result = await uploadToCloudinary(
        req.file,
        'document-submissions'
      );

      const submission = await prisma.documentSubmission.create({
        data: {
          userId,
          topicId,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileUrl: result.secure_url,
        },
      });

      const onTime = submission.submittedAt <= topic.endDate;

      return res.status(201).json({
        message: 'Documento enviado com sucesso!',
        submission,
        onTime,
        status: onTime
          ? 'ENTREGUE_NO_PRAZO'
          : 'ENTREGUE_COM_ATRASO',
      });
    } catch (e) {
      console.error(e);
      return res.status(500).send('Erro ao enviar documento.');
    }
  }

  async findMySubmissions(req: Request, res: Response) {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        error: "ID de usuário inválido.",
      });
    }

    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    // Busca todas as entregas realizadas pelo usuário
    const submissions = await prisma.documentSubmission.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        userId: true,
        topicId: true,
        fileName: true,
        fileUrl: true,
        submittedAt: true,

        topic: {
          select: {
            endDate: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    // Calcula se cada entrega foi realizada dentro do prazo
    const formattedSubmissions = submissions.map((submission) => {
      const onTime =
        submission.submittedAt.getTime() <=
        submission.topic.endDate.getTime();

      return {
        id: submission.id,
        userId: submission.userId,
        topicId: submission.topicId,
        fileName: submission.fileName,
        fileUrl: submission.fileUrl,
        submittedAt: submission.submittedAt,
        onTime,
        status: onTime
          ? "ENTREGUE_NO_PRAZO"
          : "ENTREGUE_COM_ATRASO",
      };
    });

    return res.status(200).json(formattedSubmissions);
  } catch (error) {
    console.error("Erro ao buscar entregas do usuário:", error);

    return res.status(500).json({
      error: "Erro interno ao buscar entregas.",
    });
  }
}
}

export default new DocumentTopicController();
