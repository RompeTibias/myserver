const express = require('express');
const path = require('path');
const app = express();

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para servir la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia el servidor
const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`Servidor en funcionamiento en el puerto ${port}`);
});
