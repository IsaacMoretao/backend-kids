import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // --- USUÁRIOS ---
  console.log("👤 Criando usuários...");

  const passwordAdmin = await bcrypt.hash("admin123", 10);
  const passwordUser = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: passwordAdmin,
      level: "ADMIN",
      avatarURL: `https://robohash.org/admin.png`,
    },
  });

  const teste = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: "admin123",
      level: "ADMIN",
      avatarURL: `https://robohash.org/admin.png`,
    },
  });

  const user = await prisma.user.upsert({
    where: { username: "joao" },
    update: {},
    create: {
      username: "joao",
      password: passwordUser,
      level: "USER",
      avatarURL: `https://robohash.org/joao.png`,
    },
  });

  console.log("✅ Usuários criados:", [admin.username, user.username, teste.username]);

  // --- CRIANÇAS (CLASSES) ---
  console.log("👶 Criando classes (crianças)...");

  const classesData = [
    {
      nome: "Maria Silva",
      dateOfBirth: new Date("2015-04-10"),
    },
    {
      nome: "João Pereira",
      dateOfBirth: new Date("2013-09-25"),
    },
    {
      nome: "Ana Souza",
      dateOfBirth: new Date("2014-12-05"),
    },
    {
      nome: "Pedro Lima",
      dateOfBirth: new Date("2016-06-18"),
    },
    {
      nome: "Beatriz Rocha",
      dateOfBirth: new Date("2012-02-22"),
    },
  ];

  await prisma.classes.deleteMany();
  const createdClasses = await prisma.classes.createMany({
    data: classesData,
  });

  console.log(`✅ ${createdClasses.count} classes criadas.`);

  const allClasses = await prisma.classes.findMany();
  console.log("📘 IDs das classes:", allClasses.map((c) => c.id));

  // --- PONTOS ---
  console.log("⭐ Criando pontos para algumas crianças...");

  const now = new Date();
  const pointsData = [
    {
      classId: allClasses[0].id,
      userId: admin.id,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hora atrás
    },
    {
      classId: allClasses[0].id,
      userId: admin.id,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 horas atrás
    },
    {
      classId: allClasses[1].id,
      userId: user.id,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      classId: allClasses[2].id,
      userId: user.id,
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
  ];

  // Primeiro, apagar os pontos (que dependem das classes)
  await prisma.points.deleteMany();
  await prisma.classes.deleteMany();

  const createdPoints = await prisma.points.createMany({
    data: pointsData,
  });

  console.log(`✅ ${createdPoints.count} pontos criados.`);

  console.log("🌳 Seed concluído com sucesso!");
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
