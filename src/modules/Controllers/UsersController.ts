import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const secretKey = 'your_secret_key';

class UserController {
  async register(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

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

      // Gera o token de autenticação
      const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1h' });

      return res.status(200).json({ token });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return res.status(500).json({ error: 'Erro ao fazer login.' });
    }
  }
}

export default new UserController();
