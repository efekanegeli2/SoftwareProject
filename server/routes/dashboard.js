import express from 'express';
import { prisma } from '../db.js'; // ARTIK db.js DOSYASINDAN ÇEKİYORUZ!

const router = express.Router();

// GET /profile -> Kullanıcı bilgilerini ve sınavlarını getir
router.get('/profile', async (req, res) => {
  try {
    const userId = 1; // Sabit kullanıcı (Test için)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    const examResults = await prisma.examResult.findMany({
      where: { userId: userId },
      orderBy: { date: 'desc' }
    });

    const totalExams = examResults.length;
    const averageScore = totalExams > 0 
      ? Math.floor(examResults.reduce((acc, curr) => acc + curr.score, 0) / totalExams) 
      : 0;

    res.json({
      user,
      stats: {
        totalExams,
        averageScore,
        lastExamDate: totalExams > 0 ? examResults[0].date : null
      },
      history: examResults
    });

  } catch (error) {
    console.error("Dashboard hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;