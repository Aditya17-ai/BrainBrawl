import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GameRoom from "./pages/GameRoom";
import MultiplayerQuiz from "./pages/MultiplayerQuiz";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameRoom />} />
        <Route path="/quiz/:roomCode" element={<MultiplayerQuiz />} />
      </Routes>
    </Router>
  );
}

export default App;
