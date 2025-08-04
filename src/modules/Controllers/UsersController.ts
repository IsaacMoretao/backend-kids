import 'dotenv/config';
import type { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs'

// function isValidBase64Image(base64: string): boolean {
//   return /^data:image\/(png|jpeg|webp);base64,/.test(base64);
// }

// async function validateImageWidth(base64: string): Promise<boolean> {
//   const buffer = Buffer.from(base64.split(',')[1], 'base64');
//   const metadata = await sharp(buffer).metadata();
//   return metadata.width !== undefined && metadata.width <= 500;
// }

const prisma = new PrismaClient();
const secretKey = process.env.JWT_SECRET || "12345";
// const normalizeString = (str: string) =>
//   str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

class UserController {
  async register(req: Request, res: Response) {
    try {
      let { username, password, level } = req.body;

      username = username
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()

      password = password
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()

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
          avatarURL: `https://robohash.org/${username}.png`,
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
      const { id } = req.params
      const { username, password, level, position } = req.body
      const file = req.file

      const user = await prisma.user.findUnique({ where: { id: Number(id) } })
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

      let finalPassword = user.password
      if (password && password.trim().length >= 6) {
        finalPassword = await bcrypt.hash(password.trim(), 10)
      }

      let avatarPath = user.avatarURL

      if (file) {
        const imagePath = path.join(file.destination, file.filename)
        const sharpPath = path.join(file.destination, `resized-${file.filename}`)

        const image = sharp(file.path)
        const metadata = await image.metadata()

        if (metadata.width && metadata.width > 500) {
          await image.resize(500).toFile(sharpPath)
          fs.unlinkSync(imagePath) // remove original
          avatarPath = `uploads/avatars/resized-${file.filename}`
        } else {
          avatarPath = `uploads/avatars/${file.filename}`
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          username,
          password: finalPassword,
          avatarURL: avatarPath,
          level,
          position
        },
      })

      return res.json(updatedUser)
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Erro ao atualizar usuário.' })
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

      password = password
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()


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

      const token = jwt.sign(
        {
          userId: user.id,
          level: user.level,
        },
        secretKey,
        { expiresIn: "12h" }
      );

      console.log("✅ Login bem-sucedido!");

      return res.status(200).json({
        token
      });

    } catch (error) {
      console.error("🚨 Erro no login:", error);
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  }

  async listUsers(req: Request, res: Response) {
    const { token, userId, searchName, searchPosition } = req.query;

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

      if (token) {
        try {
          const decoded: any = jwt.verify(String(token), secretKey);

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId  },
            include: { presence: true },
          });

          if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
          }

          return res.status(200).json(user);
        } catch (err) {
          return res.status(401).json({ error: "Token inválido ou expirado." });
        }
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
      startOfDay.setHours(12, 0, 0, 0);
      const endOfDay = new Date(createdAtUTC);
      endOfDay.setHours(12, 0, 0, 0);

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

  async stopedUser(req: Request, res: Response) {
    const { userId } = req.params;

    try {
      if (!userId) {
        console.error('É necessário adicionar o id do usuário presente. Por favor, adicione um ID.');
        return res.status(400).json({ error: 'O ID do usuário é necessário.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          isActive: !user.isActive, // alterna true/false
        },
      });

      if (!updatedUser.id) {
        return res.status(500).json({ error: 'Erro ao editar, tente mais tarde' });
      }

      return res.status(200).json({ message: 'Usuário alterado com sucesso!' });

    } catch (error) {
      console.error('Não foi possível remover a presença:', error);
      return res.status(500).json({ error: 'Erro ao remover presença.' });
    }

  }

}

export default new UserController();
