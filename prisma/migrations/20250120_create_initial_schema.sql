-- Criação da tabela "Classes"
CREATE TABLE "Classes" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP NOT NULL
);

-- Criação da tabela "User"
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "username" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL
);

-- Criação da tabela "Points"
CREATE TABLE "Points" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "classId" INT NOT NULL,
    "userId" INT DEFAULT 1 NOT NULL,
    CONSTRAINT "FK_classId" FOREIGN KEY ("classId") REFERENCES "Classes" ("id") ON DELETE CASCADE,
    CONSTRAINT "FK_userId" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Criação da tabela "Presence"
CREATE TABLE "Presence" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "userId" INT NOT NULL,
    CONSTRAINT "FK_presence_userId" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);
