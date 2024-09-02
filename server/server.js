const express = require('express');
const cors = require('cors'); 
const app = express();
const port = 3000;

/*
this server is responsible for sending informaiton
to all clients
*/

app.use(cors());

app.use(express.json());

app.post('/play', (req, res) => {

    /* 
    control that the data is valid, like name, color. etc.
    if everything is good, return an OK status back to client.
    if client doesnt receive this, then dont start the game
    on client side.
    */

    if (playerDataValid(req.body)) {
        res.send({ message: 'OK' });
        console.log(req.body.playerName, "connected");
    } else { // return a message that says data is invalid
        res.send({ message: 'INVALID' });
    }
});

app.listen(port, () => {
    console.log(`WebServer listening on port ${port}`);
});
 

/*-----------------------game----------------------*/

function playerDataValid(data){
    return true;
}

// game start
WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const server = new WebSocket.Server({ port: 8080 });
const clients = new Map();

server.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // dont bother sending entire playerlist when position update. only the uuid assocaited etc.
        if (data.type == "playerJoined") {
            console.log(data.player.name, "connected with uuid", clientId);
            this.broadcast({ // assign uuids to players usnig this 
                type: "playerJoined",
                player: data.player,
                UUID: clientId,
            })
        }
    });

    // Function to broadcast data to all clients
    function broadcast(data) {
        server.clients.forEach(client => {
            client.send(JSON.stringify(data));
        });
    }
});

console.log('GameServer is running on ws://localhost:8080');

let playerObjects = [];