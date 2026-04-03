const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true,
    },
    answers: {
        type: [Number], // array of selected option indices (-1 = unanswered)
        default: [],
    },
    score: {
        type: Number,
        default: 0,
    },
    passed: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
