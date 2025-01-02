const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Crear el servidor HTTP
const server = require('http').createServer(app);

// Crear un servidor WebSocket
const wss = new WebSocket.Server({ server });

// Almacenar salas (clave: código de sala, valor: datos de la sala)
let rooms = {};

// Ruta para la raíz (servir el index.html de la carpeta 'public')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Crear una nueva sala (solo Unity puede hacer esto)
app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();  // Generar un código aleatorio para la sala
    rooms[roomCode] = { players: [], lastActivity: Date.now() };  // Inicializar la sala con marca de tiempo
    console.log(`Sala creada: ${roomCode}`);
    res.json({ roomCode });  // Enviar el código de la sala creada
});

// Unirse a una sala desde la web o desde Unity
app.post('/join', (req, res) => {
    const { roomCode, playerName } = req.body;

    if (!roomCode || !playerName) {
        return res.json({ success: false, message: 'Código de sala o nombre de jugador faltante' });
    }

    // Si la sala existe
    if (rooms[roomCode]) {
        rooms[roomCode].players.push(playerName);  // Añadir jugador a la sala
        rooms[roomCode].lastActivity = Date.now();  // Actualizar la última actividad
        console.log(`${playerName} se unió a la sala ${roomCode}`);

        // Notificar a todos los clientes conectados (Unity) sobre el nuevo jugador
wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
            type: 'newPlayer',
            playerName: playerName,
            roomCode: roomCode
        });
        console.log("Enviando mensaje a Unity:", message);
        client.send(message);
    }
});


        res.json({ success: true, players: rooms[roomCode].players });
    } else {
        res.json({ success: false, message: 'Código de sala no válido' });
    }
});

// Finalizar la partida y liberar la sala
app.post('/endGame', (req, res) => {
    const { roomCode } = req.body;

    if (!roomCode) {
        console.error('Error: Código de sala no proporcionado');
        return res.json({ success: false, message: 'Código de sala no proporcionado' });
    }

    // Eliminar la sala del registro
    if (rooms[roomCode]) {
        delete rooms[roomCode];
        console.log(`Sala ${roomCode} liberada`);
        res.json({ success: true, message: 'Sala liberada' });
    } else {
        console.warn(`Intento de liberar una sala inexistente: ${roomCode}`);
        res.json({ success: false, message: 'La sala no existe' });
    }
});

// Conexión WebSocket para Unity
wss.on('connection', (ws) => {
    console.log('Un cliente (Unity) se ha conectado');

    // Enviar un mensaje de bienvenida cuando Unity se conecta
    ws.send(JSON.stringify({ message: 'Conexión establecida con el servidor' }));

    // Manejar mensajes entrantes desde Unity (por ejemplo, cuando Unity se conecta)
    ws.on('message', (message) => {
        console.log('Mensaje recibido de Unity:', message);
    });

    // Manejar desconexión de WebSocket
    ws.on('close', () => {
        console.log('Un cliente (Unity) se ha desconectado');
    });
});

// Mecanismo de limpieza automática para salas inactivas
setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of Object.entries(rooms)) {
        if (room.lastActivity && now - room.lastActivity > 3600000) {  // 1 hora de inactividad
            console.log(`Liberando sala inactiva: ${roomCode}`);
            delete rooms[roomCode];
        }
    }
}, 60000);  // Revisar cada minuto

// Iniciar el servidor
server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
