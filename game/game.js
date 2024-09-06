var config = {
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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

class Player {
    constructor(name, color, sprite, scene) {
        this.name = name;
        this.color = color;
        this.scene = scene;
        this.velocity = 100;
        this.UUID = null;
        this.sprite = sprite;
        this.nameText = this.scene.add.text( this.sprite.x, this.sprite.y - 20, this.name, { font: "16px Arial", fill: "#ffffff" } ).setOrigin(0.5);

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

    calculateHandAngle(){

        // Mouse position
        let pointer = this.scene.input.activePointer;
        let mouseX = pointer.worldX;
        let mouseY = pointer.worldY;

        let angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, mouseX, mouseY);

        let angleInDegrees = Phaser.Math.RadToDeg(angle);
        console.log(angleInDegrees);
    }

    

    renderDisplayName() {
        this.nameText.setPosition(this.sprite.x, this.sprite.y - 20);
    }
    
    update(){
        this.calculateHandAngle();
        this.renderDisplayName();
    }

    onPlayerMove() {
        // handle player movement on the server
        this.playerObject.x = this.sprite.x;
        this.playerObject.y = this.sprite.y;
        this.playerObject.facing = this.sprite.facing;
        this.playerObject.holding = this.sprite.holding;

        // send new info to socket server
        let data = {
            UUID: this.UUID,
            type: 'updatePlayer',
            property: "position",
            x: this.sprite.x,
            y: this.sprite.y,
            facing: this.playerObject.facing,
        }
        network.send(JSON.stringify(data));
    }

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

class Game{
    constructor(){
        this.game = new Phaser.Game(config);
        this.players = null;
        this.chunkSize = 16;
        this.playerList = {};
        console.log("finished game constructor");
    }
}

var game = new Game();
console.log("created game class instance");

function preload() {
    this.load.image("player", "../assets/player.png");

    console.log("preloaded assets")
}

const textStyle = {
    font: "32px Arial",
    fill: "#ffffff", 
    align: "center"
};

function create() {

    
    lpSprite = this.physics.add.sprite(100, 450, 'player');
    lpSprite.setScale(0.075);
    localPlayer = new Player("Player1", "blue", lpSprite, this);  // args from URL?
    playerEvents = new Phaser.Events.EventEmitter();
    playerEvents.on('move', localPlayer.onPlayerMove.bind(localPlayer));

    cursors = this.input.keyboard.createCursorKeys();
    wasdKeys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

   
    game.players = this.physics.add.group();
    this.hotbar = new Hotbar(this);
    this.hotbar.render();

    
    
    //this.add.text(100, 100, "Hello, Phaser!", textStyle);
    // i will make all display names from playerlis tfrom server
    console.log("created game assets")
}

class Network{
    constructor(){
        this.socket = new WebSocket('ws://localhost:8080');
        this.socket.onopen = function(event) {
            console.log('Connected to WebSocket server');
            // send playerJoined
            const data = JSON.stringify({
                type: "playerJoined",
                player: game.localPlayer.playerObject,  // use playerObject for correct data format
            });
            this.send(data);
            console.log("sent playerJoined from client");
        };
        this.socket.onclose = function(event) {
            console.log('Disconnected from WebSocket server');
            window.location.href = "../src/index.html";
        };

        this.socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            switch (data.type) {

                case "playerLeave":
                    // Remove player from list
                    delete game.playerList[data.UUID];
                    console.log("Player left: " + data.player.name + " with UUID: " + data.UUID);
                    break;
                
                case "updatePlayer":
                    // Update a specific players' property

                    if (data.UUID == game.localPlayer.UUID) {
                        return; // no need to update myself
                    }

                    if (data.property == "position") {
                        this.playerList[data.UUID].x = data.x;
                        this.playerList[data.UUID].y = data.y;
                        console.log(`updated ${data.player.name} position to: ${data.x}, ${data.y}`);
                    }
                    break;

                    break;
                case "playerJoined":
                    // Add player to list
                    if (data.player.name == game.localPlayer.name) {
                        game.localPlayer.UUID = data.UUID; // get UUID from server
                        console.log("My UUID is: " + game.localPlayer.UUID);
                        return; // no need to add myself
                    }

                    // this will only execute if it is a new player

                    console.log("got here"); // this isnt met for some reason

                    // it is another player
                    // add to clientside player list
                    this.handlePlayerJoined(data);
                    break;

                default:
                    console.log("Unknown message type:", data.type);
                    break;
            }
        }.bind(this); 
    }

    handlePlayerJoined(data){
        game.playerList[data.UUID] = data.player;
        console.log("Player joined: " + data.player.name + " with UUID: " + data.UUID);
        
        newPlayer = createPlayer(data);
        game.playerList[data.UUID] = newPlayer;
    }
    
    send(data){
        this.socket.send(data);
    }
}

const network = new Network();


function update() {

    localPlayer.sprite.setVelocity(0);
    this.cameras.main.setBackgroundColor(0x25BE4B); 

    // player movement

    if (cursors.left.isDown || wasdKeys.left.isDown) {
        localPlayer.moveLeft();
    } else if (cursors.right.isDown || wasdKeys.right.isDown) {
        localPlayer.moveRight();
    }

    if (cursors.up.isDown || wasdKeys.up.isDown) {
        localPlayer.moveUp();
    } else if (cursors.down.isDown || wasdKeys.down.isDown) {
        localPlayer.moveDown();
    }

    if (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown ||
        wasdKeys.left.isDown || wasdKeys.right.isDown || wasdKeys.up.isDown || wasdKeys.down.isDown) {
        playerEvents.emit('move');
    }

    // player hand

    

    // hotbar

    this.hotbar.render();


}

// hotbar will be placed in top center of the screen.
// always centered, so change positon upon adding an item.


class Hotbar {
    constructor(scene){
        this.scene = scene;
        this.graphics = this.scene.add.graphics();
        this.padding = 50;
        this.xPadding = 40;
        this.items = {}; // {itemType: count}
        this.selectedSlot = 0; // first slot
        this.slotSize = 32;
        this.itemSize = 25; // center inside slot
        this.maxSlotCount = 9;
    }

    selectSlot(slot){
        this.selectedSlot = slot;   

    }

    renderSelectedSlot(){
        this.graphics.fillStyle(0xFFFFFF, 0.1);
        this.graphics.fillRect(this.selectedSlot * this.xPadding+this.padding-5, 35, this.slotSize+10, this.slotSize+10);
    }

    renderSquare(x){
        
        this.graphics.fillStyle(0x000000, 0.1);
        this.graphics.fillRect(this.padding+x, 40, this.slotSize, this.slotSize);
    }

    render(){
        for (let i = 0; i < this.maxSlotCount; i++) {
            this.renderSelectedSlot();
            this.renderSquare(i * this.xPadding);
            
        }    
    }

    addItemCount(){
        // call from addItem if item is already present
    }

    removeItem(){

    }

    addItem(){

    }
}

class Stats { // health, hunger, thirst?
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.max = 100; // add other sto
        this.vale = max;
        // fill a bar to represent value
    }

    render(){ 

    }
}

class UI{
    constructor(){
        this.elements = {
            hotbar: new Hotbar(), // x, y
            health: new Health(),
        }
    }

    // render all UI elements

    renderElements(){
        Object.values(this.elements).forEach(element => {
            element.render();
        });
    }
}

