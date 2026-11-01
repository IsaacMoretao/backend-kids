import { PrismaClient, Level } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ==========================================
  // LIMPEZA DO BANCO
  // ==========================================

  await prisma.documentSubmission.deleteMany();
  await prisma.documentTopic.deleteMany();

  await prisma.points.deleteMany();
  await prisma.presence.deleteMany();
  await prisma.canceledDays.deleteMany();
  await prisma.classes.deleteMany();

  console.log("🧹 Dados antigos removidos");

  // ==========================================
  // USUÁRIOS
  // ==========================================

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      level: Level.ADMIN,
      avatarURL: "https://robohash.org/admin.png",
      particularities: "Administrador do sistema",
      position: "LÍDER",
    },
  });

  const joao = await prisma.user.upsert({
    where: { username: "joao" },
    update: {},
    create: {
      username: "joao",
      password: userPassword,
      level: Level.USER,
      avatarURL: "https://robohash.org/joao.png",
      particularities: "Usuário de teste",
      position: "AUXILIAR",
    },
  });

  console.log("✅ Usuários criados");

  // ==========================================
  // CLASSES
  // ==========================================

  const classes = await Promise.all([
    prisma.classes.create({
      data: {
        nome: "Maria Silva",
        dateOfBirth: new Date("2015-04-10"),
      },
    }),

    prisma.classes.create({
      data: {
        nome: "João Pereira",
        dateOfBirth: new Date("2013-09-25"),
      },
    }),

    prisma.classes.create({
      data: {
        nome: "Ana Souza",
        dateOfBirth: new Date("2014-12-05"),
      },
    }),

    prisma.classes.create({
      data: {
        nome: "Pedro Lima",
        dateOfBirth: new Date("2016-06-18"),
      },
    }),

    prisma.classes.create({
      data: {
        nome: "Beatriz Rocha",
        dateOfBirth: new Date("2012-02-22"),
      },
    }),
  ]);

  console.log(`✅ ${classes.length} classes criadas`);

  // ==========================================
  // PONTOS
  // ==========================================

  const now = new Date();

  await prisma.points.createMany({
    data: [
      {
        classId: classes[0].id,
        userId: admin.id,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        classId: classes[0].id,
        userId: admin.id,
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
      {
        classId: classes[1].id,
        userId: joao.id,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        classId: classes[2].id,
        userId: joao.id,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ Pontos criados");

  // ==========================================
  // PRESENÇAS
  // ==========================================

  await prisma.presence.createMany({
    data: [
      {
        userId: admin.id,
        period: "MORNING",
      },
      {
        userId: admin.id,
        period: "AFTERNOON",
      },
      {
        userId: joao.id,
        period: "NIGHT",
      },
    ],
  });

  console.log("✅ Presenças criadas");

  // ==========================================
  // TÓPICOS DE DOCUMENTOS
  // ==========================================

  const topic1 = await prisma.documentTopic.create({
    data: {
      title: "Resumo do livro",
      description:
        "Realizar a leitura do livro e entregar um resumo em PDF.",
      endDate: new Date("2026-11-10T23:59:59"),
    },
  });

  const topic2 = await prisma.documentTopic.create({
    data: {
      title: "Pesquisa bíblica",
      description:
        "Realizar uma pesquisa sobre as alianças bíblicas e enviar o documento.",
      endDate: new Date("2026-11-20T23:59:59"),
    },
  });

  console.log("✅ Tópicos de documentos criados");

  // ==========================================
  // ENTREGAS DE DOCUMENTOS
  // ==========================================

  await prisma.documentSubmission.create({
    data: {
      userId: joao.id,
      topicId: topic1.id,
      fileName: "resumo.pdf",
      fileUrl: "https://example.com/resumo.pdf",
      mimeType: "application/pdf",
      submittedAt: new Date(),
    },
  });

  console.log("✅ Entrega de documento criada");

  // ==========================================
  // FINALIZAÇÃO
  // ==========================================

  console.log("🎉 Seed concluído com sucesso!");

  console.log(`
  📊 RESUMO:

  Usuários:
  - Admin: admin
  - Usuário: joao

  Classes: ${classes.length}

  Tópicos:
  - ${topic1.title}
  - ${topic2.title}

  Entregas:
  - João entregou: ${topic1.title}
  - João pendente: ${topic2.title}
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("💾 Banco de dados populado.");
  })
  .catch(async (e) => {
    console.error("❌ Erro ao executar seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });