import 'dotenv/config';
import type { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const secretKey = 'your_secret_key';
const normalizeString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

class UserController {
  async register(req: Request, res: Response) {
    try {
      let { username, password, level } = req.body;

      username = username.trim();
      password = password.trim();

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
          avatarURL: `https://api.multiavatar.com/${username}.svg`,
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
      let { username, password, level } = req.body;

      username = username.trim();
      password = password.trim();

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

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verifica se o usuário existe
      const existingUser = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Exclui o usuário
      await prisma.user.delete({ where: { id: Number(id) } });

      return res.status(200).json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      return res.status(500).json({ error: 'Erro ao excluir usuário.' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      let { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Preencha todos os campos." });
      }

      username = username
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()
        .toLowerCase();

      password = password
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()
        .toLowerCase();


      const user = await prisma.user.findFirst({
        where: {
          username: { equals: username, mode: "insensitive" },
        },
      });

      if (!user) {
        console.log("❌ Usuário não encontrado.");
        return res.status(401).json({ error: "Usuário ou senha incorretos." });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.log("❌ Senha incorreta.");
        return res.status(401).json({ error: "Usuário ou senha incorretos." });
      }

      const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: "12h" });

      console.log("✅ Login bem-sucedido!");

      return res.status(200).json({
        token
        // level: user.level,
        // userId: user.id,
        // AceesAdmin: `https://admin-ministerio-infantil.vercel.app/Validation/${username}/${password}`,
      });

    } catch (error) {
      console.error("🚨 Erro no login:", error);
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  }

  async listUsers(req: Request, res: Response) {
    const { userId, searchName, searchPosition } = req.query;

    const page = searchName || searchPosition ? 1 : Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    try {
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: Number(userId) },
          include: { presence: true },
        });

        return res.status(200).json(user);
      }

      const whereCondition: Prisma.UserWhereInput = {
        ...(searchName && {
          username: {
            startsWith: String(searchName),
            mode: Prisma.QueryMode.insensitive,
          },
        }),
        ...(searchPosition && {
          position: {
            startsWith: String(searchPosition).toUpperCase(),
            mode: Prisma.QueryMode.insensitive,
          },
        }),
      };

      const users = await prisma.user.findMany({
        where: whereCondition,
        include: { presence: true },
        orderBy: { username: 'asc' },
        skip,
        take: limit,
      });

      const totalUsers = await prisma.user.count({
        where: whereCondition,
      });

      return res.status(200).json({
        data: users,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
      });
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      return res.status(500).json({ error: "Não foi possível listar os usuários." });
    }
  }


  async addPresence(req: Request, res: Response) {
    let { createdAt, period } = req.body;
    const userId = Number(req.params.userId);


    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    if (period != "MORNING" && period != "NIGHT") {
      return res.status(400).json({ error: '[[ERRO]] O período deve ser manhã, tarde ou noite. [[ERRO]]' });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Erro ao adicionar presença. (Usuário não encontrado)' });
      }

      const createdAtDate = createdAt ? new Date(createdAt) : new Date();
      createdAtDate.setHours(12, 0, 0, 0);
      const createdAtUTC = new Date(createdAtDate.getTime() - createdAtDate.getTimezoneOffset() * 60000);

      const startOfDay = new Date(createdAtUTC);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(createdAtUTC);
      endOfDay.setHours(23, 59, 59, 999);

      const existingPresence = await prisma.presence.findFirst({
        where: {
          userId,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
          period,
        },
      });

      if (existingPresence) {
        return res.status(400).json({ error: 'Usuário já possui presença registrada neste período.' });
      }

      const created = await prisma.presence.create({
        data: {
          userId,
          createdAt: createdAtUTC,
          period,
        },
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error('Erro ao adicionar presença:', error);
      return res.status(500).json({ error: 'Erro interno ao adicionar presença.' });
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

  async fixUsers(req: Request, res: Response) {

    try {
      await prisma.$executeRaw`
        UPDATE "User" 
        SET username = LOWER(TRIM(REPLACE(REPLACE(username, ' ', ' '), '⁠', ''))) 
        WHERE username IS NOT NULL;
      `;
      res.json({ message: "Usernames corrigidos!" });
    } catch (error) {
      console.error("Erro ao corrigir usernames:", error);
      res.status(500).json({ error: "Erro ao atualizar usernames." });
    }
  }


}

export default new UserController();
