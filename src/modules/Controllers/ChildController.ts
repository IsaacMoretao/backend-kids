import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface DeleteChildrenRequest {
  ids: number[];
}

const prisma = new PrismaClient();

class ChildController {
  async index(req: Request, res: Response) {
    try {
      const children = await prisma.classes.findMany({
        include: {
          points: true,
        },
      });
      return res.status(200).json(children);
    } catch (error) {
      console.error('Erro ao listar classes e pontos:', error);
      return res.status(500).json({ error: 'Erro ao listar classes e pontos.' });
    }
  }

  async filterByAge(req: Request, res: Response) {
    try {
      const { minAge, maxAge } = req.query;
      if (!minAge || !maxAge) return res.status(400).json({ message: "Idades mínimas e máximas são necessárias." });

      const minAgeNumber = Number(minAge);
      const maxAgeNumber = Number(maxAge);
      if (isNaN(minAgeNumber) || isNaN(maxAgeNumber)) return res.status(400).json({ message: "As idades devem ser números válidos." });
      if (minAgeNumber > maxAgeNumber) return res.status(400).json({ message: "A idade mínima não pode ser maior que a idade máxima." });

      const now = new Date();
      const currentYear = now.getFullYear();
      const minDateOfBirth = new Date(currentYear - maxAgeNumber, now.getMonth(), now.getDate());
      const maxDateOfBirth = new Date(currentYear - minAgeNumber, now.getMonth(), now.getDate());

      const children = await prisma.classes.findMany({
        where: {
          dateOfBirth: {
            gte: minDateOfBirth,
            lte: maxDateOfBirth,
          },
        },
        include: {
          points: true,
        },
        orderBy: {
          nome: 'asc',
        },
      });

      const pointsAddedInTimeRange = await prisma.points.findMany({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 1 * 60 * 1000),
          },
        },
      });

      const childrenWithPoints = children.map((child) => {
        const birthDate = child.dateOfBirth;
        const age = currentYear - birthDate.getFullYear();
        const isBeforeBirthdayThisYear =
          now.getMonth() < birthDate.getMonth() ||
          (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
        const idade = isBeforeBirthdayThisYear ? age - 1 : age;

        const pointsForThisChild = pointsAddedInTimeRange.filter(
          (point) => point.classId === child.id
        );

        const day = String(birthDate.getDate()).padStart(2, '0');
        const month = String(birthDate.getMonth() + 1).padStart(2, '0');
        const year = birthDate.getFullYear();
        const birthDateFormatted = `${day}/${month}/${year}`;

        return {
          id: child.id,
          nome: child.nome,
          idade,
          dateOfBirth: birthDateFormatted,
          points: child.points,
          pointsAdded: pointsForThisChild.length,
        };
      });

      res.json(childrenWithPoints);
    } catch (error) {
      console.error("Erro ao buscar as crianças:", error);
      res.status(500).json({ message: "Erro ao buscar as crianças." });
    }
  }

  async getChildById(req: Request, res: Response) {
    const { id } = req.params;
    const now = new Date();

    const pointsAdded = await prisma.points.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 1 * 60 * 1000),
        },
      },
    });

    try {
      const child = await prisma.classes.findUnique({
        where: { id: Number.parseInt(id) },
        include: { points: true },
      });

      if (child) {
        const birthDate = child.dateOfBirth;

        const isBeforeBirthdayThisYear =
        now.getMonth() < birthDate.getMonth() ||
        (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
      
      // Calcula a idade ajustando caso o aniversário ainda não tenha ocorrido no ano atual
      const idade = now.getFullYear() - birthDate.getFullYear() - (isBeforeBirthdayThisYear ? 1 : 0);

        const day = String(birthDate.getDate()).padStart(2, '0');
        const month = String(birthDate.getMonth() + 1).padStart(2, '0');
        const year = birthDate.getFullYear();
        const birthDateFormatted = `${day}/${month}/${year}`;

        const childWithPoints = {
          id: child.id,
          nome: child.nome,
          dateOfBirth: birthDateFormatted,
          idade,
          pointsAdded: pointsAdded.length,
          points: child.points,
        };

        res.json(childWithPoints);
      } else {
        res.status(404).json({ message: "Criança não encontrada." });
      }
    } catch (error) {
      console.error("Erro ao buscar a criança:", error);
      res.status(500).json({ message: "Erro ao buscar a criança." });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const children = req.body;
      if (!Array.isArray(children)) return res.status(400).json({ error: 'O corpo da requisição deve ser um array de crianças.' });

      const createChild = async (child: any) => {
        const { nome, dateOfBirth, points } = child;
        if (!nome || dateOfBirth === undefined || !Array.isArray(points)) throw new Error('Nome, idade e pontos são obrigatórios e pontos deve ser um array.');

        const dataNascimento = new Date(dateOfBirth);
        if (Number.isNaN(dataNascimento.getTime())) throw new Error('A data de nascimento deve ser uma data válida.');

        const existingChild = await prisma.classes.findFirst({ where: { nome } });
        if (existingChild) throw new Error('Uma criança com esse nome já existe.');

        return prisma.classes.create({
          data: {
            nome,
            dateOfBirth: dataNascimento,
            points: {
              create: points.map(() => ({ createdAt: new Date() })),
            },
          },
          include: { points: true },
        });
      };

      const createdChildren = await Promise.all(children.map(createChild));
      return res.status(201).json(createdChildren);
    } catch (error) {
      console.error('Erro ao criar crianças:', error);
      return res.status(500).json({ error: 'Erro ao criar crianças.' });
    }
  }

  async createManyChildren(req: Request, res: Response) {
    try {
      const children = req.body;
      if (!Array.isArray(children) || children.length === 0) return res.status(400).json({ error: 'O array de crianças é obrigatório e não pode estar vazio.' });

      const errorMessages: string[] = [];
      const createdChildren: any[] = [];

      for (const child of children) {
        const { nome, idade, points } = child;
        if (!nome || idade === undefined) {
          errorMessages.push(`Nome e idade são obrigatórios para a criança: ${nome || 'sem nome'}.`);
          continue;
        }

        const dataNascimento = new Date(idade);
        if (Number.isNaN(dataNascimento.getTime())) throw new Error('A data de nascimento deve ser uma data válida.');

        try {
          const newChild = await prisma.classes.create({
            data: {
              nome,
              dateOfBirth: dataNascimento,
              points: {
                create: points ? points.map((point: { createdAt: string }) => ({
                  createdAt: new Date(point.createdAt),
                })) : [],
              },
            },
            include: { points: true },
          });
          createdChildren.push(newChild);
        } catch (error) {
          if (error instanceof Error) {
            errorMessages.push(`Erro ao criar a criança ${nome}: ${error.message}`);
          } else {
            errorMessages.push(`Erro desconhecido ao criar a criança ${nome}.`);
          }
        }
      }

      if (errorMessages.length > 0) return res.status(400).json({ errors: errorMessages, created: createdChildren });
      return res.status(201).json({ created: createdChildren });
    } catch (error) {
      console.error('Erro ao criar múltiplas crianças:', error);
      return res.status(500).json({ error: 'Erro ao criar múltiplas crianças.' });
    }
  }
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params; // Obtendo o ID da criança a ser atualizada
      const { dateOfBirth, nome, points } = req.body; // Pontos a serem atribuídos
  
      // Verifica se a criança existe
      const existingChild = await prisma.classes.findUnique({
        where: { id: Number(id) },
        include: { points: true }, // Inclui os pontos para verificá-los
      });
  
      // Se a criança não existe, retorna um erro 404
      if (!existingChild) {
        return res.status(404).json({ error: 'Criança não encontrada.' });
      }
  
      // Atualiza os dados da criança
      const updatedChild = await prisma.classes.update({
        where: {
          id: Number.parseInt(id), // ID da criança a ser atualizada
        },
        data: {
          nome, // Nome da criança
          dateOfBirth: new Date(dateOfBirth), // Data de nascimento da criança
          points: {
            set: points, // Atualiza os pontos (aqui você pode definir como precisa atualizar os pontos)
          },
        },
      });
  
      // Substitui os pontos existentes pelos novos pontos fornecidos
      if (points) {
        // Remove todos os pontos existentes
        await prisma.points.deleteMany({
          where: { classId: Number(id) },
        });
  
        // Cria novos pontos se houver pontos fornecidos
        if (points.length > 0) {
          await prisma.points.createMany({
            data: points.map(() => ({
              createdAt: new Date(), // Define a data de criação como o dia atual
              classId: Number(id), // Associa o ponto à criança
            })),
          });
        }
      }
  
      return res.status(200).json(updatedChild);
    } catch (error) {
      console.error('Erro ao atualizar criança:', error);
      return res.status(500).json({ error: 'Erro ao atualizar criança.' });
    }
  }  

  async addPoint(req: Request, res: Response) {
    try {
      const { idChild, idUser } = req.params;

      // Verifica se a criança existe
      const existingChild = await prisma.classes.findUnique({
        where: { id: Number(idChild) },
      });

      if (!existingChild) {
        return res.status(404).json({ error: 'Criança não encontrada.' });
      }

      // Verifica se o usuário existe
      const existingUser = await prisma.user.findFirst({
        where: { id: Number(idUser) },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const now = new Date();

      // Busca pontos adicionados pelo usuário nas últimas 4 horas
      const pointsAdded = await prisma.points.findMany({
        where: {
          userId: Number(idChild),
          createdAt: {
            gte: new Date(now.getTime() - 1 * 60 * 1000), // Últimas 4 horas
          },
        },
      });

      // Limita a adição de pontos a no máximo 4 nas últimas 4 horas
      if (pointsAdded.length >= 4) {
        return res.status(400).json({ error: 'Limite de 4 pontos em 4 horas atingido.' });
      }

      // Adiciona um novo ponto
      const newPoint = await prisma.points.create({
        data: {
          classId: existingChild.id,
          createdAt: now,
          userId: Number(idUser),
        },
      });

      // Retorna o ponto adicionado com validade de 4 horas
      return res.status(201).json({
        point: newPoint,
        validity: new Date(now.getTime() - 1 * 60 * 1000), // Validade do ponto: 4 horas
      });
    } catch (error) {
      console.error('Erro ao adicionar ponto:', error);
      return res.status(500).json({ error: 'Erro ao adicionar ponto.' });
    }
  }


  async deletePoint(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingChild = await prisma.classes.findUnique({
        where: { id: Number(id) },
      });

      if (!existingChild) {
        return res.status(404).json({ error: 'Criança não encontrada.' });
      }

      const lastPoint = await prisma.points.findFirst({
        where: { classId: Number(id) },
        orderBy: { createdAt: 'desc' },
      });

      // Se não houver pontos, retorna um erro 404
      if (!lastPoint) {
        return res.status(404).json({ error: 'Nenhum ponto encontrado para essa criança.' });
      }

      // Verifica se o ponto foi adicionado há menos de um minuto
      if (Date.now() - new Date(lastPoint.createdAt).getTime() > 18000000) {
        return res.status(403).json({ error: 'O ponto não pode ser excluído após 1 minuto.' });
      }

      // Exclui o último ponto encontrado
      await prisma.points.delete({
        where: { id: lastPoint.id },
      });

      return res.status(200).json({ message: 'Último ponto excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir ponto:', error);
      return res.status(500).json({ error: 'Erro ao excluir ponto.' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { ids } = req.body as DeleteChildrenRequest;

      if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'number')) {
        return res.status(400).json({ error: 'O array de IDs está vazio ou contém valores inválidos.' });
      }

      // Deleta os pontos associados às crianças
      await prisma.points.deleteMany({
        where: { classId: { in: ids } },
      });

      // Deleta as crianças do banco de dados
      const deletedChildren = await prisma.classes.deleteMany({
        where: { id: { in: ids } },
      });

      if (deletedChildren.count === 0) {
        return res.status(404).json({ error: 'Nenhuma criança encontrada para os IDs fornecidos.' });
      }

      return res.status(200).json({ message: 'Crianças deletadas com sucesso.', deletedChildren });
    } catch (error) {
      console.error('Erro ao deletar crianças:', error);
      return res.status(500).json({ error: 'Erro ao deletar crianças.' });
    }
  }

  async resetAllPoints(req: Request, res: Response) {
    try {
      // Atualiza todos os registros na tabela classes para zerar os pontos
      const updatedChildren = await prisma.points.deleteMany();

      return res.status(200).json({ message: 'Todos os pontos foram zerados.', count: updatedChildren.count });
    } catch (error) {
      console.error('Erro ao zerar os pontos:', error);
      return res.status(500).json({ error: 'Erro ao zerar os pontos.' });
    }
  }

  async resetAllChild(req: Request, res: Response) {
    try {
      const updatedChildren = await prisma.classes.deleteMany();
      return res.status(200).json({ message: 'Todos as crianças foram deletadas', count: updatedChildren.count });
    } catch (error) {
      console.error('Erro ao deletar as crianças:', error);
      return res.status(500).json({ error: 'Erro ao deletar as crianças' });
    }
  }
}

export default new ChildController();