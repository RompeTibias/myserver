const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {};  // Contendrá las salas y sus jugadores

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para crear una nueva sala
app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = { players: [], characters: {}, lastActivity: Date.now() }; // Agregar 'characters'
    console.log(`Sala creada: ${roomCode}`);
    res.json({ roomCode });
});

// Endpoint para unirse a una sala
app.post('/join', (req, res) => {
    const { roomCode, playerName } = req.body;
    console.log(`Intentando unir a la sala: ${roomCode} con el jugador: ${playerName}`);

    if (!roomCode || !playerName) {
        console.error('Código de sala o nombre de jugador faltante');
        return res.json({ success: false, message: 'Código de sala o nombre de jugador faltante' });
    }

    if (rooms[roomCode]) {
        rooms[roomCode].players.push(playerName);
        rooms[roomCode].lastActivity = Date.now();
        console.log(`${playerName} se unió a la sala ${roomCode}`);

        // Verificar si hay 3 o más jugadores
        if (rooms[roomCode].players.length >= 3) {
            // Notificar a todos los clientes que hay suficientes jugadores
            const message = JSON.stringify({
                type: 'playersReady',
                roomCode: roomCode
            });

            // Enviar el mensaje a todos los clientes WebSocket conectados
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }

        res.json({ success: true, players: rooms[roomCode].players });
    } else {
        console.error('Código de sala no válido');
        res.json({ success: false, message: 'Código de sala no válido' });
    }
});

// Endpoint para obtener la información de la sala (jugadores y sus personajes)
app.get('/getRoomInfo', (req, res) => {
    const { roomCode } = req.query;
    if (rooms[roomCode]) {
        res.json(rooms[roomCode]);
    } else {
        res.json({ success: false, message: 'Sala no encontrada' });
    }
});

// WebSocket para la comunicación con Unity
wss.on('connection', (ws) => {
    console.log('Un cliente (Unity) se ha conectado');
    ws.send(JSON.stringify({ message: 'Conexión establecida con el servidor' }));

    ws.on('message', (message) => {
        console.log('Mensaje recibido de Unity:', message);

        // Procesar el mensaje recibido para iniciar el minijuego
        const msg = JSON.parse(message);
        if (msg.type === "startGame") {
            // Aquí es donde se maneja el inicio del minijuego
            const game = msg.game; // Nombre del minijuego
            console.log(`Iniciando minijuego: ${game}`);
            
            // Servir el HTML del minijuego correspondiente
            if (game === "Rinon") {
                // Suponiendo que el archivo HTML de "Rinon" se encuentra en una carpeta llamada "minijuegos"
                const gameHtmlPath = path.join(__dirname, 'public', 'minijuegos', 'rinon.html');
                ws.send(JSON.stringify({ type: 'startGame', game: game, html: gameHtmlPath }));
            } else {
                // Si el juego no está definido, puedes manejarlo aquí
                console.log(`Juego no definido: ${game}`);
            }
        }
    });

    ws.on('close', () => {
        console.log('Un cliente (Unity) se ha desconectado');
    });
});

// Liberar salas inactivas después de 1 hora
setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of Object.entries(rooms)) {
        if (room.lastActivity && now - room.lastActivity > 3600000) {
            console.log(`Liberando sala inactiva: ${roomCode}`);
            delete rooms[roomCode];
        }
    }
}, 60000);

server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
