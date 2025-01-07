const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs'); // Para verificar la existencia de archivos
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {}; // Contendrá las salas y sus jugadores

// Lista de minijuegos disponibles
const miniGames = [
    { name: "Rinon", scene: "RinonScene", minPlayers: 4, maxPlayers: 8 }
];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para crear una nueva sala
app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = { players: [], characters: {}, lastActivity: Date.now(), gameStarted: false };
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
        if (rooms[roomCode].players.length >= 3 && !rooms[roomCode].gameStarted) {
            const message = JSON.stringify({
                type: 'playersReady',
                roomCode: roomCode
            });

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

// Endpoint para guardar el personaje seleccionado por un jugador
app.post('/saveCharacter', (req, res) => {
    const { roomCode, playerName, character } = req.body;

    if (!roomCode || !playerName || !character) {
        return res.json({ success: false, message: 'Datos incompletos' });
    }

    const room = rooms[roomCode];
    if (!room) {
        return res.json({ success: false, message: 'Sala no encontrada' });
    }

    if (Object.values(room.characters).includes(character)) {
        return res.json({ success: false, message: 'Este personaje ya está en uso' });
    }

    room.characters[playerName] = character;
    console.log(`${playerName} ha seleccionado el personaje ${character} en la sala ${roomCode}`);

    const message = JSON.stringify({
        type: 'playerCharacterSelected',
        playerName: playerName,
        character: character,
        roomCode: roomCode
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    res.json({ success: true, message: 'Personaje seleccionado correctamente' });
});

// Endpoint para finalizar el juego y liberar la sala
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

// WebSocket para la comunicación con Unity
wss.on('connection', (ws) => {
    console.log('Un cliente (Unity) se ha conectado');
    ws.send(JSON.stringify({ message: 'Conexión establecida con el servidor' }));

    ws.on('message', (message) => {
        console.log('Mensaje recibido de Unity:', message);
        try {
            const data = JSON.parse(message);

            if (data.type === 'miniGameSelected') {
                const { roomCode, miniGame } = data;

                if (!rooms[roomCode]) {
                    console.error(`Sala ${roomCode} no encontrada.`);
                    return;
                }

                const room = rooms[roomCode];
                const validGame = miniGames.find(game => game.name === miniGame);

                if (!validGame) {
                    console.error(`Minijuego ${miniGame} no válido.`);
                    return;
                }

                // Verificar y buscar el archivo HTML del minijuego
                const miniGamePath = path.join(__dirname, 'public', 'minijuegos', `${validGame.name}.html`);
                if (!fs.existsSync(miniGamePath)) {
                    console.error(`Archivo HTML para ${validGame.name} no encontrado en ${miniGamePath}.`);
                    return;
                }

                // Actualizar la información del juego en la sala
                room.gameStarted = true;

                // Usar la ruta corregida
                const gameHtmlPath = path.join('/minijuegos', `${validGame.name}.html`);

                // Redirigir a los jugadores al HTML del minijuego
                const redirectMessage = JSON.stringify({
                    type: 'redirectToMiniGame',
                    miniGamePath: gameHtmlPath
                });

                // Enviar el mensaje a todos los jugadores en la sala para redirigirlos al minijuego
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(redirectMessage);
                    }
                });

                console.log(`Minijuego ${validGame.name} seleccionado. Los jugadores serán redirigidos a: ${gameHtmlPath}`);
            }
        } catch (err) {
            console.error('Error procesando mensaje WebSocket:', err.message);
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
