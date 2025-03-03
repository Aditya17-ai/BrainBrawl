const express = require('express');
const router = express.Router();

// Dummy quiz questions
const questions = [
    { question: "What is the capital of France?", options: ["Paris", "London", "Rome", "Berlin"], answer: "Paris" },
    { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], answer: "4" },
    { question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Venus"], answer: "Mars" }
];

router.get('/questions', (req, res) => {
    res.json(questions);
});

module.exports = router;
