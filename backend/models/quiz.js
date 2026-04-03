const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true,
    },
    options: {
        type: [String],
        required: true,
    },
    correctAnswer: {
        type: Number, // index of correct option
        required: true,
    },
    explanation: {
        type: String,
        default: '',
    },
});

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    questions: [questionSchema],
    passingScore: {
        type: Number,
        default: 60, // percentage
    },
});

module.exports = mongoose.model('Quiz', quizSchema);
