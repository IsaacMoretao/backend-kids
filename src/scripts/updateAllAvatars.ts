import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";

const prisma = new PrismaClient();

async function deleteOldPresences() {
  try {
    const threeMonthsAgo = dayjs().subtract(3, "month").toDate();

    const deleted = await prisma.presence.deleteMany({
      where: {
        createdAt: { lt: threeMonthsAgo },
      },
    });

    console.log(`Presenças deletadas: ${deleted.count}`);
  } catch (error) {
    console.error("Erro ao deletar presenças antigas:", error);
  }
}

// Agenda para rodar todo dia às 3h da manhã
cron.schedule("0 3 * * *", async () => {
  console.log("Iniciando exclusão de presenças antigas...");
  await deleteOldPresences();
});
