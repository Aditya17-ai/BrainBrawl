import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket"; // Use the same socket instance
import "./MultiplayerQuiz.css";

const MultiplayerQuiz = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [players, setPlayers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0); // Add state for score

  const handleNextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setTimeLeft(10);
    } else {
      console.log("🔚 Game Over - No more questions.");
      setGameOver(true);
      socket.emit("endGame", { roomCode, score });
    }
  }, [currentQuestionIndex, questions.length, roomCode, score]);

  useEffect(() => {
    socket.emit("joinRoom", { roomCode });

    socket.on("updatePlayers", (players) => {
      setPlayers(players);
    });

    socket.on("quizStarted", (quizQuestions) => {
      console.log("📥 Received Questions:", quizQuestions);
      
      if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
        console.error("❌ Error: No valid questions received!");
        return;
      }
  
      setQuestions(quizQuestions);
      setCurrentQuestion(quizQuestions[0]); // Set the first question
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(10);
      setGameOver(false);
      setScore(0); // Reset score when quiz starts
    });

    socket.on("quizEnded", ({ scores }) => {
      setGameOver(true);
    });

    socket.on("nextQuestion", (question) => {
      setCurrentQuestion(question);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setTimeLeft(10);
    });

    return () => {
      socket.emit("leaveRoom", { roomCode });
      socket.off("updatePlayers");
      socket.off("quizStarted");
      socket.off("quizEnded");
      socket.off("nextQuestion");
    };
  }, [roomCode, navigate]); // Remove 'socket' from the dependency array

  useEffect(() => {
    if (timeLeft <= 0) {
      handleNextQuestion();
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, handleNextQuestion]);

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      setCurrentQuestion(questions[currentQuestionIndex]);
    }
  }, [currentQuestionIndex, questions]);

  const handleAnswer = (selectedOption) => {
    setSelectedAnswer(selectedOption);
    setIsAnswered(true);
    if (selectedOption === currentQuestion.correct_answer) {
      setScore((prevScore) => prevScore + 10); // Add 10 points for correct answer
      setTimeout(() => {
        socket.emit("nextQuestion", { roomCode, nextIndex: currentQuestionIndex + 1 });
        handleNextQuestion();
      }, 1000); // Add delay for better UX
    } else {
      setScore((prevScore) => prevScore - 2); // Deduct 2 points for wrong answer
      setTimeout(() => {
        socket.emit("nextQuestion", { roomCode, nextIndex: currentQuestionIndex + 1 });
        handleNextQuestion();
      }, 1000); // Add delay for better UX
    }
  };

  const getFinalMessage = () => {
    if (score > 80) {
      return "Damnnn";
    } else if (score > 50) {
      return "Good";
    } else {
      return "Keep working hard!";
    }
  };

  if (questions.length === 0) {
    return (
      <div className="quiz-container">
        <h1>⌛ Waiting for the Quiz to Start...</h1>
        <p>If this takes too long, ensure the backend is running correctly.</p>
      </div>
    );

}
  if (gameOver) {
    return (
      <div className="quiz-container">
        <h1>🎉 Game Over!</h1>
        <h2>Your Final Score: {score}</h2>
        <h3>{getFinalMessage()}</h3>
        <button onClick={() => navigate("/")}>🏠 Go to Home</button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h1 className="quiz-title">🎮 Quiz Room: {roomCode}</h1>

      <div className="player-list">
        <h3>👥 Players in Room:</h3>
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.username || "Unknown Player"} - 🏆 Score: {typeof player.score === "number" ? player.score : 0}
            </li>
          ))}
        </ul>
      </div>

      <div className="timer-container">
        <h2>⏳ Time Left: {timeLeft} seconds</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(timeLeft / 10) * 100}%` }}></div>
        </div>
      </div>

      <div className="score-container">
        <h2>🏅 Your Score: {score}</h2>
      </div>

      {currentQuestion && (
        <div className="question-container">
          <h2
            className="question-text"
            dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
          ></h2>
          <div className="answer-buttons">
            {console.log("Current Question", currentQuestion)}
            {currentQuestion?.answers && currentQuestion.answers.length > 0 ? (
              currentQuestion.answers.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`answer-button ${
                    selectedAnswer === option
                      ? option === currentQuestion.correct_answer
                        ? "correct"
                        : "wrong"
                      : ""
                  }`}
                  disabled={isAnswered}
                >
                  {option}
                </button>
              ))
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};

export default MultiplayerQuiz;