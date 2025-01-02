const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = { players: [], lastActivity: Date.now() };
    console.log(`Sala creada: ${roomCode}`);
    res.json({ roomCode });
});

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
        console.error('Código de sala no válido');
        res.json({ success: false, message: 'Código de sala no válido' });
    }
});

app.post('/endGame', (req, res) => {
    const { roomCode } = req.body;
    console.log(`Intentando terminar el juego en la sala: ${roomCode}`);

    if (!roomCode) {
        console.error('Código de sala no proporcionado');
        return res.json({ success: false, message: 'Código de sala no proporcionado' });
    }

    if (rooms[roomCode]) {
        delete rooms[roomCode];
        console.log(`Sala ${roomCode} liberada`);
        res.json({ success: true, message: 'Sala liberada' });
    } else {
        console.error('La sala no existe');
        res.json({ success: false, message: 'La sala no existe' });
    }
});

wss.on('connection', (ws) => {
    console.log('Un cliente (Unity) se ha conectado');
    ws.send(JSON.stringify({ message: 'Conexión establecida con el servidor' }));

    ws.on('message', (message) => {
        console.log('Mensaje recibido de Unity:', message);
    });

    ws.on('close', () => {
        console.log('Un cliente (Unity) se ha desconectado');
    });
});

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
