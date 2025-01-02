const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));  // Carpeta donde está tu HTML

// Almacenar salas (clave: código de sala, valor: lista de jugadores)
let rooms = {};

// Crear una nueva sala
app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();  // Generar un código aleatorio para la sala
    rooms[roomCode] = { players: [] };  // Inicializar la sala
    res.json({ roomCode });
});

// Unirse a una sala
app.post('/join', (req, res) => {
    const { roomCode, playerName } = req.body;
    
    // Si la sala existe y tiene espacio
    if (rooms[roomCode]) {
        if (rooms[roomCode].players.length < 4) {  // Limite de jugadores en la sala (por ejemplo, 4)
            rooms[roomCode].players.push(playerName);
            res.json({ success: true, message: 'Unido a la sala' });
        } else {
            res.json({ success: false, message: 'La sala está llena' });
        }
    } else {
        res.json({ success: false, message: 'Código de sala no válido' });
    }
});

// Liberar una sala después de la partida
app.post('/endGame', (req, res) => {
    const { roomCode } = req.body;

    // Eliminar la sala del registro
    if (rooms[roomCode]) {
        delete rooms[roomCode];
        res.json({ success: true, message: 'Sala liberada' });
    } else {
        res.json({ success: false, message: 'La sala no existe' });
    }
});

// Obtener el estado de las salas
app.get('/rooms', (req, res) => {
    res.json(rooms);
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
