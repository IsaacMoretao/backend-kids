import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";
import path from "path";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();
export const reportRoutes = Router();
const periods = ["MORNING", "AFTERNOON", "NIGHT"] as const;

class ReportController {
  async Presences(req: Request, res: Response) {
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;

    let startDate = dayjs().startOf("month");
    let endDate = dayjs().endOf("month");

    if (startDateParam) {
      const parsedStart = dayjs(startDateParam, "YYYY-MM-DD", true);
      if (!parsedStart.isValid()) {
        return res.status(400).json({ message: "Parâmetro 'startDate' inválido. Use YYYY-MM-DD." });
      }
      startDate = parsedStart.startOf("day");
    }

    if (endDateParam) {
      const parsedEnd = dayjs(endDateParam, "YYYY-MM-DD", true);
      if (!parsedEnd.isValid()) {
        return res.status(400).json({ message: "Parâmetro 'endDate' inválido. Use YYYY-MM-DD." });
      }
      endDate = parsedEnd.endOf("day");
    }

    // Validar limite de 3 meses atrás
    const threeMonthsAgo = dayjs().subtract(3, "month").startOf("day");
    if (startDate.isBefore(threeMonthsAgo) || endDate.isAfter(dayjs())) {
      return res.status(400).json({
        message: "O intervalo de datas deve estar dentro dos últimos 3 meses e não ultrapassar hoje.",
      });
    }

    // Converter para Date para usar no Prisma
    const startOfRange = startDate.toDate();
    const endOfRange = endDate.toDate();

    // Caminhos dos ícones
    const ICONS = {
      MORNING: path.resolve("src/assets/morning.png"),
      AFTERNOON: path.resolve("src/assets/afternoon.png"),
      NIGHT: path.resolve("src/assets/night.png"),
      X: path.resolve("src/assets/x.png"),
    };

    try {
      const users = await prisma.user.findMany({
        include: {
          presence: {
            where: {
              createdAt: { gte: startOfRange, lte: endOfRange },
            },
          },
        },
        orderBy: { username: "asc" },
      });

      // Dias válidos
      const allPresences = users.flatMap((u) => u.presence);
      const validDaysSet = new Set(
        allPresences.map((p) => dayjs(p.createdAt).format("DD/MM"))
      );
      const validDays = Array.from(validDaysSet).sort(
        (a, b) =>
          dayjs(a, "DD/MM").toDate().getTime() -
          dayjs(b, "DD/MM").toDate().getTime()
      );

      const validPeriodsPerDay: Record<string, string[]> = {};
      validDays.forEach((day) => {
        const periodsForDay = periods.filter((period) =>
          users.some((u) =>
            u.presence.some(
              (p) =>
                dayjs(p.createdAt).format("DD/MM") === day &&
                p.period === period
            )
          )
        );
        validPeriodsPerDay[day] = periodsForDay;
      });

      // 🔹 Criar PDF
      const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=relatorio-presencas.pdf`
      );
      doc.pipe(res);

      // Cabeçalho azul
      doc.rect(0, 0, doc.page.width, 50).fill("#007BFF");
      doc
        .fillColor("white")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Relatório de Presenças", 0, 15, { align: "center" });

      doc
        .fillColor("black")
        .fontSize(12)
        .font("Helvetica")
        .text(
          `Período: ${dayjs(startOfRange).format("DD/MM/YYYY")} até ${dayjs(
            endOfRange
          ).format("DD/MM/YYYY")}`,
          { align: "center" }
        );

      doc.moveDown(2);

      // Config tabela
      const startX = 40;
      let posY = 100;
      const rowHeight = 30;
      const colWidth = 60;

      doc.font("Helvetica-Bold").fontSize(11).fillColor("white");
      doc.rect(startX, posY, colWidth, rowHeight).fill("#007BFF").stroke();
      doc.fillColor("white").text("Usuário", startX + 5, posY + 9, { width: colWidth, align: "left" });

      // Cabeçalho de datas
      validDays.forEach((day, i) => {
        const x = startX + colWidth * (i + 1);
        doc.rect(x, posY, colWidth, rowHeight).fill("#007BFF").stroke();
        doc.fillColor("white").text(day, x, posY + 9, { width: colWidth, align: "center" });
      });

      posY += rowHeight;

      // Corpo da tabela
      users.forEach((user, userIndex) => {
        const isEven = userIndex % 2 === 0;
        const bgColor = isEven ? "#F2F2F2" : "#FFFFFF";

        doc.rect(startX, posY, colWidth * (validDays.length + 1), rowHeight)
          .fill(bgColor)
          .strokeColor("#CCCCCC")
          .lineWidth(0.5)
          .stroke();

        // Nome do usuário
        doc.fillColor("black").font("Helvetica").fontSize(10).text(user.username, startX + 5, posY + 10, {
          width: colWidth, align: "left"
        });

        // Ícones por dia e período
        validDays.forEach((day, i) => {
          const x = startX + colWidth * (i + 1);
          const periodsForDay = validPeriodsPerDay[day];

          if (!periodsForDay || periodsForDay.length === 0) {
            doc.fillColor("gray").fontSize(10).text("—", x, posY + 10, { width: colWidth, align: "center" });
            return;
          }

          let iconX = x + colWidth / 2 - (periodsForDay.length * 10);

          periodsForDay.forEach((period) => {
            const presence = user.presence.find(
              (p) => dayjs(p.createdAt).format("DD/MM") === day && p.period === period
            );

            if (presence) {
              const iconPath = ICONS[period as keyof typeof ICONS];
              if (iconPath) doc.image(iconPath, iconX, posY + 8, { width: 14, height: 14 });
            } else {
              const xIconPath = ICONS.X;
              if (xIconPath) doc.image(xIconPath, iconX, posY + 8, { width: 14, height: 14 });
            }

            iconX += 18;
          });
        });

        posY += rowHeight;

        // Paginação automática
        if (posY > doc.page.height - 80) {
          doc.addPage({ size: "A4", layout: "landscape" });

          // Cabeçalho azul de nova página
          doc.rect(0, 0, doc.page.width, 50).fill("#007BFF");
          doc
            .fillColor("white")
            .fontSize(18)
            .font("Helvetica-Bold")
            .text("Relatório de Presenças (cont.)", 0, 15, { align: "center" });

          // Cabeçalho de datas novamente
          posY = 100;
          doc.font("Helvetica-Bold").fontSize(11).fillColor("white");
          doc.rect(startX, posY, colWidth, rowHeight).fill("#007BFF").stroke();
          doc.text("Usuário", startX + 5, posY + 9, {
            width: colWidth,
            align: "left",
          });
          validDays.forEach((day, i) => {
            const x = startX + colWidth * (i + 1);
            doc.rect(x, posY, colWidth, rowHeight).fill("#007BFF").stroke();
            doc.text(day, x, posY + 9, { width: colWidth, align: "center" });
          });

          posY += rowHeight;
        }
      });

      // Rodapé
      doc
        .fillColor("gray")
        .fontSize(10)
        .text("© 2025 - Verbo da vida - Arujá", 0, doc.page.height - 40, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      res.status(500).json({ message: "Erro ao gerar PDF." });
    }
  }

  async PresencesExcel(req: Request, res: Response) {
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;

    let startDate = dayjs().startOf("month");
    let endDate = dayjs().endOf("month");

    if (startDateParam) {
      const parsedStart = dayjs(startDateParam, "YYYY-MM-DD", true);
      if (!parsedStart.isValid()) {
        return res.status(400).json({ message: "Parâmetro 'startDate' inválido. Use YYYY-MM-DD." });
      }
      startDate = parsedStart.startOf("day");
    }

    if (endDateParam) {
      const parsedEnd = dayjs(endDateParam, "YYYY-MM-DD", true);
      if (!parsedEnd.isValid()) {
        return res.status(400).json({ message: "Parâmetro 'endDate' inválido. Use YYYY-MM-DD." });
      }
      endDate = parsedEnd.endOf("day");
    }

    // Limite 3 meses
    const threeMonthsAgo = dayjs().subtract(3, "month").startOf("day");
    if (startDate.isBefore(threeMonthsAgo) || endDate.isAfter(dayjs())) {
      return res.status(400).json({
        message: "O intervalo de datas deve estar dentro dos últimos 3 meses e não ultrapassar hoje.",
      });
    }

    const startOfRange = startDate.toDate();
    const endOfRange = endDate.toDate();

    try {
      const users = await prisma.user.findMany({
        include: {
          presence: {
            where: { createdAt: { gte: startOfRange, lte: endOfRange } },
          },
        },
        orderBy: { username: "asc" },
      });

      // Dias válidos
      const allPresences = users.flatMap(u => u.presence);
      const validDaysSet = new Set(allPresences.map(p => dayjs(p.createdAt).format("DD/MM")));
      const validDays = Array.from(validDaysSet).sort(
        (a, b) =>
          dayjs(a, "DD/MM").toDate().getTime() - dayjs(b, "DD/MM").toDate().getTime()
      );

      const validPeriodsPerDay: Record<string, string[]> = {};
      validDays.forEach(day => {
        const periodsForDay = periods.filter(period =>
          users.some(u =>
            u.presence.some(p => dayjs(p.createdAt).format("DD/MM") === day && p.period === period)
          )
        );
        validPeriodsPerDay[day] = periodsForDay;
      });

      // Criar Excel
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Presenças");

      // Cabeçalho
      const header = ["Usuário"];
      validDays.forEach(day => {
        validPeriodsPerDay[day].forEach(period => {
          header.push(`${day} - ${period}`);
        });
      });
      sheet.addRow(header);

      // Corpo
      users.forEach(user => {
        const row: string[] = [user.username];
        validDays.forEach(day => {
          validPeriodsPerDay[day].forEach(period => {
            const presence = user.presence.find(
              p => dayjs(p.createdAt).format("DD/MM") === day && p.period === period
            );
            row.push(presence ? "✅" : "❌");
          });
        });
        sheet.addRow(row);
      });

      // Ajustar largura das colunas
      sheet.columns.forEach(col => {
        col.width = 15;
      });

      // Enviar Excel
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=relatorio-presencas.xlsx`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      res.status(500).json({ message: "Erro ao gerar Excel." });
    }
  }
}

export default new ReportController();
