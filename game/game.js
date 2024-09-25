function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var username = getUrlParameter('username');

/*

-- server

assetPaths = {
    "grass": {
            0: "../assets/resources/grass/0.png",
            1: "../assets/resources/grass/1.png",
        },
    "mountain": "../assets/resources/mountain.png",
}

forEach(folder in fs.readdir("../assets/"))
    for (file in fs.readdir(folder)){
        assetPaths[folderName][i] = file.path
    }

when "./get-assets" is called:
return assetPaths

-- client

getassets(serverURL:8080/get-assets);

let assets = {};

function getAssets(data){
    for (folder in data.assets){
        assets{folderName} = {}; //--> empty object for all paths
        for (file in data.assets[folder]){
            assets[folderName][file] = phaser.load(image, file.name)
        }
    } 
}

*/

// Define the Game class first
class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        this.localPlayer = null;
        this.players = null;
        this.playerList = {};
        this.worldSize = 50;
        this.chunkSize = 16;
        this.tileSize = 32; // Adjust based on your tile images
        this.possibleTiles = [
            { type: "Grass", threshold: 0.3, key: "grass" },
            { type: "Rock", threshold: 0.5, key: "rock" },
            { type: "Bush", threshold: 0.4, key: "bush" },
            { type: "Mountain", threshold: 0.6, key: "mountain" },
            { type: "Tree", threshold: 0.8, key: "tree" },
            { type: "Water", threshold: 1.0, key: "water" }
        ];
        this.seed = null;
        this.world = [];
        this.playerEvents = new Phaser.Events.EventEmitter();
    }

    preload() {
        // Load tile images

        

        this.load.image("grass0", "../assets/resources/grass/0.png");
        this.load.image("grass1", "../assets/resources/grass/1.png");
        this.load.image("grass2", "../assets/resources/grass/2.png");
        this.load.image("grass3", "../assets/resources/grass/3.png");
        this.load.image("grass4", "../assets/resources/grass/4.png");
        this.load.image("grass5", "../assets/resources/grass/5.png");
        this.load.image("grass6", "../assets/resources/grass/6.png");


        this.load.image("mountain", "../assets/resources/mountain.png");
        this.load.image("tree", "../assets/resources/forest.png");
        this.load.image("water", "../assets/resources/water.png");
        console.log("Preloaded assets");
    }

    create() {
        this.localPlayer = new Player(username, "blue", this);
        this.playerEvents.on('move', this.localPlayer.onPlayerMove.bind(this.localPlayer));

        // textures

        this.grassTextures = [
            "grass0",
            "grass1",
            "grass2",
            "grass3",
            "grass4",
            "grass5",
            "grass6",
        ];

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.players = this.physics.add.group();
        this.hotbar = new Hotbar(this);
        this.hotbar.render();
        console.log("Created game assets");

        // Initialize Network after game creation
        window.network = new Network(this); // Pass this scene to Network
    }

    update() {
        this.cameras.main.setBackgroundColor(0x25BE4B);

        // Handle movement keys
        if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
            this.localPlayer.moveLeft();
        } else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
            this.localPlayer.moveRight();
        }

        if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
            this.localPlayer.moveUp();
        } else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
            this.localPlayer.moveDown();
        }

        if (this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown ||
            this.wasdKeys.left.isDown || this.wasdKeys.right.isDown || this.wasdKeys.up.isDown || this.wasdKeys.down.isDown) {
            this.playerEvents.emit('move');
        }

        this.hotbar.render();
    }

    generateWorld(seed) {
        var noiseGenerator = new SimplexNoise(seed);
        console.log("created noise map with seed", seed);

        for (let x = 0; x < this.worldSize; x++) {
            this.world[x] = [];
            for (let y = 0; y < this.worldSize; y++) {
                let noiseValue = noiseGenerator.noise2D(x / this.worldSize, y / this.worldSize);
                let tileType = this.getTileType(noiseValue);
                this.world[x][y] = tileType;
            }
        }
        console.log("World successfully generated");
        return this.world;
    }

    getTileType(noiseValue) {
        let normalizedValue = (noiseValue + 1) / 2;
        for (let tile of this.possibleTiles) {
            if (normalizedValue <= tile.threshold) {
                return tile.type;
            }
        }
    }

    getRandomElement(array) {
        const randomIndex = Phaser.Math.Between(0, array.length - 1);
        return array[randomIndex];
    }

    createMap() {
        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                let tileType = this.world[x][y];
                let tileKey = this.getTileKey(tileType);
    
               
                if (tileKey === "grass") {
                    this.add.image(x * this.tileSize, y * this.tileSize, this.getRandomElement(this.grassTextures)).setOrigin(0, 0);
                } else{
                    this.add.image(x * this.tileSize, y * this.tileSize, tileKey).setOrigin(0, 0);
                }

            }
        }
    }
    
    getTileKey(type) {
        // Map tile type to the corresponding image key
        switch (type) {
            case "Grass": return "grass";
            case "Mountain": return "mountain";
            case "Tree": return "tree";
            case "Water": return "water";
            default: return "grass"; // Default to grass if the type isn't recognized
        }
    }
    
}


class Player {
    constructor(name, color, scene) {
        this.name = name;
        this.color = color;
        this.scene = scene;
        this.velocity = 100;
        this.UUID = null;
        this.sprite = null;

        // Server object
        this.playerObject = {
            name: name,
            color: color,
            x: 0,
            y: 0,
            facing: "",
            holding: "",
        };
    }

    calculateHandAngle(scene) {
        let pointer = scene.input.activePointer;
        let mouseX = pointer.worldX;
        let mouseY = pointer.worldY;

        let angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, mouseX, mouseY);
        let angleInDegrees = Phaser.Math.RadToDeg(angle);
        console.log(angleInDegrees);
    }

    update() {
        this.calculateHandAngle(this.scene);
    }

    onPlayerMove() {
        this.playerObject.x = this.sprite.x;
        this.playerObject.y = this.sprite.y;
        this.playerObject.facing = this.sprite.facing;
        this.playerObject.holding = this.sprite.holding;

        let data = {
            UUID: this.UUID,
            type: 'updatePlayer',
            property: "position",
            x: this.sprite.x,
            y: this.sprite.y,
            facing: this.playerObject.facing,
        };
        network.send(JSON.stringify(data));
    }

    /**
    when player moves, make the world move around him instead.
    though his position will be updated accoring to his "movement", so it will be displayed on 
    other clients as if he is moving across the world. (the world will only move for them when they themselves move.)
    repeat

    error now when you move sinsce scprite or something isnt declaed or whatever.

    use custom loaction stuff and click detection or just use sprite class?
    handle sprite groups and collisions

    upon exchaning position infromation, update player positions on eahc othres' client

     */

    moveLeft() {
        this.sprite.setVelocityX(-160);
    }

    moveRight() {
        this.sprite.setVelocityX(160);
    }

    moveUp() {
        this.sprite.setVelocityY(-160);
    }

    moveDown() {
        this.sprite.setVelocityY(160);
    }

    stop() {
        this.sprite.setVelocity(0);
    }
}

class Network {
    constructor(gameScene) {
        this.gameScene = gameScene;
        this.socket = new WebSocket('ws://localhost:8080');
        this.socket.onopen = function(event) {
            console.log('Connected to WebSocket server');
            const data = JSON.stringify({
                type: "playerJoined",
                player: this.gameScene.localPlayer.playerObject, // Access the playerObject from the game scene
            });
            this.send(data);
            console.log("Sent playerJoined from client");
        }.bind(this);

        this.socket.onclose = function(event) {
            console.log('Disconnected from WebSocket server');
            window.location.href = "../src/index.html";
        };

        this.socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case "worldSeed":
                    const seed = data.seed;
                    console.log("received seed: " + seed + " from server");
                    console.log("generating world with seed: " + seed);
                    this.gameScene.generateWorld(seed);
                    this.gameScene.createMap(); // Create the tilemap from generated world data
                    break;
                case "playerLeave":
                    delete this.gameScene.playerList[data.UUID];
                    console.log("Player with UUID: " + data.UUID + " left.");
                    break;
                case "updatePlayer":
                    if (data.UUID == this.gameScene.localPlayer.UUID) return;
                    if (data.property == "position") {
                        this.gameScene.playerList[data.UUID].x = data.x;
                        this.gameScene.playerList[data.UUID].y = data.y;
                        console.log(`Updated ${data.player.name}'s position to: ${data.x}, ${data.y}`);
                    }
                    break;
                case "playerJoined":
                    if (data.player.name == this.gameScene.localPlayer.name) {
                        this.gameScene.localPlayer.UUID = data.UUID;
                        console.log("My UUID is: " + this.gameScene.localPlayer.UUID);
                        return;
                    }
                    this.handlePlayerJoined(data);
                    break;
                default:
                    console.log("Unknown message type:", data.type);
                    break;
            }
        }.bind(this);
    }

    handlePlayerJoined(data) {
        this.gameScene.playerList[data.UUID] = data.player;
        console.log("Player joined: " + data.player.name + " with UUID: " + data.UUID);
    }

    send(data) {
        this.socket.send(data);
    }
}

class Hotbar {
    constructor(scene) {
        this.scene = scene;
        this.graphics = this.scene.add.graphics();
        this.padding = 50;
        this.xPadding = 40;
        this.items = {};
        this.selectedSlot = 0;
        this.slotSize = 32;
        this.itemSize = 25;
        this.maxSlotCount = 9;
    }

    selectSlot(slot) {
        this.selectedSlot = slot;
    }

    renderSelectedSlot() {
        this.graphics.fillStyle(0xFFFFFF, 0.1);
        this.graphics.fillRect(this.selectedSlot * this.xPadding + this.padding - 5, 35, this.slotSize + 10, this.slotSize + 10);
    }

    renderSquare(x) {
        this.graphics.fillStyle(0x000000, 0.1);
        this.graphics.fillRect(this.padding + x, 40, this.slotSize, this.slotSize);
    }

    render() {
        this.graphics.clear();
        for (let i = 0; i < this.maxSlotCount; i++) {
            this.renderSelectedSlot();
            this.renderSquare(i * this.xPadding);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Game] // Register the Game class here
};

// Initialize the Phaser game instance
const game = new Phaser.Game(config);
