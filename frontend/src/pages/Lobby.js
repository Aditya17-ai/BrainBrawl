import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

const Lobby = () => {
  const [roomCode, setRoomCode] = useState("");
  const [generatedRoomCode, setGeneratedRoomCode] = useState(null);
  const navigate = useNavigate();

  // Create a new room
  const createRoom = () => {
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedRoomCode(newRoomCode);
    socket.emit("createRoom", newRoomCode);
  };

  // Join a room
  const joinRoom = (code) => {
    if (!code.trim()) return;
    socket.emit("joinRoom", code, (response) => {
      if (response.success) {
        navigate(`/multiplayer-quiz/${code}`); // ✅ Redirect to quiz
      } else {
        alert("Invalid Room Code or Room Full!");
      }
    });
  };

  return (
    <div>
      <h2>Create or Join a Game Room</h2>

      {/* Create Room Section */}
      <button onClick={createRoom}>Create Room</button>
      {generatedRoomCode && (
        <p>Room Code: <strong>{generatedRoomCode}</strong> (Share this with friends!)</p>
      )}

      <hr />

      {/* Join Room Section */}
      <input
        type="text"
        placeholder="Enter Room Code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />
      <button onClick={() => joinRoom(roomCode)}>Join Room</button>
    </div>
  );
};

export default Lobby;
