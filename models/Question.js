// models/Question.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: String,
  exam: String,
  subject: String,
  chapter: String,
  questionType: String,
  question: String,
  solution: String,
  date: Number,
  month: String,
  shift: String,
  year: Number,
  difficulty: String,
  options: {
    A: String,
    B: String,
    C: String,
    D: String
  },
  correctOption: String,
  integerAnswer: Number
});

module.exports = mongoose.model('Question', questionSchema);
