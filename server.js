const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Ruta para manejar solicitudes a la raíz
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
