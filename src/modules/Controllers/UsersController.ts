import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const secretKey = 'your_secret_key';
const normalizeString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

class UserController {
  async register(req: Request, res: Response) {
    try {
      const { username, password, level } = req.body;

      // Verifica se o usuário já existe
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'Usuário já existe.' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Cria o usuário
      const newUser = await prisma.user.create({
        data: {
          username,
          level,
          password: hashedPassword,
        },
      });

      return res.status(201).json(newUser);
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { username, password, level } = req.body;
  
      // Verifica se o usuário existe
      const existingUser = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
  
      // Verifica se deseja alterar a senha e faz o hash
      let hashedPassword = existingUser.password;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
  
      // Atualiza o usuário
      const updatedUser = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          username,
          level,
          password: hashedPassword,
        },
      });
  
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Erro ao editar usuário:', error);
      return res.status(500).json({ error: 'Erro ao editar usuário.' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      // Verifica se o usuário existe
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
      }

      // Verifica a senha
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const AceesAdmin = `https://admin-ministerio-infantil.vercel.app/Validation/${username}/${password}`;
      // const hashedAceesAdmin = await bcrypt.hash(AceesAdmin, 10);
      const level = user.level;
      const userId = user.id

      // Gera o token de autenticação
      const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '12h' });

      console.log("AceesAdmin" + AceesAdmin)

      return res.status(200).json({ token, level, userId, AceesAdmin });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  }



  async listUsers(req: Request, res: Response) {
    const { userId, searchTerm } = req.headers; // Pegamos o searchTerm do header (ou pode ser query param)
  
    try {
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: Number(userId) },
          include: { presence: true },
        });
  
        return res.status(200).json(user);
      }
  
      let users = await prisma.user.findMany({
        include: { presence: true },
      });
  
      // Se houver um termo de pesquisa, filtramos os usuários no backend
      if (searchTerm) {
        const normalizedSearch = normalizeString(String(searchTerm));
  
        users = users.filter((user) =>
          normalizeString(user.username).startsWith(normalizedSearch)
        );
      }
  
      return res.status(200).json(users);
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      return res.status(500).json({ error: "Não foi possível listar os usuários." });
    }
  }

  async addPresence(req: Request, res: Response) {
    const { userId } = req.params;
    const { createdAt, period } = req.body;
  
    if (!userId) {
      console.error('É necessário adicionar o id do usuário presente. Por favor, adicione um ID.');
      return res.status(400).json({ error: 'O ID do usuário é necessário para adicionar a presença.' });
    }
  
    if (period !== "MORNING" && period !== "AFTERNOON" && period !== "NIGHT") {
      return res.status(400).json({ error: '[[ERRO]] O período deve ser manhã, tarde ou noite. [[ERRO]]' });
    }
  
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: Number(userId),
        },
      });
  
      if (!user) {
        console.error('Usuário não encontrado, Atualize a página e tente novamente');
        return res.status(404).json({ error: 'Erro ao adicionar presença. (Usuário não encontrado)' });
      }
  
      // Verificar se já existe presença no mesmo período no mesmo dia
      const existingPresence = await prisma.presence.findFirst({
        where: {
          userId: Number(userId),
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Início do dia
            lt: new Date(new Date().setHours(23, 59, 59, 999)), // Fim do dia
          },
          period: period, // Verifica se já existe presença no mesmo período
        },
      });
  
      if (existingPresence) {
        console.log('O usuário já tem presença registrada neste período.');
        return res.status(400).json({ error: 'Usuário já possui presença registrada neste período.' });
      }
  
      // Criar a nova presença
      const created = await prisma.presence.create({
        data: {
          userId: Number(userId),
          createdAt: createdAt ? new Date(createdAt) : new Date(),
          period: period, // Salvar o período
        },
      });
  
      return res.status(201).json(created);
    } catch (error) {
      console.error('Não foi possível adicionar a presença:', error);
      return res.status(500).json({ error: 'Erro ao adicionar presença.' });
    }
  }
  

  async removePresence(req: Request, res: Response) {
    const { presenceId } = req.params; 
  
    if (!presenceId) {
      console.error('É necessário adicionar o id do usuário presente. Por favor, adicione um ID.');
      return res.status(400).json({ error: 'O ID do usuário é necessário para adicionar a presença.' });
    }
  
    try {
      // const user = await prisma.user.findFirst({
      //   where: {
      //     id: Number(presenceId),
      //   },
      // });
  
      // if (!user) {
      //   console.error('Presença não encontrada, Atualize a página e tente novamente');
      //   return res.status(404).json({ error: 'Erro ao adicionar presença. (Usuário não encontrado)' });
      // }
  
      const del = await prisma.presence.delete({
        where: {
          id: Number(presenceId)
        }
      });
  
      return res.status(201).json({ message: 'Presença removida com sucesso!' });
    } catch (error) {
      console.error('Não foi possível remover a presença:', error);
      return res.status(500).json({ error: 'Erro ao remover presença.' });
    }
  }
  
}

export default new UserController();
