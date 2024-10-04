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



ideer


sykdommer, % sjanse å få fra å gjøre forskjellige ting, som å drikke ukokt vann.

*/

// Define the Game class first
class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        this.localPlayer = null;
        this.players = null;
        this.playerList = {};
        this.worldSize = 50;
        this.staticImageSize = 32;
        this.staticImageDepth = 20; // should be above most other images.. maybe create a map list for this sometime?
        this.chunkSize = 16;
        this.tileSize = 64; // Adjust based on your tile images
        this.possibleTiles = [
            { type: "Grass", threshold: 0.2, key: "grass" },        // Most common
            { type: "Water", threshold: 0.3, key: "water" },        // Some water bodies       // Few bushes
            { type: "Mountain", threshold: 0.15, key: "mountain" },  // Some mountains
            { type: "Sand", threshold: 0.35, key: "sand" }     
        ];
        
        this.seed = null;
        this.world = [];
        this.playerEvents = new Phaser.Events.EventEmitter();
    }

    preload() {
        // Load tile images

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


        this.load.image("mountain", "../assets/resources/mountain.png");
        this.load.image("tree", "../assets/resources/forest.png");
        this.load.image("water", "../assets/resources/water.png");
        this.load.image("sand", "../assets/resources/sand.png");
        this.load.image("stone", "../assets/resources/stone.png");
        this.load.image("bush", "../assets/resources/bush.png");
        this.load.image("flower", "../assets/resources/flower.png");


        // item images
        this.load.image("woodenSword", "../assets/items/wooden_sword.png");
        this.load.image("woodenPickaxe", "../assets/items/wooden_pickaxe.png");
        this.load.image("woodenAxe", "../assets/items/wooden_axe.png");

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

        this.input.on('pointermove', this.handleTileHover.bind(this));

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

    updateOtherClientsHolding(){
        for (let player of Object.values(this.playerList)) {
            let image = player.holdingImage;
            if (!player.holding) return;   
            // player is holding something, render it
            if (!player.holdingImage){
                // player is holding something, but no image is present

                let holdingImage = this.scene.add.image(this.sprite.x, this.sprite.y, image);

                holdingImage.setDepth(50);
                player.holdingImage = image;

                player.sprite.setTexture("playerHolding"); // Ensure the image has been preloaded
                console.log("set player image for", player.UUID);

            }
            // image is present and player is holding something
            // update the position

            let angleInRadians = Phaser.Math.DegToRad(player.angle);
    
            let offsetX = Math.cos(angleInRadians) * this.localPlayer.offsetDistance;
            let offsetY = Math.sin(angleInRadians) * this.localPlayer.offsetDistance;
    
            // Set position of the holding image in front of the player
            player.holdingImage.setPosition(player.sprite.x + offsetX, player.sprite.y + offsetY);
            player.holdingImage.setOrigin(0, 0.3);
            
            // Set the holding image's angle to exactly match the player's angle
            player.holdingImage.setAngle(player.angle - 45);


        }
    }

    handleTileHover(pointer) {
        // Convert pointer (mouse) position to tile coordinates
        const tileX = Math.floor(pointer.worldX / this.tileSize);
        const tileY = Math.floor(pointer.worldY / this.tileSize);
    
        // Ensure we're within the world bounds
        /*
        if (tileX >= 0 && tileX < this.worldSize && tileY >= 0 && tileY < this.worldSize) {
            const tileType = this.world[tileX][tileY];
            console.log(`Hovering over tile: Type = ${tileType}, Coordinates = (${tileX}, ${tileY})`);
        }
            */
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

        this.updateOtherClientsHolding();
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

    getRandom(chance) {
        return Math.random() < chance; // 'chance' is a value between 0 and 1
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

    addTile(x, y, tileKey) {
        let tileImage;
        
        if (tileKey === "grass") {
            tileImage = this.add.image(x * this.tileSize, y * this.tileSize, this.getRandomElement(this.grassTextures));
            tileImage.setOrigin(0, 0);
        } else if (tileKey === "tree") {
            tileImage = this.add.image(x * this.tileSize, y * this.tileSize, tileKey);
            tileImage.setOrigin(0.5, 1);
        } else {
            tileImage = this.add.image(x * this.tileSize, y * this.tileSize, tileKey);
            tileImage.setOrigin(0.5, 0.5);
        }
        
        // Resizing every tile to 32x32
        tileImage.setDisplaySize(this.tileSize, this.tileSize);

        if (tileKey === "sand") {
            tileImage.setOrigin(0, 0);  
            tileImage.setDisplaySize(this.tileSize, this.tileSize);
        }
        

        if (tileKey === "tree") {
            tileImage.setDisplaySize(128, 256);
            tileImage.setDepth(1);
        }
        if (tileKey === "stone") {
            if (this.getRandom(0.5)) {
                tileImage.setDisplaySize(64, 64);
            } else {
                tileImage.setDisplaySize(80, 80);
            }
            
        }

        tileImage.setDepth(1);

    }    

    createMap() {
        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                let tileType = this.world[x][y];
                let tileKey = this.getTileKey(tileType);
                //console.log("Tile: " + tileKey + " at (" + x + ", " + y + ")");
    
                this.addTile(x, y, tileKey);

                if (this.getRandom(0.05) && tileKey === "grass") {
                    // add tree
                    this.addTile(x, y, "tree");
                }
                if (this.getRandom(0.02) && tileKey === "grass") {
                    // add tree
                    this.addTile(x, y, "stone");
                }
            }
        }
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
    
    
    getTileKey(type) {
        // Map tile type to the corresponding image key
        switch (type) {
            case "Grass": return "grass";
            case "Mountain": return "mountain";
            case "Tree": return "tree";
            case "Water": return "water";
            case "Stone": return "stone";
            case "Sand": return "sand";
            case "Bush": return "bush";
            case "Flower": return "flower";
            default: return "grass"; // Default to grass if the type isn't recognized
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
        
        // Optionally update the player's main sprite texture
        this.sprite.setTexture("playerHolding"); // Ensure the image has been preloaded
        console.log("set player image", image);

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
        this.sprite.setTexture("player");

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
        this.sprite.angle = angle-this.angleOffset;

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
            return;
        } else {
            this.gameScene.playerList[data.UUID].holding = data.holding;
            console.log("set holding");
        }
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
            holding: "",
            holdingImage: "",
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
        this.itemYPos = 40+this.slotSize/2;
        this.graphics.setDepth(10);
    }

    renderItemCounts() {
        // Iterate over each item in the hotbar
        for (let itemName in this.items) {
            const item = this.items[itemName];
            
            // Check if a count text object already exists
            if (!item.countText) {
                // Create and store the count text object above the item image
                item.countText = this.scene.add.text(
                    item.image.x + this.itemSize / 2, // Position it above the image
                    item.image.y - 10,
                    item.count.toString(),             // Display the item count
                    { font: '15px Arial', fill: '#fff', align: 'center' }
                ).setOrigin(0.5, 1).setDepth(10); // Center align, above the item image
            }
            
            // Update the text object's position to follow the item's image
            item.countText.setPosition(item.image.x + this.itemSize / 2, item.image.y - 10);
            // Update the text to reflect the current count
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
        this.items[itemName] = {
            image: itemImage,
            count: 1,
        };

        console.log("Item " + itemName + " added to hotbar");
    } 

    selectSlot(slot) {
        this.selectedSlot = slot;

        // ONLY DO REST IF THERE IS SOMETING IN SLOT??!!

        if (!this.items[Object.keys(this.items)[slot]]) {
            this.scene.localPlayer.holdNothing();
            return;
        }

        // add unequip when selecting the same slot

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
