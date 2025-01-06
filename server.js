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

// Lista de minijuegos disponibles
const miniGames = [
    { name: "Rinon", scene: "RinonScene", minPlayers: 4, maxPlayers: 8 }
];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar una sala
function initializeRoom(roomCode) {
    rooms[roomCode] = {
        players: [],
        characters: {},
        lastActivity: Date.now(),
        gameStarted: false, // Nuevo estado
        currentGame: null,  // Información del minijuego actual
    };
}

// Endpoint para crear una nueva sala
app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    initializeRoom(roomCode);
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
        res.json({ success: true, players: rooms[roomCode].players });
    } else {
        console.error('Código de sala no válido');
        res.json({ success: false, message: 'Código de sala no válido' });
    }
});

// Endpoint para obtener la información de la sala
app.get('/getRoomInfo', (req, res) => {
    const { roomCode } = req.query;
    const room = rooms[roomCode];

    if (room) {
        res.json({
            success: true,
            players: room.players,
            characters: room.characters,
            gameStarted: room.gameStarted,
            currentGame: room.currentGame,
            scene: room.currentGame?.scene || null,
        });
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

    // Verificar si el personaje ya está ocupado
    if (Object.values(room.characters).includes(character)) {
        return res.json({ success: false, message: 'Este personaje ya está en uso' });
    }

    // Asignar el personaje al jugador
    room.characters[playerName] = character;
    console.log(`${playerName} ha seleccionado el personaje ${character} en la sala ${roomCode}`);
    res.json({ success: true, message: 'Personaje seleccionado correctamente' });
});

// Elegir un minijuego para la sala
function chooseMiniGameForRoom(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.gameStarted) {
        console.log(`Minijuego ya iniciado para la sala ${roomCode}.`);
        return;
    }

    const playerCount = room.players.length;
    const availableGames = miniGames.filter(
        game => playerCount >= game.minPlayers && playerCount <= game.maxPlayers
    );

    if (availableGames.length > 0) {
        const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
        room.gameStarted = true;
        room.currentGame = randomGame;
        room.lastActivity = Date.now();

        const message = JSON.stringify({
            type: 'startGame',
            game: randomGame.name,
            scene: randomGame.scene,
            players: playerCount
        });

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });

        console.log(`Minijuego iniciado: ${randomGame.name} para la sala ${roomCode}`);
    } else {
        console.log(`No hay minijuegos disponibles para la sala ${roomCode}.`);
    }
}

// Verificar y comenzar el minijuego si es necesario
function checkAndStartMiniGame(roomCode) {
    const room = rooms[roomCode];
    if (room && room.players.length >= 3) {
        chooseMiniGameForRoom(roomCode);
    }
}

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

// Ejecutar la función para iniciar minijuegos periódicamente
setInterval(() => {
    for (const roomCode in rooms) {
        checkAndStartMiniGame(roomCode);
    }
}, 5000);

server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
