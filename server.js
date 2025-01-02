wss.on("connection", (ws) => {
    console.log("Nuevo cliente conectado.");

    ws.on("message", (message) => {
        console.log("Mensaje recibido:", message.toString());

        // Responde siempre con un mensaje fijo
        const response = JSON.stringify({ action: "test-response", message: "Servidor activo" });
        console.log("Enviando mensaje a cliente:", response);

        ws.send(response);
    });

    // Mensaje inicial al cliente
    ws.send("Conexión establecida con el servidor");
});

