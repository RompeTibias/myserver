const express = require("express");
const WebSocket = require("ws");
const cors = require('cors');
const path = require("path");

const app = express();
const port = process.env.PORT || 3000; // Puerto para producción o local

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Crear un servidor WebSocket
const wss = new WebSocket.Server({ noServer: true }); // Asegúrate de definir 'wss' antes de usarlo

// Estructura para almacenar salas y jugadores
let rooms = {};

// Manejo de conexiones WebSocket
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        console.log("Recibido:", message);
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.send("Conexión establecida con el servidor");
});

// Crear una sala con un código aleatorio
function createRoom() {
    const roomCode = Math.random().toString(36).substring(7);
    rooms[roomCode] = { players: [] };
    console.log("Sala creada con código:", roomCode);

    // Notificar a los clientes conectados
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

// Habilitar WebSocket en el servidor Express
app.server = app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
