import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const secretKey = 'your_secret_key';

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

      const level = user.level;
      const userId = user.id

      // Gera o token de autenticação
      const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '12h' });

      return res.status(200).json({ token, level, userId });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  }

  async listUsers(req: Request, res: Response) {
    const { userId } = req.headers;

    try{
      if (!userId) {
        const users = await prisma.user.findMany({
          include: {
            presence: true,
          },
        })

        return res.status(200).json(users);
      }

      const user = await prisma.user.findUnique({
        where: {
          id: Number(userId) 
        },
        include: {
          presence: true,
        },
      })

      return res.status(200).json(user);

    }catch{
      console.error('Não foi possível Listar o(s) usuário(s):', Error, 'Por favor tente mais tarde');
      return res.status(500).json({ error: 'Não foi possível Listar o(s) usuário(s).' });
    }

  }

  async addPresence(req: Request, res: Response) {
    const { userId } = req.params; 
    const { createdAt } = req.body;

  
    if (!userId) {
      console.error('É necessário adicionar o id do usuário presente. Por favor, adicione um ID.');
      return res.status(400).json({ error: 'O ID do usuário é necessário para adicionar a presença.' });
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
  
      const created = await prisma.presence.create({
        data: {
          userId: Number(userId),
          createdAt: createdAt ? new Date(createdAt) : new Date(),
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
