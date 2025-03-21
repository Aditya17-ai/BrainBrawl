import { io } from "socket.io-client";
const socket = io("https://brainbrawl-backend.onrender.com");
export default socket;
