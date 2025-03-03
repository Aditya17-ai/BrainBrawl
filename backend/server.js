const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {}; // Store quiz data for each room

// Fetch quiz questions from OpenTriviaDB
const fetchQuizQuestions = async (amount = 10, difficulty = "medium", retries = 3) => {
  try {
    const url = `https://opentdb.com/api.php?amount=${amount}&difficulty=${difficulty}&type=multiple`;
    const response = await axios.get(url);

    if (response.data.response_code !== 0 || !response.data.results) {
      console.error("❌ OpenTDB API Error:", response.data);
      return [];
    }

    const questions = response.data.results.map((q) => ({
      question: q.question,
      answers: [q.correct_answer, ...q.incorrect_answers].sort(() => Math.random() - 0.5),
      correct_answer: q.correct_answer,
    }));

    console.log(`✅ Fetched ${questions.length} questions`);
    return questions;
  } catch (error) {
    if (retries > 0 && error.response && error.response.status === 429) {
      console.warn(`⚠ Rate limit exceeded. Retrying in 5 seconds... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return fetchQuizQuestions(amount, difficulty, retries - 1);
    } else {
      console.error("❌ Error fetching quiz questions:", error.message);
      return [];
    }
  }
};

const getCurrentQuestion = (roomCode) => {
  const room = rooms[roomCode];
  if (!room || !room.questions || room.currentQuestionIndex === undefined) {
    return null;
  }
  return room.questions[room.currentQuestionIndex];
};

const getNextQuestion = (roomCode) => {
  const room = rooms[roomCode];
  if (!room || !room.questions || room.currentQuestionIndex === undefined) {
    return null;
  }
  room.currentQuestionIndex += 1;
  if (room.currentQuestionIndex >= room.questions.length) {
    return null;
  }
  return room.questions[room.currentQuestionIndex];
};

io.on("connection", (socket) => {
  console.log(`🟢 New connection: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
    // Handle user disconnecting
    for (const roomCode in rooms) {
      rooms[roomCode].players = rooms[roomCode].players.filter(player => player.id !== socket.id);
      io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
      if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
      }
    }
  });

  socket.on("createRoom", (roomCode) => {
    rooms[roomCode] = { players: [], currentQuestionIndex: 0 };
    socket.join(roomCode);
    console.log(`Room created: ${roomCode}`);
  });

  socket.on("joinRoom", ({ roomCode, username }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], currentQuestionIndex: 0 };
    }
  
    // Check if user is already in the room (prevent duplicates)
    const existingPlayer = rooms[roomCode].players.find(player => player.id === socket.id);
    
    if (existingPlayer) {
      console.log(`⚠ Duplicate connection detected for socket ID: ${socket.id}`);
      return;
    }
  
    // Add new player
    rooms[roomCode].players.push({ id: socket.id, username, score: 0 });
    socket.join(roomCode);
  
    console.log(`✅ Player joined room ${roomCode}:`, rooms[roomCode].players);
  
    // Send updated player list to all clients in the room
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("startQuiz", async ({ roomCode }) => {
    console.log(`Received startQuiz event for room: ${roomCode}`);

    // Ensure the room exists and has players
    if (!rooms[roomCode] || rooms[roomCode].players.length === 0) {
      console.log(`🚨 Cannot start quiz: No players found in room ${roomCode}`);
      io.to(roomCode).emit("error", "❌ Cannot start quiz: No players found in the room.");
      return;
    }

    const questions = await fetchQuizQuestions(10, "medium"); // Fetch 10 questions
    if (questions.length === 0) {
      io.to(roomCode).emit("error", "❌ No questions fetched. Try again.");
      return;
    }

    console.log(`🎯 Starting quiz in room: ${roomCode} with players:`, rooms[roomCode].players);
    
    // Store the questions in the room data
    rooms[roomCode].questions = questions;
    rooms[roomCode].currentQuestionIndex = 0;

    // 🔥 Send the questions to **all players in the room** 🔥
    io.to(roomCode).emit("quizStarted", questions);
  });

  socket.on("submitAnswer", ({ roomCode, answer }) => {
    const room = rooms[roomCode];
    if (!room) {
      console.log(`Room ${roomCode} not found`);
      return;
    }
  
    // Check if the answer is correct
    const currentQuestion = getCurrentQuestion(roomCode);
    const isCorrect = checkAnswer(answer, currentQuestion.correct_answer);
  
    // Handle the result
    if (isCorrect) {
      console.log("Correct answer!");
      // Update the score or perform other actions
      io.to(roomCode).emit("correctAnswer", { playerId: socket.id, answer });
  
      // Continue the quiz by sending the next question
      const nextQuestion = getNextQuestion(roomCode);
      if (nextQuestion) {
        console.log(`Sending next question to room ${roomCode}`);
        io.to(roomCode).emit("nextQuestion", nextQuestion);
      } else {
        console.log(`No more questions in room ${roomCode}`);
        io.to(roomCode).emit("quizFinished");
      }
    } else {
      console.log("Wrong answer!");
      // Handle incorrect answer
      socket.emit("incorrectAnswer", { answer });
    }
  });
});

// Implement the checkAnswer function
function checkAnswer(answer, correctAnswer) {
  return answer === correctAnswer;
}

server.listen(5000, () => console.log("🚀 Server running on port 5000"));
