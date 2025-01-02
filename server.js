const express = require("express");
const WebSocket = require("ws");
const cors = require('cors');
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocket.Server({ noServer: true });

let rooms = {};

// Manejo de conexiones WebSocket
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        console.log("Recibido:", message);

        // Responder con "mensaje recibido"
        const response = JSON.stringify({ message: "mensaje recibido" });
        ws.send(response);
    });

    ws.send("Conexión establecida con el servidor");
});

// Crear una sala con un código aleatorio
function createRoom() {
    const roomCode = Math.random().toString(36).substring(7);
    rooms[roomCode] = { players: [] };
    console.log("Sala creada con código:", roomCode);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                action: "room-created",
                roomCode: roomCode,
            }));
        }
    });

    return roomCode;
}

// Ruta para crear sala
app.post("/create-room", (req, res) => {
    const roomCode = createRoom();
    res.json({ success: true, roomCode: roomCode });
});

app.server = app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
