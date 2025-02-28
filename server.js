const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());

let salas = {}; // Diccionario de salas activas

// 🔹 Crear una sala y devolver su código
app.get('/crear-sala', (req, res) => {
    const codigoSala = Math.random().toString(36).substr(2, 6).toUpperCase();
    salas[codigoSala] = { jugadores: [] };
    res.json({ codigo: codigoSala });
    console.log(`Sala creada: ${codigoSala}`);
});

// 🔹 Manejar conexiones de jugadores
io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`);

    // 🔹 Unirse a una sala
    socket.on('unirse-sala', (codigoSala) => {
        if (salas[codigoSala]) {
            socket.join(codigoSala);
            salas[codigoSala].jugadores.push(socket.id);
            io.to(codigoSala).emit('jugador-unido', socket.id);
            console.log(`Jugador ${socket.id} se unió a la sala ${codigoSala}`);
        } else {
            socket.emit('error', 'Sala no encontrada');
        }
    });

    // 🔹 Desconectar jugador
    socket.on('disconnect', () => {
        for (const [codigo, sala] of Object.entries(salas)) {
            sala.jugadores = sala.jugadores.filter(j => j !== socket.id);
            if (sala.jugadores.length === 0) delete salas[codigo]; // Elimina la sala si queda vacía
        }
        console.log(`Jugador desconectado: ${socket.id}`);
    });
});

// 🔹 Iniciar servidor en Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Servidor corriendo en el puerto ${PORT}`));
