const Quiz = require('../models/quiz');
const QuizAttempt = require('../models/quizAttempt');
const Section = require('../models/section');
const CourseProgress = require('../models/courseProgress');


// ================ Create Quiz ================
exports.createQuiz = async (req, res) => {
    try {
        const { sectionId, title, description, questions, passingScore } = req.body;

        if (!sectionId || !title || !questions || !questions.length) {
            return res.status(400).json({
                success: false,
                message: 'sectionId, title, and questions are required',
            });
        }

        // validate questions structure
        for (const q of questions) {
            if (!q.questionText || !q.options || q.options.length < 2 || q.correctAnswer === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Each question must have questionText, at least 2 options, and correctAnswer',
                });
            }
        }

        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(404).json({ success: false, message: 'Section not found' });
        }

        // if section already has a quiz, delete the old one
        if (section.quiz) {
            await Quiz.findByIdAndDelete(section.quiz);
        }

        const quiz = await Quiz.create({ title, description, questions, passingScore: passingScore || 60 });

        section.quiz = quiz._id;
        await section.save();

        const updatedSection = await Section.findById(sectionId).populate('subSection').populate('quiz');

        return res.status(200).json({
            success: true,
            data: updatedSection,
            message: 'Quiz created successfully',
        });
    } catch (error) {
        console.error('Error creating quiz:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while creating quiz',
        });
    }
};


// ================ Update Quiz ================
exports.updateQuiz = async (req, res) => {
    try {
        const { quizId, title, description, questions, passingScore } = req.body;

        if (!quizId) {
            return res.status(400).json({ success: false, message: 'quizId is required' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        if (title) quiz.title = title;
        if (description !== undefined) quiz.description = description;
        if (passingScore !== undefined) quiz.passingScore = passingScore;
        if (questions && questions.length) {
            for (const q of questions) {
                if (!q.questionText || !q.options || q.options.length < 2 || q.correctAnswer === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each question must have questionText, at least 2 options, and correctAnswer',
                    });
                }
            }
            quiz.questions = questions;
        }

        await quiz.save();

        return res.status(200).json({
            success: true,
            data: quiz,
            message: 'Quiz updated successfully',
        });
    } catch (error) {
        console.error('Error updating quiz:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating quiz',
        });
    }
};


// ================ Delete Quiz ================
exports.deleteQuiz = async (req, res) => {
    try {
        const { quizId, sectionId } = req.body;

        if (!quizId || !sectionId) {
            return res.status(400).json({ success: false, message: 'quizId and sectionId are required' });
        }

        await Section.findByIdAndUpdate(sectionId, { quiz: null });
        await Quiz.findByIdAndDelete(quizId);
        await QuizAttempt.deleteMany({ quizId });

        const updatedSection = await Section.findById(sectionId).populate('subSection').populate('quiz');

        return res.status(200).json({
            success: true,
            data: updatedSection,
            message: 'Quiz deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while deleting quiz',
        });
    }
};


// ================ Get Quiz Details (for student) ================
exports.getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.body;

        if (!quizId) {
            return res.status(400).json({ success: false, message: 'quizId is required' });
        }

        // Return quiz WITHOUT correctAnswer and explanation (prevent cheating)
        const quiz = await Quiz.findById(quizId).select('-questions.correctAnswer -questions.explanation');
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        return res.status(200).json({
            success: true,
            data: quiz,
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while fetching quiz',
        });
    }
};


// ================ Submit Quiz ================
exports.submitQuiz = async (req, res) => {
    try {
        const { quizId, courseId, sectionId, answers } = req.body;
        const userId = req.user.id;

        if (!quizId || !courseId || !sectionId || !answers) {
            return res.status(400).json({ success: false, message: 'quizId, courseId, sectionId and answers are required' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        // calculate score
        let correct = 0;
        const feedback = quiz.questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctAnswer;
            if (isCorrect) correct++;
            return {
                questionText: q.questionText,
                selectedAnswer: answers[i],
                correctAnswer: q.correctAnswer,
                isCorrect,
                explanation: q.explanation,
                options: q.options,
            };
        });

        const score = Math.round((correct / quiz.questions.length) * 100);
        const passed = score >= quiz.passingScore;

        // save attempt (overwrite previous attempt if any)
        await QuizAttempt.findOneAndUpdate(
            { userId, quizId },
            { userId, quizId, courseId, sectionId, answers, score, passed, completedAt: new Date() },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            data: {
                score,
                passed,
                passingScore: quiz.passingScore,
                totalQuestions: quiz.questions.length,
                correctAnswers: correct,
                feedback,
            },
            message: passed ? 'Congratulations! You passed the quiz.' : 'You did not pass. Try again!',
        });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while submitting quiz',
        });
    }
};


// ================ Get Quiz Result (past attempt) ================
exports.getQuizResult = async (req, res) => {
    try {
        const { quizId } = req.body;
        const userId = req.user.id;

        const attempt = await QuizAttempt.findOne({ userId, quizId });
        if (!attempt) {
            return res.status(200).json({ success: true, data: null, message: 'No attempt found' });
        }

        const quiz = await Quiz.findById(quizId);
        const feedback = quiz.questions.map((q, i) => ({
            questionText: q.questionText,
            selectedAnswer: attempt.answers[i],
            correctAnswer: q.correctAnswer,
            isCorrect: attempt.answers[i] === q.correctAnswer,
            explanation: q.explanation,
            options: q.options,
        }));

        return res.status(200).json({
            success: true,
            data: {
                score: attempt.score,
                passed: attempt.passed,
                passingScore: quiz.passingScore,
                totalQuestions: quiz.questions.length,
                correctAnswers: feedback.filter(f => f.isCorrect).length,
                feedback,
                completedAt: attempt.completedAt,
            },
        });
    } catch (error) {
        console.error('Error getting quiz result:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while getting quiz result',
        });
    }
};
