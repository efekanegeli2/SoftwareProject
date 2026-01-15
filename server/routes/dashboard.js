import express from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Teacher dashboard - List all students and their exam history
router.get('/teacher', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT'
      },
      include: {
        exams: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            status: true,
            overallScore: true,
            cefrLevel: true,
            createdAt: true
          }
        }
      }
    });

    res.json(students);
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Teacher dashboard - Get detailed answers for a specific student
router.get('/teacher/student/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.user.findUnique({
      where: {
        id,
        role: 'STUDENT'
      },
      include: {
        exams: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            answers: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Student details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin dashboard - Full system overview
router.get('/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [users, exams, answers] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        }
      }),
      prisma.exam.findMany({
        include: {
          student: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.answer.count()
    ]);

    const stats = {
      totalUsers: users.length,
      totalStudents: users.filter(u => u.role === 'STUDENT').length,
      totalTeachers: users.filter(u => u.role === 'TEACHER').length,
      totalAdmins: users.filter(u => u.role === 'ADMIN').length,
      totalExams: exams.length,
      totalAnswers: answers,
      averageScore: exams.length > 0
        ? Math.round(exams.reduce((sum, e) => sum + (e.overallScore || 0), 0) / exams.length)
        : 0
    };

    res.json({
      stats,
      users,
      recentExams: exams.slice(0, 10)
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Delete user
router.delete('/admin/user/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
