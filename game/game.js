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
            { type: "Grass", threshold: 0.1, key: "grass" },        // Most common
            { type: "Water", threshold: 0.3, key: "water" },        // Some water bodies
            { type: "Bush", threshold: 0.35, key: "bush" },         // Few bushes
            { type: "Mountain", threshold: 0.32, key: "mountain" },  // Some mountains
            { type: "Tree", threshold: 0.15, key: "tree" },          // Some trees, not excessive
            { type: "Stone", threshold: 0.5, key: "stone" },            // 1/3 as many rocks as trees
            { type: "Sand", threshold: 0.6, key: "sand" }     
        ];
        
        this.seed = null;
        this.world = [];
        this.playerEvents = new Phaser.Events.EventEmitter();
    }

    preload() {
        // Load tile images

        // player
        this.load.image("player", "../assets/player/still.png")
 
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
        this.load.image("sand", "../assets/resources/sand.png");
        this.load.image("stone", "../assets/resources/stone.png");
        this.load.image("bush", "../assets/resources/bush.png");
        this.load.image("flower", "../assets/resources/flower.png");
        console.log("Preloaded assets");
    }

    create() {
        this.localPlayer = new Player(username, "blue", this, this.physics.add.sprite(100, 450, 'player').setOrigin(0.5, 0.5));
        this.localPlayer.sprite.setDepth(5);
        this.localPlayer.sprite.setScale(0.5)
        this.playerEvents.on('move', this.localPlayer.onPlayerMove.bind(this.localPlayer));

        // camera

        this.cameras.main.setBounds(0, 0, this.worldSize * this.tileSize, this.worldSize * this.tileSize); // Set bounds to match world size
        this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.1, 0.1); // Smooth follow



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

    handleMovement(){
        if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
            this.localPlayer.move();
        }
    }

    update() {
        this.cameras.main.setBackgroundColor(0x25BE4B);
        this.localPlayer.update(); // for methods such as calculating cursor position, etc.

        // Handle movement keys
        this.handleMovement(); // cleaner

        

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
                //console.log("Tile: " + tileKey + " at (" + x + ", " + y + ")");
    
               
                if (tileKey === "grass") {
                    this.add.image(x * this.tileSize, y * this.tileSize, this.getRandomElement(this.grassTextures)).setOrigin(0, 0);
                } else if (tileKey == "tree") {
                    this.add.image(x * this.tileSize, y * this.tileSize, tileKey).setOrigin(0, 1);
                } else {
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
            case "Stone": return "stone";
            case "Sand": return "sand";
            default: return "grass"; // Default to grass if the type isn't recognized
        }
    }

    /*
    moveWorld(xOffset, yOffset) {
        for (let x = 0; x < this.worldSize; x++) {
            console.log("for");
            for (let y = 0; y < this.worldSize; y++) {
                console.log("const tile");
                const tile = this.world[x][y];
                console.log("moving tile", tile);   

                if (tile.sprite) {
                    tile.sprite.x += xOffset;
                    tile.sprite.y += yOffset;
                    console.log("moved tile", tile.sprite);
                }
            }
        }
        //console.log("moved world");
    }
        */
    
}


class Player {
    constructor(name, color, scene, sprite) {
        this.name = name;
        this.color = color;
        this.scene = scene;
        this.velocity = 150;
        this.UUID = null;
        this.angleOffset = -90; // for some reason i need this
        this.sprite = sprite;

        // Server object
        this.playerObject = {
            name: name,
           // color: color,
            x: 0,
            y: 0,
         //   facing: "",
          //  holding: "",
        };
    }

    calculateHandAngle(scene) {
        let pointer = scene.input.activePointer;
        let mouseX = pointer.worldX;
        let mouseY = pointer.worldY;

        let angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, mouseX, mouseY);
        let angleInDegrees = Phaser.Math.RadToDeg(angle);
        //console.log(angleInDegrees);
        return angleInDegrees;
    }

    renderPlayerHand(angle){
        this.sprite.angle = angle-this.angleOffset;
        // set player origin to 0,0 so it rotates aorund itself instead of bottom (!)
        // REWRITE MOVEMENT SYSTEM

        /*

        player movement system:

        when moving: change all tile position by -player.velocity in player.angle direction.
        update player object (and server) with new position ONLY using player.velocity.

        */

    }

    update() {
        this.renderPlayerHand(this.calculateHandAngle(this.scene));
        if (!this.scene.wasdKeys.up.isDown) {
            this.sprite.setVelocity(0, 0);
        }
    }

    onPlayerMove() {
        this.playerObject.x = this.sprite.x;
        this.playerObject.y = this.sprite.y;
        let angle = this.sprite.angle;

        let data = {
            UUID: this.UUID, // is this undefined? cant be?
            type: 'updatePlayer',
            property: "position",
            x: this.sprite.x,
            y: this.sprite.y,
            angle: angle,
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

    move() {
        let angleInRadians = Phaser.Math.DegToRad(this.sprite.angle + this.angleOffset);

        let deltaX = Math.cos(angleInRadians) * this.velocity;
        let deltaY = Math.sin(angleInRadians) * this.velocity;

       // this.scene.moveWorld(-deltaX, -deltaY);
        //console.log("moved worl");

        this.sprite.setVelocity(deltaX, deltaY);


        this.onPlayerMove();
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
                
                case "playerList":
                    /*
                    for otherPlayer in data.playerList:
                        if otherPlayer.UUID not in this.gameScene.playerList:
                            this.handlePlayerJoined(otherPlayer);
                     */

                    for (let key in data.playerList) {
                        const value = data.playerList[key];
                       // console.log("key =", key);
                      //  console.log("value =", data.playerList[key]);

                        // if not UUID (key) in playerList, run
                        // handlePlayerJoined on player object
                        if (!this.gameScene.playerList[key]) {
                            this.handlePlayerJoined(key, value);
                        }

                    }

                    break;
                case "playerLeave":
                    delete this.gameScene.playerList[data.UUID];
                    console.log("Player with UUID: " + data.UUID + " left.");
                    break;
                case "updatePlayer":
                    if (data.UUID == this.gameScene.localPlayer.UUID) return;
                    if (data.property == "position") {
                        this.updatePlayerPosition(data);
                    }
                    break;
                case "playerJoined":

                    // make sure player isnt itself, and if it is, retreive UUID from it.
                    if (data.player.name == this.gameScene.localPlayer.name) {
                        this.gameScene.localPlayer.UUID = data.UUID; // set self UUID
                        return; // no further inquiries
                    }

                // player is someone else than itself, check if it already exists in list

                    if (this.gameScene.playerList[data.UUID]){
                        console.log("Player with UUID: " + data.UUID + " already exists.");
                        return;
                    }; //player exists

                    // player didnt exist, so handle the player join

                    this.handlePlayerJoined(data.UUID, data.player);
                    
                    break;
                default:
                    console.log("Unknown message type:", data.type);
                    break;
            }
        }.bind(this);
    }

    updatePlayerPosition(data){
      //  console.log(this.gameScene.playerList);
        this.gameScene.playerList[data.UUID].sprite.x = data.x;
        this.gameScene.playerList[data.UUID].sprite.y = data.y;
        this.gameScene.playerList[data.UUID].sprite.angle = data.angle;
       // console.log("updated player position: ", data.UUID);
    }

    createSprite(origin, scale, image){
        let sprite = this.gameScene.physics.add.sprite(100, 100, image);
        sprite.setOrigin(origin, origin);
        sprite.setScale(scale);
        sprite.setDepth(10);
        return sprite;
    }

    handlePlayerJoined(UUID, playerObject) {

        // Create a sprite for the new player and add to sprite playergroup
        let newPlayerSprite = this.createSprite(0.5, 0.5, "player");
        this.gameScene.players.add(newPlayerSprite);
        // Add the new player to local playerlist
        this.gameScene.playerList[UUID] = {
            sprite: newPlayerSprite,
            name: playerObject.name,
            UUID: UUID,
            x: playerObject.x,
            y: playerObject.y,
            angle: 0,
        };
    
        console.log("Player joined: ", playerObject.name, "with UUID:", UUID);
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

        // Ensure the hotbar is drawn above the map
        this.graphics.setDepth(10);  // A higher depth value for the hotbar
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
