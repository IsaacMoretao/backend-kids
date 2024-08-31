import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateClasses() {
  // Obtenha todas as classes
  const classes = await prisma.classes.findMany();

  for (const classe of classes) {
    const pointsArray = [];

    // Crie objetos no array 'points' com base no número de 'pontos'
    for (let i = 0; i < classe.pontos; i++) {
      pointsArray.push({
        classId: classe.id,
      });
    }

    // Crie registros em 'Points' associados à classe
    await prisma.points.createMany({
      data: pointsArray,
    });
  }

  console.log('Todos os pontos foram atualizados para as classes.');
}

updateClasses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
