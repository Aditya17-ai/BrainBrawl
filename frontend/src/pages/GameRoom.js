import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import "./GameRoom.css";

const GameRoom = () => {
  const [roomCode, setRoomCode] = useState("");
  const [generatedRoomCode, setGeneratedRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Connecting to socket...");
    socket.on("connect", () => {
      console.log("Connected to socket:", socket.id);
    });

    socket.on("updatePlayers", (players) => {
      console.log("🔄 Player list updated:", players);
      setPlayers(players);  // ✅ Update state with the latest player list
    });

    return () => {
      socket.off("updatePlayers"); // Clean up event listener
    };
  }, []);

  const handleCreateRoom = () => {
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedRoomCode(newRoomCode);
    socket.emit("createRoom", newRoomCode);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim() !== "") {
      socket.emit("joinRoom", { roomCode });
    }
  };

  const handleStartQuiz = () => {
    const code = generatedRoomCode || roomCode;
    console.log("🚀 Starting quiz for room:", code);
    socket.emit("startQuiz", { roomCode: code });
    navigate(`/quiz/${code}`);
  };

  return (
    <div className="game-room">
      <h1>BrainBrawl 🤯</h1>

      <button className="btn" onClick={handleCreateRoom}>Create Room</button>
      {generatedRoomCode && <p>Room Code: <strong>{generatedRoomCode}</strong></p>}

      <h3>Join a Room</h3>
      <input
        type="text"
        placeholder="Enter Room Code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />
      <button className="btn" onClick={handleJoinRoom}>Join</button>

      <h3>Players in Room:</h3>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player.id}</li>
        ))}
      </ul>

      {players.length > 0 && (
        <button className="btn" onClick={handleStartQuiz}>Start Quiz</button>
      )}
    </div>
  );
};

export default GameRoom;
