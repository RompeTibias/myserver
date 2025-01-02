const express = require("express");
const WebSocket = require("ws");
const cors = require('cors');
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar el JSON
app.use(express.json());

// Permite solicitudes desde cualquier origen (si deseas permitir CORS globalmente)
app.use(cors());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Crear un servidor WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Estructura para almacenar salas y jugadores
let rooms = {};

// Cuando un cliente se conecta a WebSocket
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        console.log("Recibido mensaje:", message.toString());  // Log para ver el mensaje recibido
        
        // Aquí puedes manejar el mensaje recibido y transmitirlo a otros jugadores
        // Ejemplo de enviar el mensaje a todos los clientes conectados:
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                // Mensaje que se enviará a los clientes
                const response = JSON.stringify({
                    action: "room-created", 
                    roomCode: "XXXX"
                });
                console.log("Enviando mensaje a cliente:", response);  // Log para ver qué mensaje se enviará
                client.send(response);  // Enviar el mensaje a los clientes conectados
            }
        });
    });

    // Enviar un mensaje cuando la conexión se establece
    ws.send("Conexión establecida con el servidor");
});

// Ruta para crear una nueva sala
function createRoom() {
    const roomCode = Math.random().toString(36).substring(7);  // Crear un código de sala aleatorio
    rooms[roomCode] = { players: [] };  // Crear una sala vacía
    console.log("Sala creada con código:", roomCode);

    // Aquí notificamos a todos los clientes WebSocket sobre la creación de la sala
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            const response = JSON.stringify({
                action: "room-created", 
                roomCode: roomCode
            });
            console.log("Enviando mensaje a cliente: ", response);  // Log para ver lo que se enviará
            client.send(response);
        }
    });

    return roomCode;
}

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
