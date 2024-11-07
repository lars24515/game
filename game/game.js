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

-- animals

randomly created on the server at random positions
created together with a seed that determines their behaviour (?)

maybe process their behaviour (movement) randomly on the server and
just send the new positions to the clients

if you interact with the animal on the client, send an event to the server
and index which client is (killed?) and handle it serverside animal array

-------- animals

- food

sheep
pig
cow
elephant

- utility
horse  (ride?)

- predator
wolves
bear

---- building

create new index on server for placed blocks.
and update all clients according to it.

make some blocks only placable on some types of tiles.

-- more animals

const animalProperties = {
    "sheep": {
        "healthPoints": 5,
        "velocity": 3,
        "behaviour": "flee", // flee, passive, aggressive
        "possibleDrops" [
            "wool",
            "meat",
        ]
    }
}

function getRandomDrop(animal){
    const drops = animalProperties[animal].possibleDrops;
    const randomIndex = Math.floor(Math.random() * drops.length);
    return drops[randomIndex];
}

class Animal{
    constructor(type, x, y){
        this.type = type;
        this.x = x;
        this.y = y;
        this.healthPoints = animalProperties[type].healthPoints;
        this.velocity  = animalProperties[type].velocity;
        this.behaviour = animalProperties[type].behaviour;
        this.possibleDrops = animalProperties[type].possibleDrops;
    }

    drop(){
        network.send("{
        type: "drop",
        items: getRandomDrop(this.type),
        x: this.x,
        y: this.y
        }
        ")
    }
}

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



ideer


sykdommer, % sjanse å få fra å gjøre forskjellige ting, som å drikke ukokt vann.

*/

const LCG_MODULUS = 2147483647;

// Define the Game class first
class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        this.localPlayer = null;
        this.players = null;
        this.playerList = {};
        this.worldSize = null;
        this.staticImageSize = 32;
        this.staticImageDepth = 20; // should be above most other images.. maybe create a map list for this sometime?
        this.chunkSize = null;
        this.tileSize = null; // Adjust based on your tile images
        this.OthersOffsetDistance = 32;
        this.OthersAngleOffset = -90;
        this.seed = null;
        this.world = [];
        this.playerEvents = new Phaser.Events.EventEmitter();
        this.natureSeed = null;
        this.UIDepth = 10;
      //  this.randomTileGenerator = null;
    }

    seedRandom(seed) {
        let value = seed;
        return function() {
            value = (value * 16807) % LCG_MODULUS;  // Use the LCG_MODULUS variable here
            return (value - 1) / (LCG_MODULUS - 1); // Normalize the value to a float between 0 and 1
        };
    }

    preload() {
        // player sprite sheet
        this.load.spritesheet("playerSpriteSheet", "../assets/player/spritesheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("greenTreeSpriteSheet", "../assets/resources/tree_spritesheet.png", {
            frameWidth: 45,
            frameHeight: 76,
        });

        // player
        this.load.image("player", "../assets/player/new still.png");
        this.load.image("playerHolding", "../assets/player/holding.png");
 
        this.load.image("grass0", "../assets/resources/grass/0.png");
        this.load.image("grass1", "../assets/resources/grass/1.png");
        this.load.image("grass2", "../assets/resources/grass/2.png");
        this.load.image("grass3", "../assets/resources/grass/3.png");
        this.load.image("grass4", "../assets/resources/grass/4.png");
        this.load.image("grass5", "../assets/resources/grass/5.png");
        this.load.image("grass6", "../assets/resources/grass/6.png");

        /*
        this.load.image("mountain", "../assets/resources/mountain.png");
        this.load.image("tree", "../assets/resources/forest.png");
        this.load.image("water", "../assets/resources/water.png");
        this.load.image("sand", "../assets/resources/sand.png");
        this.load.image("stone", "../assets/resources/stone.png");
        this.load.image("bush", "../assets/resources/bush.png");
        this.load.image("flower", "../assets/resources/flower.png");
        */

        // nature
        this.load.image("grass", "../assets/resources/grass4.png");
        this.load.image("water", "../assets/resources/new/water.png");
        this.load.image("sand", "../assets/resources/sand2.png");
        this.load.image("mountain", "../assets/resources/mountain2.png");
        this.load.image("tree", "../assets/resources/bush.png");
        this.load.image("sugarcane", "../assets/resources/sugarcane.png");

        // item images
        this.load.image("woodenSword", "../assets/items/wooden_sword.png");
        this.load.image("woodenPickaxe", "../assets/items/wooden_pickaxe.png");
        this.load.image("woodenAxe", "../assets/items/wooden_axe.png");

        console.log("Preloaded assets");
    }

    create() {

        // tree animation spritesheet
        this.anims.create({
            key: "greenTreeIdle",
            frames: this.anims.generateFrameNumbers("greenTreeSpriteSheet"),
            frameRate: 7,
            repeat: -1,
        })

        // player spritesheet
        this.anims.create({
            key: "idleDown",
            frames: this.anims.generateFrameNumbers("playerSpriteSheet", {frames:[0, 1, 2]}),
            frameRate: 7,
            repeat: -1,
        })

        this.anims.create({
            key: "idleSide",
            frames: this.anims.generateFrameNumbers("playerSpriteSheet", {frames:[8, 9, 10]}),
            frameRate: 7,
            repeat: -1,
        })

        this.anims.create({
            key: "idleUp",
            frames: this.anims.generateFrameNumbers("playerSpriteSheet", {frames:[16, 17, 18]}),
            frameRate: 7,
            repeat: -1,
        })

        this.anims.create({
            key: "runDown",
            frames: this.anims.generateFrameNumbers("playerSpriteSheet", {frames:[24, 25, 26, 27]}),
            frameRate: 7,
            repeat: -1,
        })

        this.anims.create({
            key: "runSide",
            frames: this.anims.generateFrameNumbers("playerSpriteSheet", {frames:[32, 33, 34, 35]}),
            frameRate: 7,
            repeat: -1,
        })

        this.anims.create({
            key: "runUp",
            frames: this.anims.generateFrameNumbers("playerSpriteSheet", {frames:[40, 41, 42, 43]}),
            frameRate: 7,
            repeat: -1,
        })

        this.tiles = this.add.group();

        this.localPlayer = new Player(username, "blue", this, this.physics.add.sprite(100, 450, 'playerSpriteSheet').setOrigin(0.5, 0.5));
        this.localPlayer.sprite.setDepth(5);
        this.localPlayer.sprite.setScale(4);
        this.playerEvents.on('move', this.localPlayer.onPlayerMove.bind(this.localPlayer));

        // Track the movement status of the player
        this.input.on('pointermove', () => {
            if (this.localPlayer.sprite.body.velocity.x === 0 && this.localPlayer.sprite.body.velocity.y === 0) {
                // Only set idle state when the player is not moving
                this.localPlayer.setIdleState();
            }
        });


        

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

        this.input.keyboard.on('keyup', (event) => {
            if (event.key === 'w') {
                this.localPlayer.setIdleState();
            }
        });

        let KeyCodes = Phaser.Input.Keyboard.KeyCodes; // reference

        this.hotbarKeys = this.input.keyboard.addKeys({
            1: KeyCodes.ONE,
            2: KeyCodes.TWO,
            3: KeyCodes.THREE,
            4: KeyCodes.FOUR,
            5: KeyCodes.FIVE,
            6: KeyCodes.SIX,
            7: KeyCodes.SEVEN,
            8: KeyCodes.EIGHT,
            9: KeyCodes.NINE,

        });

        this.players = this.physics.add.group();
        this.hotbar = new Hotbar(this);
        this.hotbar.render();

        this.hotbar.addItemToHotbar("woodenSword");
        this.hotbar.addItemToHotbar("woodenPickaxe");
        this.hotbar.addItemToHotbar("woodenAxe");

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

        this.handleHotbarKeys();
        

        this.hotbar.render();

       // this.updateOtherClientsHolding();
        this.renderOtherHolding();
        this.renderDisplayNames();
    }

    handleKeyDown(key){
        if (this.hotbarKeys[key]){ // key is either 1, 2, 3..
            if (key == this.hotbar.selectedSlot+1) return; 
            // no need to select same slot multiple times
            this.hotbar.selectSlot(key - 1); // select slot
        }
    }

    handleHotbarKeys() {
        for (const key in this.hotbarKeys) {
            if (this.hotbarKeys[key].isDown) {
                this.handleKeyDown(key);
            }
        }
    }


    getRandom(chance) {
        return Math.random() < chance; // 'chance' is a value between 0 and 1
    }
    

    getRandomElement(array) {
        const randomIndex = Phaser.Math.Between(0, array.length - 1);
        return array[randomIndex];
    }

    renderDisplayNames() {
        // Iterate through all players in the player list
        for (let UUID in this.playerList) {
            const player = this.playerList[UUID];
    
            // Check if a display name text object already exists
            if (!player.nameText) {
                // Create and store the name text object above the player sprite
                player.nameText = this.add.text(
                    player.sprite.x, 
                    player.sprite.y - 20,  // Slightly above the sprite
                    player.name,            // Display player name
                    { font: '25px Arial', fill: '#fff', align: 'center' }
                ).setOrigin(0.5, 2).setDepth(10); // Center align, above other objects
            }
    
            // Update the text object's position to follow the player's sprite
            player.nameText.setPosition(player.sprite.x, player.sprite.y - 20);
        }
    }

    createStaticImage(imageKey, x, y) {
        let image = this.add.image(x, y, imageKey);
        console.log("Created static image: " + imageKey + " at (" + x + ", " + y + ")");
        console.log("image=", image);
        image.setOrigin(0.5, 0.5);
        image.setDisplaySize(this.staticImageSize, this.staticImageSize);
        image.setDepth(this.staticImageDepth);
        return image;
    }

    renderOtherHolding(){
       // console.log("DEBUG plagerlist=", this.playerList);
        for (let player of Object.keys(this.playerList)){
          //  console.log("DEUBUG player=", player);
            let target = this.playerList[player];

          //  console.log("DEBUG target=", target);
            if (target.holding == "") continue; // if target holding NULL, skip
            // else, render at correspnding position

            // math
            let angleInRadians = Phaser.Math.DegToRad(target.sprite.angle + this.angleOffset);
            let offsetX = Math.cos(angleInRadians) * this.OthersOffsetDistance;
            let offsetY = Math.sin(angleInRadians) * this.OthersOffsetDistance;
    
            // Set position of the holding image in front of the player
           // target.holdingImage.setPosition(target.sprite.x + offsetX, target.sprite.y + offsetY);
            target.holdingImage.setPosition(target.x + offsetX, target.y + offsetY);
            target.holdingImage.setOrigin(0, 0.3);
            
            // Set the holding image's angle to exactly match the player's angle
            target.holdingImage.setAngle(target.sprite.angle - 45);
           // console.log("rendered holding image for", target.name, "at", target.holdingImage.x, target.holdingImage.y);
        }
    }

    drawTile(x, y, tile) {
        let sprite = this.add.sprite(x, y, tile);
        sprite.setOrigin(0, 0);
    
        // Calculate the scale factor based on tile size
        let scaleX = this.tileSize / sprite.width;
        let scaleY = this.tileSize / sprite.height;

        if (tile == "tree"){ // make tree tile cover 2 tiles
            scaleY = 3;
            scaleX = 3;
            sprite.setOrigin(0.5, 0.75);
            sprite.setTexture("greenTreeSpriteSheet");
            sprite.play("greenTreeIdle", true);
        } else if (tile == "sugarcane"){
            scaleY = 3;
            //scaleX = 3;
            sprite.setOrigin(0, 0.5);
            sprite.setTexture("sugarcane");
        }
        
    
        // Set the scale to maintain aspect ratio
        sprite.setScale(scaleX, scaleY);
    
        this.tiles.add(sprite);    
    }
    

    getTile(x, y, noiseGenerator, noiseScale) {
        let v = noiseGenerator.noise2D(x * noiseScale, y * noiseScale);
        console.log(v);
        if (v < -0.2) {
            return "water";
        } else if (v < 0.01) {
            return "sand";
        } else if (v < 0.8) {
            return "grass";
        } else {
            return "mountain";
        }
    }
    

    generateWorld(seed) {
        console.log("hi");
        const noiseGenerator = new SimplexNoise(seed);
        console.log("created noise map", noiseGenerator, "with seed", seed);
    
        const natureRandom = this.seedRandom(this.natureSeed);
    
        for (let i = 0; i < this.worldSize / this.tileSize; i++) {
            for (let j = 0; j < this.worldSize / this.tileSize; j++) {

                const tileType = this.getTile(i, j, noiseGenerator, this.noiseScale);
                if (tileType === "grass") {
                    this.drawTile(this.tileSize * i, this.tileSize * j, "grass");

                    if (natureRandom() < 0.05) {
                        this.drawTile(this.tileSize * i, this.tileSize * j, "tree");
                    }
                } else if (tileType == "sand"){
                    this.drawTile(this.tileSize * i, this.tileSize * j, "sand");

                    if (natureRandom() < 0.2) {
                        this.drawTile(this.tileSize * i, this.tileSize * j, "sugarcane");
                    }

                } else { // original
                    this.drawTile(this.tileSize * i, this.tileSize * j, tileType);
                }

                 
            }
        }
    }
    
    
    
    
}

class Item {
    constructor(gameScene, itemType, x, y){
        this.image = gameScene.createStaticImage(itemType, x, y);
    }

    destroy(){
        this.image.destroy();
    }
}


class Player {
    constructor(name, color, scene, sprite) {
        this.name = name;
        this.color = color;
        this.scene = scene;
        this.velocity = 150;
        this.UUID = null;
        this.angleOffset = -90; // for some reason i need this
        this.offsetDistance = 32;
        this.sprite = sprite;
        this.internalAngle = 0;
        //this.hand = scene.createStaticImage("playerHand", 0, 0);
        this.holdingImage = null;

        // Server object
        this.playerObject = {
            name: name,
           // color: color,
            x: 0,
            y: 0,
         //   facing: "",
            holding: "",
        };
    }

    renderHolding() {
        if (this.holdingImage) {

            let angleInRadians = Phaser.Math.DegToRad(this.sprite.angle + this.angleOffset);
    
            let offsetX = Math.cos(angleInRadians) * this.offsetDistance;
            let offsetY = Math.sin(angleInRadians) * this.offsetDistance;
    
            // Set position of the holding image in front of the player
            this.holdingImage.setPosition(this.sprite.x + offsetX, this.sprite.y + offsetY);
            this.holdingImage.setOrigin(0, 0.3);
            
            // Set the holding image's angle to exactly match the player's angle
            this.holdingImage.setAngle(this.sprite.angle - 45);
        }
    }
    
    

    setHoldImage(image){
        if (this.holdingImage){
            this.holdNothing();
        }
        // Create the holding image and set its position
        this.holdingImage = this.scene.add.image(this.sprite.x, this.sprite.y, image);
        this.holdingImage.setDepth(50);
        //this.holdingImage.setScale(1);
        
        // Update the player object with the current holding image
        this.playerObject.holding = image;
        
        // DO NOT UPDATE PLAYER IMAGE, NEW SPRITE
        // Optionally update the player's main sprite texture
        //this.sprite.setTexture("playerHolding"); // Ensure the image has been preloaded
        //console.log("set player image", image);

        // update server

        let data = {
            UUID: this.UUID,
            type: "updatePlayer",
            property: "holding",
            value: image,
        };

        network.send(JSON.stringify(data));
        console.log("sent holding to server");

    }

    holdNothing(){
        this.holdingImage.destroy();
        this.holdingImage = null;
        this.playerObject.holding = "";
        //this.sprite.setTexture("player");

        let data = {
            UUID: this.UUID,
            type: "updatePlayer",
            property: "holding",
            value: "Nothing",
        };
        network.send(JSON.stringify(data));
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
       // this.sprite.angle = angle-this.angleOffset;
        // dont rotate player

        this.internalAngle = angle - this.angleOffset;
    }

    update() {
        this.renderPlayerHand(this.calculateHandAngle(this.scene));
        if (!this.scene.wasdKeys.up.isDown) {
            this.sprite.setVelocity(0, 0);
        }
        this.renderHolding();
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

    setIdleState(){
        // switch this.angle, corresponding image up down left whatever
        if (this.internalAngle >= 45 && this.internalAngle < 135) {
            // Face left
            this.sprite.play("idleSide", true);
            this.sprite.flipX = false; 
        } else if (this.internalAngle >= 135 && this.internalAngle < 225) {
            // Face up
            this.sprite.play("idleDown", true);
            this.sprite.flipX = false;  
        } else if (this.internalAngle >= 225 && this.internalAngle < 315) {
            // Face right
            this.sprite.play("idleSide", true);
            this.sprite.flipX = true; 
        } else {
            // Face down (default case for angles 0 to 45 and 315 to 360)
            this.sprite.play("idleUp", true);
            this.sprite.flipX = false;  
        }
    }
    

    setWalkingState(){
        // switch this.angle, corresponding image up down left whatever
        if (this.internalAngle >= 45 && this.internalAngle < 135) {
            // Face left
            this.sprite.play("runSide", true);
            this.sprite.flipX = false; 
        } else if (this.internalAngle >= 135 && this.internalAngle < 225) {
            // Face up
            this.sprite.play("runDown", true);
            this.sprite.flipX = false;  
        } else if (this.internalAngle >= 225 && this.internalAngle < 315) {
            // Face right
            this.sprite.play("runSide", true);
            this.sprite.flipX = true; 
        } else {
            // Face down (default case for angles 0 to 45 and 315 to 360)
            this.sprite.play("runUp", true);
            this.sprite.flipX = false;  
        }
    }
    

    move() {
        // calculate angle
        let angleInRadians = Phaser.Math.DegToRad(this.internalAngle + this.angleOffset);

        let deltaX = Math.cos(angleInRadians) * this.velocity;
        let deltaY = Math.sin(angleInRadians) * this.velocity;

        this.sprite.setVelocity(deltaX, deltaY);

        // update player sprite image based on angle (up, down, left, etc.)
        this.setWalkingState();

        this.onPlayerMove(); // update server
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
                    console.log("h222i");
                    const seed = data.seed;
                    const natureSeed = data.natureSeed; 
                    const worldSize = data.worldSize;
                    const chunkSize = data.chunkSize;
                    const tileSize = data.tileSize;

                    this.gameScene.natureSeed = natureSeed;
                    this.gameScene.worldSize = worldSize;
                    this.gameScene.chunkSize = chunkSize;
                    this.gameScene.tileSize = tileSize;
                    this.gameScene.noiseScale = data.noiseScale;

                    console.log("received worldSeed: " + seed + " from server");
                    console.log("received natureSeed: " + data.natureSeed + " from server");
                    console.log("received worldSize: " + data.worldSize + " from server");
                    console.log("received chunkSize: " + data.chunkSize + " from server");
                    console.log("received tileSize: " + data.tileSize + " from server");

                    // camera

                    this.gameScene.cameras.main.setBounds(0, 0, this.gameScene.worldSize * this.gameScene.tileSize, this.gameScene.worldSize * this.gameScene.tileSize); // Set bounds to match world size
                    this.gameScene.cameras.main.startFollow(this.gameScene.localPlayer.sprite, true, 0.1, 0.1); // Smooth follow

                    console.log("created camera follow thing");
                    console.log("generating world with seed: " + seed);
                    this.gameScene.generateWorld(seed);
                    break;
                
                case "playerList":
                    for (let key in data.playerList) {
                        const value = data.playerList[key];

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
            
                    switch(data.property) {
                        case "position":
                            this.updatePlayerPosition(data);
                            break;
                        case "holding":
                            this.updatePlayerHolding(data);
                            break;
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

    updatePlayerHolding(data){
        console.log("received holding data from", data.UUID);
        if (data.value == "Nothing"){
            let target = this.gameScene.playerList[data.UUID];
            
            target.holdingImage.destroy();
            target.holdingImage = null;
            target.holding = "";
            target.sprite.setTexture("player");
            console.log("set to nothing for", data.UUID);
        } else {
            console.log("data not nothing");
            let image = data.value;
            let target = this.gameScene.playerList[data.UUID];
   
            let imageX = Number.isNaN(target.sprite.x) ? 0 : target.sprite.x;
            let imageY = Number.isNaN(target.sprite.y) ? 0 : target.sprite.y;
 
            console.log("imageX =", imageX, "imageY =", imageY);    

            // RETURNS CREATE FUNCTION RATHER THAN IMAGE OBJECT?

            // HOW CAN TARGET.HOLDINGIMAGE.X BE NAN WHEN PRINTING TARGET.HOLDINGIMAGE
            // WHEN TARGET.HOLDINGIMAGE.X DISPLAYS CORRECTLY?
            target.holdingImage = this.gameScene.add.image(imageX, imageY, image).setOrigin(0, 0.3);
            console.log("IMAGE COORDS", target.holdingImage.x, target.holdingImage.y);
            console.log("DEBUG imag3333e =", target.holdingImage);
            

            target.holdingImage.setDepth(50);
            //this.holdingImage.setScale(1);
            
            // Update the player object with the current holding image
            target.holding = image; // image object name string
            
            // Optionally update the player's main sprite texture
            target.sprite.setTexture("playerHolding"); // Ensure the image has been preloaded
            console.log(`set ${target.name} image to holding ${image}`);
            console.log("DEBUG image =", target.holdingImage);

        }
    }

    updatePlayerPosition(data){
      //  console.log(this.gameScene.playerList);
        this.gameScene.playerList[data.UUID].sprite.x = data.x;
        this.gameScene.playerList[data.UUID].sprite.y = data.y;
        this.gameScene.playerList[data.UUID].sprite.angle = data.angle;

        this.gameScene.playerList[data.UUID].x = data.x;
        this.gameScene.playerList[data.UUID].y = data.y;

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
            holding: "",
            holdingImage: null,
        };
    
        console.log("Player joined: ", playerObject.name, "with UUID:", UUID);
    }
    

    send(data) {
        this.socket.send(data);
    }
}

class playerStats {
    constructor(scene) {
        this.scene = scene;
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(this.scene.UIDepth);

        // values
        this.maxHealth = 100;
        this.healthValue = this.maxHealth;
        this.hungerValue = 100;
        this.staminaValue = 100;
    }

    updateHealth(value){
        this.healthValue += value;
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
        this.itemYPos = 40+this.slotSize/2;
        this.graphics.setDepth(this.scene.UIDepth);
        this.graphics.setScrollFactor(0);
    }

    renderItemCounts() {
        for (let itemName in this.items) {
            const item = this.items[itemName];

            if (!item.countText) {
                item.countText = this.scene.add.text(
                    item.image.x + this.itemSize / 2, 
                    item.image.y - 10,
                    item.count.toString(),            
                    { font: '15px Arial', fill: '#fff', align: 'center' }
                ).setOrigin(0.5, 1).setDepth(this.scene.UIDepth).setScrollFactor(0); 
                // scrollfactor makes it not follow camera
            }
            
            item.countText.setPosition(item.image.x + this.itemSize / 2, item.image.y - 10);
            item.countText.setText(item.count.toString());
        }
    }
    
    getXPosition(){
        let index = Object.keys(this.items).length;
        let calculatedItemX = this.padding + index * this.xPadding;
        let offset = this.slotSize / 2;
        calculatedItemX += offset;
        return calculatedItemX;
    }


    handleExistingItem(itemName) {
        this.items[itemName].count += 1;
        console.log("Item " + itemName + " incremented by 1");
    }

    addItemToHotbar(itemName){
        
        // check if image already exists, if so, find image index and increment count

        if (this.items[itemName]) {
            this.handleExistingItem(itemName);
            return;
        }

        // else, calculate position of the image and index etc. to create new one

        let calculatedItemX = this.getXPosition();

        let itemImage = this.scene.createStaticImage(itemName, calculatedItemX, this.itemYPos);
        itemImage.setScrollFactor(0);
        this.items[itemName] = {
            image: itemImage,
            count: 1,
        };

        console.log("Item " + itemName + " added to hotbar");
    } 

    selectSlot(slot) {

        if (slot == this.selectedSlot) {
            // add unequip when selecting the same slot
        }

        this.selectedSlot = slot;

        // ONLY DO REST IF THERE IS SOMETING IN SLOT??!!

        if (!this.items[Object.keys(this.items)[slot]]) {
            this.scene.localPlayer.holdNothing();
            return;
        }

        

       // this.scene.localPlayer.playerObject.holding = Object.values()
        console.log("holding", Object.keys(this.items)[slot]);
        this.scene.localPlayer.setHoldImage(Object.keys(this.items)[slot]);

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
            this.renderItemCounts();
        }
    }
}


const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    pixelArt: true,
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
