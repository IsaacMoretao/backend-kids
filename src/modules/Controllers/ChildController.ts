import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const redis = new Redis();

const prisma = new PrismaClient();

class ChildController {

  async index(req: Request, res: Response) {
    try {
      // Lista todas as classes com seus pontos associados
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
  
      if (!minAge || !maxAge) {
        return res.status(400).json({ message: "Idades mínimas e máximas são necessárias." });
      }
  
      const children = await prisma.classes.findMany({
        where: {
          idade: {
            gte: Number(minAge), // Maior ou igual a minAge
            lte: Number(maxAge), // Menor ou igual a maxAge
          },
        },
        include: {
          points: true,
        },
        orderBy: {
          nome: 'asc', // Ordena por nome em ordem alfabética ascendente
        },
      });
  
      const childrenWithPoints = children.map((classes) => ({
        id: classes.id,
        nome: classes.nome,
        idade: classes.idade,
        pontos: classes.points.length,
      }));
  
      res.json(childrenWithPoints);
    } catch (error) {
      console.error("Erro ao buscar as crianças:", error);
      res.status(500).json({ message: "Erro ao buscar as crianças." });
    }
  }
  

  async getChildById(req: Request, res: Response) {
    const { id } = req.params;
  
    try {
      const child = await prisma.classes.findUnique({
        where: {
          id: parseInt(id),
        },
        include: {
          points: true,
        },
      });
  
      if (child) {
        const childWithPoints = {
          id: child.id,
          nome: child.nome,
          idade: child.idade,
          pontos: child.points.length,
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
  
      // Verifique se o corpo da requisição é um array
      if (!Array.isArray(children)) {
        return res.status(400).json({ error: 'O corpo da requisição deve ser um array de crianças.' });
      }
  
      // Função para validar e criar uma criança
      const createChild = async (child: any) => {
        const { nome, idade, pontos, points } = child;
  
        // Validação dos campos
        if (!nome || idade === undefined || pontos === undefined || !Array.isArray(points)) {
          throw new Error('Nome, idade, pontos e pontos iniciais são obrigatórios e pontos deve ser um array.');
        }
  
        // Convertendo idade e pontos para números
        const idadeNumber = parseInt(idade);
        const pontosNumber = parseInt(pontos);
  
        // Verifique se a conversão foi bem-sucedida
        if (isNaN(idadeNumber) || isNaN(pontosNumber)) {
          throw new Error('Idade e pontos devem ser números válidos.');
        }
  
        // Verifique se já existe uma criança com o mesmo nome
        const existingChild = await prisma.classes.findFirst({ where: { nome } });
        if (existingChild) {
          throw new Error('Uma criança com esse nome já existe.');
        }
  
        // Criar a criança e os pontos associados
        return prisma.classes.create({
          data: {
            nome,
            idade: idadeNumber,
            pontos: pontosNumber,
            points: {
              create: points.map(() => ({ createdAt: new Date() })) // Adiciona pontos com data atual
            }
          },
          include: { points: true }
        });
      };
  
      // Usar Promise.all para executar todas as criações simultaneamente
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
  
      // Validação do array de crianças
      if (!Array.isArray(children) || children.length === 0) {
        return res.status(400).json({ error: 'O array de crianças é obrigatório e não pode estar vazio.' });
      }
  
      const errorMessages: string[] = [];
      const createdChildren: any[] = [];
  
      for (const child of children) {
        const { nome, idade, pontos, points } = child;
  
        if (!nome || idade === undefined || pontos === undefined) {
          errorMessages.push(`Nome, idade e pontos são obrigatórios para a criança: ${nome || 'sem nome'}.`);
          continue;
        }
  
        const idadeNumber = parseInt(idade);
        const pontosNumber = parseInt(pontos);
  
        if (isNaN(idadeNumber) || isNaN(pontosNumber)) {
          errorMessages.push(`Idade e pontos devem ser números válidos para a criança: ${nome}.`);
          continue;
        }
  
        try {
          const newChild = await prisma.classes.create({
            data: {
              nome,
              idade: idadeNumber,
              pontos: pontosNumber,
              points: {
                create: points ? points.map((point: { createdAt: string }) => ({
                  createdAt: new Date(point.createdAt),
                  // Não precisa especificar classId aqui
                })) : [],
              },
            },
            include: {
              points: true, // Inclui os pontos na resposta
            },
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
  
      if (errorMessages.length > 0) {
        return res.status(400).json({ errors: errorMessages, created: createdChildren });
      }
  
      return res.status(201).json({ created: createdChildren });
    } catch (error) {
      console.error('Erro ao criar múltiplas crianças:', error);
      return res.status(500).json({ error: 'Erro ao criar múltiplas crianças.' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params; // Obtendo o ID da criança a ser atualizada
      const { pontos, idade, nome, points } = req.body; // Pontos a serem atribuídos
  
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
        where: { id: Number(id) },
        data: {
          pontos, // Atribui diretamente os pontos recebidos
          idade,
          nome,
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
      const { id } = req.params; // Obtendo o ID da criança a ser atualizada

      // Verifica se a criança existe
      const existingChild = await prisma.classes.findUnique({
        where: { id: Number(id) },
      });

      // Se a criança não existe, retorna um erro 404
      if (!existingChild) {
        return res.status(404).json({ error: 'Criança não encontrada.' });
      }

      // Adiciona um novo registro na tabela points
      const newPoint = await prisma.points.create({
        data: {
          classId: existingChild.id,
          createdAt: new Date(), // Data de criação atual
        },
      });

      return res.status(201).json(newPoint);
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
      if (Date.now() - new Date(lastPoint.createdAt).getTime() > 60 * 1000) {
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
      const { ids } = req.body; // Obtendo os IDs das crianças a serem deletadas

      // Verifica se ids é um array e contém pelo menos um elemento
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID fornecido.' });
      }

      // Deleta as crianças do banco de dados
      const deletedChildren = await prisma.classes.deleteMany({
        where: { id: { in: ids } },
      });

      return res.status(200).json(deletedChildren);
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