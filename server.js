const express = require("express");
const WebSocket = require("ws");
const cors = require('cors');  // Importa CORS
const path = require("path");  // Para servir archivos estáticos en producción

const app = express();
const port = process.env.PORT || 3000;  // Usa el puerto de producción si está disponible

// Middleware para procesar el JSON
app.use(express.json());

// Permite solicitudes desde cualquier origen (si deseas permitir CORS globalmente)
app.use(cors());  // Agrega el middleware CORS

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Crear un servidor WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Estructura para almacenar salas y jugadores
let rooms = {};

// Ruta para unirse a una sala
app.post("/join", (req, res) => {
    const { roomCode, playerName } = req.body;
    
    // Verificar si la sala existe
    if (!rooms[roomCode]) {
        return res.status(400).json({ success: false, message: "Código de sala no válido" });
    }

    // Añadir al jugador a la sala
    rooms[roomCode].players.push(playerName);

    // Enviar una respuesta positiva al cliente
    res.json({ success: true, roomCode: roomCode, playerName: playerName });
});

// Cuando un cliente se conecta a WebSocket
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        console.log("Recibido:", message);
        
        // Aquí puedes manejar el mensaje recibido y transmitirlo a otros jugadores
        // Ejemplo de enviar el mensaje a todos los clientes conectados:
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    // Enviar un mensaje cuando la conexión se establece
    ws.send("Conexión establecida con el servidor");
});

// Crear una sala con un código aleatorio
// Crear una sala con un código aleatorio
function createRoom() {
    const roomCode = Math.random().toString(36).substring(7);  // Crear un código de sala aleatorio
    rooms[roomCode] = { players: [] };  // Crear una sala vacía
    console.log("Sala creada con código:", roomCode);

    // Aquí notificamos a todos los clientes WebSocket sobre la creación de la sala
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({
                action: "room-created", 
                roomCode: roomCode
            });
            console.log("Mensaje enviado al cliente:", message);  // Ver mensaje enviado

            client.send(message);
        }
    });

    return roomCode;
}



// Ruta para crear una nueva sala
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
