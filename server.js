const express = require("express");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000; // Usamos un puerto definido por el entorno o el 3000

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para procesar JSON
app.use(express.json());

// Crear un servidor WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Estructura para almacenar salas y jugadores
let rooms = {};

// Ruta para crear una nueva sala
app.post("/create-room", (req, res) => {
    const roomCode = Math.random().toString(36).substring(7); // Genera un código aleatorio para la sala
    rooms[roomCode] = { players: [] }; // Crea la sala
    console.log(`Sala creada con código: ${roomCode}`);
    res.json({ success: true, roomCode }); // Devuelve el código de la sala al cliente
});

// Ruta para que un jugador se una a una sala
app.post("/join", (req, res) => {
    const { roomCode, playerName } = req.body;
    
    // Verifica si la sala existe
    if (!rooms[roomCode]) {
        return res.status(400).json({ success: false, message: "Código de sala no válido" });
    }

    // Añadir al jugador a la sala
    rooms[roomCode].players.push(playerName);

    // Notificar a todos los jugadores en la sala (puedes personalizar este comportamiento)
    wss.clients.forEach((client) => {
        if (client.roomCode === roomCode && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ playerName, message: "se unió a la sala" }));
        }
    });

    // Responde positivamente al jugador que se unió
    res.json({ success: true, roomCode, playerName });
});

// Configuración de WebSocket
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        console.log("Mensaje recibido:", message);
        // Aquí podrías manejar mensajes entre jugadores, por ejemplo:
        // Enviar un mensaje a todos los jugadores en la misma sala
    });

    // Enviar un mensaje cuando la conexión WebSocket se abre
    ws.send("Conexión WebSocket establecida.");
});

// Habilitar WebSocket en el servidor Express
app.server = app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

// Esta es la función que maneja el proceso de 'upgrade' de WebSocket
app.server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        ws.roomCode = null;  // Inicializa la sala del cliente como null
        wss.emit("connection", ws, request);
    });
});
