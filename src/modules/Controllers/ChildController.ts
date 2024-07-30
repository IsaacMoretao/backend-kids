import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ChildController {

  async index(req: Request, res: Response) {
    try {
      // Lista todas as crianças
      const children = await prisma.classes.findMany();
      return res.status(200).json(children);
    } catch (error) {
      console.error('Erro ao listar crianças:', error);
      return res.status(500).json({ error: 'Erro ao listar crianças.' });
    }
  }

  async filterByAge(req: Request, res: Response) {
    const { minAge, maxAge } = req.query;
    try {
      const children = await prisma.classes.findMany({
        where: {
          idade: {
            gte: Number(minAge),
            lte: Number(maxAge),
          },
        },
      });
      return res.status(200).json(children);
    } catch (error) {
      console.error('Erro ao filtrar crianças por idade:', error);
      return res.status(500).json({ error: 'Erro ao filtrar crianças por idade.' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { nome, idade, pontos } = req.body;
  
      // Validação dos campos
      if (!nome || !idade || !pontos) {
        return res.status(400).json({ error: 'Nome, idade e pontos são obrigatórios.' });
      }
  
      // Convertendo idade e pontos para números
      const idadeNumber = parseInt(idade);
      const pontosNumber = parseInt(pontos);
  
      // Verifique se a conversão foi bem-sucedida
      if (isNaN(idadeNumber) || isNaN(pontosNumber)) {
        return res.status(400).json({ error: 'Idade e pontos devem ser números válidos.' });
      }
  
      // Verifique se já existe uma criança com o mesmo nome
      const existingChild = await prisma.classes.findFirst({
        where: {
          nome: nome,
        },
      });
  
      if (existingChild) {
        return res.status(400).json({ error: 'Uma criança com esse nome já existe.' });
      }
  
      // Cria uma nova criança no banco de dados
      const child = await prisma.classes.create({
        data: {
          nome,
          idade: idadeNumber,
          pontos: pontosNumber,
        },
      });
  
      return res.status(201).json(child);
    } catch (error) {
      console.error('Erro ao criar criança:', error);
      return res.status(500).json({ error: 'Erro ao criar criança.' });
    }
  }

  async createManyChildren(req: Request, res: Response) {
    try {
      const children = req.body.children;
  
      // Validação do array de crianças
      if (!Array.isArray(children) || children.length === 0) {
        return res.status(400).json({ error: 'O array de crianças é obrigatório e não pode estar vazio.' });
      }
  
      const errorMessages: string[] = [];
      const createdChildren: any[] = [];
  
      for (const child of children) {
        const { nome, idade, pontos } = child;
  
        if (!nome || !idade || !pontos) {
          errorMessages.push(`Nome, idade e pontos são obrigatórios para a criança: ${nome || 'sem nome'}.`);
          continue;
        }
  
        const idadeNumber = parseInt(idade);
        const pontosNumber = parseInt(pontos);
  
        if (isNaN(idadeNumber) || isNaN(pontosNumber)) {
          errorMessages.push(`Idade e pontos devem ser números válidos para a criança: ${nome}.`);
          continue;
        }
  
        const existingChild = await prisma.classes.findFirst({
          where: { nome },
        });
  
        if (existingChild) {
          errorMessages.push(`Uma criança com o nome ${nome} já existe.`);
          continue;
        }
  
        try {
          const newChild = await prisma.classes.create({
            data: { nome, idade: idadeNumber, pontos: pontosNumber },
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
  
      return res.status(201).json({
        createdChildren,
        errors: errorMessages.length > 0 ? errorMessages : null,
      });
  
    } catch (error) {
      console.error('Erro ao criar crianças:', error);
      return res.status(500).json({ error: 'Erro ao criar crianças.' });
    }
  }
  

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params; // Obtendo o ID da criança a ser atualizada
      const { pontos, idade, nome } = req.body; // Pontos a serem atribuídos
    
      // Verifica se a criança existe
      const existingChild = await prisma.classes.findUnique({
        where: { id: Number(id) },
      });
    
      // Se a criança não existe, retorna um erro 404
      if (!existingChild) {
        return res.status(404).json({ error: 'Criança não encontrada.' });
      }
    
      // Atualiza os pontos da criança
      const updatedChild = await prisma.classes.update({
        where: { id: Number(id) },
        data: {
          pontos: pontos, // Atribui diretamente os pontos recebidos
          idade: idade,
          nome: nome
        },
      });
    
      return res.status(200).json(updatedChild);
    } catch (error) {
      console.error('Erro ao atualizar criança:', error);
      return res.status(500).json({ error: 'Erro ao atualizar criança.' });
    }
  }

  async addPoint(req: Request, res: Response) {
    try {
      const { id } = req.params; // Obtendo o ID da criança a ser atualizada
      const { pontos } = req.body; // Pontos a serem adicionados
  
      // Verifica se a criança existe
      const existingChild = await prisma.classes.findUnique({
        where: { id: Number(id) },
      });
  
      // Se a criança não existe, retorna um erro 404
      if (!existingChild) {
        return res.status(404).json({ error: 'Criança não encontrada.' });
      }
  
      // Atualiza os pontos da criança
      const updatedChild = await prisma.classes.update({
        where: { id: Number(id) },
        data: {
          pontos: existingChild.pontos + pontos, // Adiciona os pontos existentes aos pontos recebidos
        },
      });
  
      return res.status(200).json(updatedChild);
    } catch (error) {
      console.error('Erro ao atualizar criança:', error);
      return res.status(500).json({ error: 'Erro ao atualizar criança.' });
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
      const updatedChildren = await prisma.classes.updateMany({
        data: {
          pontos: 0,
        },
      });
  
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