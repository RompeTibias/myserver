const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));  // Carpeta donde está tu HTML

// Almacenar salas (clave: código de sala, valor: lista de jugadores)
let rooms = {};

// Crear una nueva sala (solo Unity puede hacer esto)
app.post('/createRoom', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();  // Generar un código aleatorio para la sala
    rooms[roomCode] = { players: [] };  // Inicializar la sala
    console.log(`Sala creada: ${roomCode}`);
    res.json({ roomCode });  // Enviar el código de la sala creada
});

// Unirse a una sala desde la web o desde Unity
app.post('/join', (req, res) => {
    const { roomCode, playerName } = req.body;
    
    // Si la sala existe
    if (rooms[roomCode]) {
        rooms[roomCode].players.push(playerName);  // Añadir jugador a la sala
        console.log(`${playerName} se unió a la sala ${roomCode}`);
        res.json({ success: true, players: rooms[roomCode].players });
    } else {
        res.json({ success: false, message: 'Código de sala no válido' });
    }
});

// Finalizar la partida y liberar la sala
app.post('/endGame', (req, res) => {
    const { roomCode } = req.body;

    // Eliminar la sala del registro
    if (rooms[roomCode]) {
        delete rooms[roomCode];
        console.log(`Sala ${roomCode} liberada`);
        res.json({ success: true, message: 'Sala liberada' });
    } else {
        res.json({ success: false, message: 'La sala no existe' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
