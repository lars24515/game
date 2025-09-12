const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

/*----------------------------------------
  EXPRESS WEB SERVER
----------------------------------------*/
class WebServer {
    constructor(port) {
        this.app = express();
        this.port = port;

        this.app.use(cors());
        this.app.use(express.json());

        // Serve static files from /public
        this.app.use(express.static(path.join(__dirname, '../public')));

        this.setupRoutes();
    }

    setupRoutes() {
        // POST endpoint for /play
        this.app.post('/play', (req, res) => {
            this.handlePlayRequest(req, res);
        });

        // GET /play serves an HTML page
        this.app.get('/play', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/play.html'));
        });
    }

    handlePlayRequest(req, res) {
        if (this.playerDataValid(req.body)) {
            res.send({ message: 'OK' });
            console.log(req.body.playerName, " CONNECTION OK");
        } else {
            res.send({ message: 'INVALID' });
        }
    }

    playerDataValid(data){
        // Add real validation later
        return data && data.playerName && data.playerName.length > 0;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`WebServer listening on port ${this.port}`);
        });
    }
}

/*----------------------------------------
  WEBSOCKET GAME SERVER
----------------------------------------*/
class Network {
    constructor(port){  
        this.server = new WebSocket.Server({ port });
        console.log('GameServer is running on ws://localhost:' + port);
        this.clients = new Map();
        this.playerObjects = {}; // UUID : PLAYEROBJ

        this.worldSeed = Math.floor(Math.random() * 1000000).toString();
        this.LCG_MODULUS = 2147483647;
        this.natureSeed = Math.floor(Math.random() * this.LCG_MODULUS);

        this.worldSize = 4000;
        this.tileSize = 64;
        this.chunkSize = 16;
        this.noiseScale = 0.02;

        this.setupConnections();
    }

    setupConnections() {
        this.server.on('connection', (ws) => {
            const clientId = uuidv4();
            this.clients.set(clientId, ws);

            ws.on("close", () => {
                this.clients.delete(clientId);
                this.removePlayer(clientId);
                this.broadcast({ type: "playerLeave", UUID: clientId });
                console.log("Client disconnected: ", clientId);
            });

            ws.on('message', (message) => {
                const data = JSON.parse(message);

                switch (data.type) {
                    case "updatePlayer":
                        if (data.property === "position") this.updatePlayerPosition(data);
                        if (data.property === "holding") {
                            this.broadcast({ UUID: data.UUID, type: "updatePlayer", property: "holding", value: data.value });
                        }
                        break;

                    case "playerJoined":
                        this.handlePlayerJoined(ws, data, clientId);
                        break;

                    default:
                        console.log("Unknown message type:", data.type);
                }
            });
        });
    }

    handlePlayerJoined(ws, data, clientId) {
        console.log(data.player.name, "connected with uuid", clientId);

        // Broadcast new player to all
        this.broadcast({ type: "playerJoined", player: data.player, UUID: clientId });

        // Send existing player list to the new client
        ws.send(JSON.stringify({ type: "playerList", playerList: this.playerObjects }));

        // Add player to server list
        this.addPlayer(data.player, clientId);

        // Send world seed and config
        ws.send(JSON.stringify({
            type: "worldSeed",
            seed: this.worldSeed,
            tileSize: this.tileSize,
            chunkSize: this.chunkSize,
            worldSize: this.worldSize,
            natureSeed: this.natureSeed,
            noiseScale: this.noiseScale,
        }));
    }

    updatePlayerPosition(data){
        const player = this.playerObjects[data.UUID];
        if (!player) return;

        player.x = data.x;
        player.y = data.y;

        this.broadcast({
            type: "updatePlayer",
            UUID: data.UUID,
            property: "position",
            x: data.x,
            y: data.y,
            angle: data.angle,
        });
    }

    removePlayer(UUID) {
        delete this.playerObjects[UUID];
        console.log(`removed ${UUID} from playerlist.`);
    }

    addPlayer(player, UUID) {
        this.playerObjects[UUID] = player;
        console.log("playerList updated: ", this.playerObjects);
    }

    broadcast(data) {
        this.server.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
}

/*----------------------------------------
  START SERVERS
----------------------------------------*/
const webServer = new WebServer(25565);
webServer.start();

const network = new Network(8080);
