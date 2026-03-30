import cron from "node-cron"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export function startMonthlyRoutine() {

  cron.schedule("0 0 1 * *", async () => {
    console.log("Iniciando limpeza de presenças antigas...")

    try {

      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const deletedPresences = await prisma.presence.deleteMany({
        where: {
          createdAt: {
            lt: threeMonthsAgo
          }
        }
      })

      console.log(
        `Presenças deletadas com sucesso: ${deletedPresences.count}`
      )

    } catch (error) {
      console.error("Erro ao limpar presenças:", error)
    }
  })
}