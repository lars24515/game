const express = require('express');
const cors = require('cors');

class WebServer {
    constructor(port) {
        this.app = express();
        this.port = port;

        this.app.use(cors());
        this.app.use(express.json());

        this.setupRoutes();
    }

    setupRoutes() {
        this.app.post('/play', (req, res) => {
            this.handlePlayRequest(req, res);
        });
    }

    handlePlayRequest(req, res) {
        if (this.playerDataValid(req.body)) {
            res.send({ message: 'OK' });
            console.log(req.body.playerName, " CONNECTION OK");
        } else { // return a message that says data is invalid
            res.send({ message: 'INVALID' });
        }
    }

    playerDataValid(data){
        return true;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`WebServer listening on port ${this.port}`);
        });
    }
}

const server = new WebServer(3000);
server.start();

/*-----------------------game----------------------*/

const worldSeed = Math.floor(Math.random() * 1000000).toString();


// game start
WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const worldSize = 2000;
const tileSize = 64;
const chunkSize = 16;
const noiseScale = 0.035;


class Network{
    constructor(port){  
        this.server = new WebSocket.Server({ port: port });
        console.log('GameServer is running on ws://localhost:8080');
        this.clients = new Map();
        this.playerObjects = {}; // UUID : PLAYEROBJ
        this.LCG_MODULUS = 2147483647;


        this.server.on('connection', (ws) => {
            const clientId = uuidv4();
            this.clients.set(clientId, ws);

            ws.on("close", () => {
                this.clients.delete(clientId);
                this.removePlayer(clientId);
                console.log("Client disconnected: ", clientId);
                this.broadcast({
                    type: "playerLeave",
                    UUID: clientId
                })
            });
        
            ws.on('message', (message) => {
               //  console.log(message.toString()); 
                const data = JSON.parse(message);  

                switch (data.type) {
                    case "updatePlayer":
                        // update a specific players' property
                        
                        switch (data.property) {
                            case "position":
                                //console.log("received playerPosition from", data.UUID);
                                this.updatePlayerPosition(data);
                                break;
                            case "holding":
                               // console.log("received playerHolding from", data.UUID);

                               // forward to players
                                this.broadcast({
                                    UUID: data.UUID,
                                    type: "updatePlayer",
                                    property: "holding",
                                    value: data.value,
                                })
                                break;
                            // other properties as well
                        }
                        break;

                    case "playerJoined":
                        console.log(data.player.name, "connected with uuid", clientId);
                        this.broadcast({ // assign UUIDs to players using this 
                            type: "playerJoined",
                            player: data.player,
                            UUID: clientId,
                        });

                        // now that we've told other clients to add to playelist
                        // server needs to as well

                        // SEND EXISTING PLAYERLIST TO NEW PLAYER.

                        // do not send playerlist with self incldued
                        ws.send(JSON.stringify({
                            type: "playerList",
                            playerList: this.playerObjects,
                        }))
                        console.log("sent playerlist", this.playerObjects);
                        
                        
                        this.addPlayer(data.player, clientId);

                        // send world seed to client joined
                        //*
                        console.log("sending word seed", worldSeed);
                        ws.send(JSON.stringify({
                            type       : "worldSeed",
                            seed       : worldSeed,
                            tileSize   : tileSize,
                            chunkSize  : chunkSize,
                            worldSize  : worldSize,
                            natureSeed : Math.floor(Math.random() * this.LCG_MODULUS),
                            noiseScale : noiseScale,

                        }));                        
                        //*/
                        console.log("done with client setup");

                        // updaetTile(position) upon mining tree

                        break;
                    
                    default:
                        console.log("Unknown message type:", data.type);
                        break;
                }
    
            });
        
            
        });
    }

    updatePlayerPosition(data){
      //  console.log(this.playerObjects); // debug
        // const playerIndex = this.playerObjects[data.UUID];

      //  console.log("UUID =", data.UUID);
      //  console.log("playerList =", this.playerObjects);

        const playerIndex = this.playerObjects[data.UUID];

        playerIndex.x = data.x;
        playerIndex.y = data.y;
        // done updating server playerlist, time to update the other clients as well

        this.broadcast({
            type: "updatePlayer",
            UUID: data.UUID,
            property: "position",
            x: data.x,
            y: data.y,
            angle: data.angle,
        });
        // done

    }

    removePlayer(UUID) {
        delete this.playerObjects[UUID];
        console.log(`removed ${UUID} from playerlist.`);
    }

    addPlayer(player, UUID) {
        this.playerObjects[UUID] = player;
        console.log("playerList updated: ", this.playerObjects);
    }


    broadcast(data) { // send data to all clients
        this.server.clients.forEach(client => {
            client.send(JSON.stringify(data)); 
        });
    }

    
}

network = new Network(8080);

// World generation
/*
Go about this by having a grid or something in an array. 
Track all playerObj coordinates, and if any of those coordinates*tileSize.x || .y > any existing tiles in the grid, generate a new chunk.
something like tat.

Or constatly check viewport and if tile position is anyhting near, generate a new chunk 
same with unloading

*/

// GENERATE GRID USING PERIN NOISE,

// MAKE ARRAY FROM PERLIN NOISE

// SEND TO ALL CLIENTS

// HANDLING ON CLIENT INSTEAD***********'