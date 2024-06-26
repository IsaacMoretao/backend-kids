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
      const { id } = req.params; // Obtendo o ID da criança a ser deletada

      // Deleta a criança do banco de dados
      const deletedChild = await prisma.classes.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json(deletedChild);
    } catch (error) {
      console.error('Erro ao deletar criança:', error);
      return res.status(500).json({ error: 'Erro ao deletar criança.' });
    }
  }
}

export default new ChildController();