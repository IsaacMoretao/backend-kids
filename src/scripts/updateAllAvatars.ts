import { Request, Response } from 'express'
import { prisma } from '../database/prismaClient'

export async function updateAllAvatars(req: Request, res: Response) {
  try {
    // Busca todos os usuários
    const users = await prisma.user.findMany()

    const updatePromises = users.map((user) => {
      const normalizedUsername = user.username
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()

      const newAvatar = `https://robohash.org/${normalizedUsername}.png`

      return prisma.user.update({
        where: { id: user.id },
        data: { avatarURL: newAvatar }
      })
    })

    // Aguarda todas as atualizações
    const updatedUsers = await Promise.all(updatePromises)

    return res.json({
      message: `Avatares atualizados com sucesso para ${updatedUsers.length} usuários.`,
      users: updatedUsers.map(u => ({
        id: u.id,
        username: u.username,
        avatarURL: u.avatarURL
      }))
    })
  } catch (error) {
    console.error('Erro ao atualizar avatares:', error)
    return res.status(500).json({ error: 'Erro ao atualizar os avatares dos usuários.' })
  }
}
