import express from 'express';
import axios from 'axios';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Generate exam content
router.get('/generate', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    // Question templates for variety
    const questionTemplates = [
      { question: 'What is the correct form of the verb in: "She ___ to the store yesterday."', options: ['go', 'goes', 'went', 'going'], correct: 'went' },
      { question: 'Choose the correct preposition: "I have been working ___ this project for weeks."', options: ['on', 'in', 'at', 'for'], correct: 'on' },
      { question: 'Select the correct article: "___ sun rises in the east."', options: ['A', 'An', 'The', 'No article'], correct: 'The' },
      { question: 'What is the comparative form of "interesting"?', options: ['more interesting', 'interestinger', 'most interesting', 'interestinger'], correct: 'more interesting' },
      { question: 'Choose the correct conditional: "If I ___ harder, I would have passed."', options: ['study', 'studied', 'had studied', 'would study'], correct: 'had studied' },
      { question: 'Select the correct passive voice: "The book ___ by millions."', options: ['read', 'reads', 'is read', 'was read'], correct: 'is read' },
      { question: 'What is the correct modal verb: "You ___ see a doctor if you feel unwell."', options: ['should', 'must', 'can', 'will'], correct: 'should' },
      { question: 'Choose the correct relative pronoun: "The person ___ I met yesterday was friendly."', options: ['who', 'whom', 'which', 'that'], correct: 'whom' },
      { question: 'What is the future perfect form: "By next year, I ___ my degree."', options: ['finish', 'will finish', 'will have finished', 'finished'], correct: 'will have finished' },
      { question: 'Select the correct tense: "I ___ here since 2020."', options: ['live', 'lived', 'have lived', 'am living'], correct: 'have lived' },
    ];

    // Generate 20 MCQ questions (repeating templates if needed)
    const mcqQuestions = Array.from({ length: 20 }, (_, i) => {
      const template = questionTemplates[i % questionTemplates.length];
      return {
        id: `mcq-${i + 1}`,
        question: template.question,
        options: template.options,
        correctAnswer: template.correct
      };
    });

    // Writing topic
    const writingTopic = {
      id: 'writing-1',
      topic: 'Advantages of AI',
      instructions: 'Write a short essay (at least 100 words) about the advantages of artificial intelligence.'
    };

    // Speaking sentences
    const speakingSentences = [
      'The sun sets in the west.',
      'Technology has changed our daily lives significantly.',
      'Learning a new language requires dedication and practice.'
    ];

    res.json({
      mcqQuestions,
      writingTopic,
      speakingSentences
    });
  } catch (error) {
    console.error('Generate exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit exam
router.post('/submit', authenticate, requireRole('STUDENT'), async (req, res) => {
  try {
    const { mcqAnswers, writingText, speakingText } = req.body;
    const userId = req.user.id;

    // Check if payload is empty
    const isEmpty = (!mcqAnswers || mcqAnswers.length === 0) && 
                    (!writingText || writingText.trim() === '') && 
                    (!speakingText || speakingText.trim() === '');

    // Prepare payload for AI service
    const aiPayload = {
      mcq_answers: mcqAnswers || [],
      writing_text: writingText || '',
      speaking_text: speakingText || ''
    };

    // Call AI service for scoring
    let aiResponse;
    try {
      const response = await axios.post(
        `${process.env.AI_SERVICE_URL}/score`,
        aiPayload,
        { timeout: 10000 }
      );
      aiResponse = response.data;
    } catch (error) {
      console.error('AI service error:', error.message);
      // If AI service fails, return zero score
      aiResponse = {
        overall_score: 0,
        cefr_level: 'A1',
        feedback: 'Scoring service unavailable. Please try again later.'
      };
    }

    // Create exam record
    const exam = await prisma.exam.create({
      data: {
        studentId: userId,
        status: 'COMPLETED',
        overallScore: aiResponse.overall_score,
        cefrLevel: aiResponse.cefr_level
      }
    });

    // Save MCQ answers
    if (mcqAnswers && mcqAnswers.length > 0) {
      await prisma.answer.createMany({
        data: mcqAnswers.map((answer, index) => ({
          examId: exam.id,
          type: 'MCQ',
          questionText: `MCQ Question ${index + 1}`,
          userResponse: answer,
          aiScore: null
        }))
      });
    }

    // Save writing answer
    if (writingText && writingText.trim() !== '') {
      await prisma.answer.create({
        data: {
          examId: exam.id,
          type: 'WRITING',
          questionText: 'Advantages of AI',
          userResponse: writingText,
          aiScore: null
        }
      });
    }

    // Save speaking answer
    if (speakingText && speakingText.trim() !== '') {
      await prisma.answer.create({
        data: {
          examId: exam.id,
          type: 'SPEAKING',
          questionText: 'Speaking Task',
          userResponse: speakingText,
          aiScore: null
        }
      });
    }

    res.json({
      examId: exam.id,
      overallScore: aiResponse.overall_score,
      cefrLevel: aiResponse.cefr_level,
      feedback: aiResponse.feedback
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
