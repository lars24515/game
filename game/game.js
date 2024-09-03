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

var lpSprite;

class Player {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.speed = 100;
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

    renderDisplayName(){
        
    }

    update(){

    }

    onPlayerMove() {
        // Logic to handle player movement on the server
        this.playerObject.x = this.sprite.x;
        this.playerObject.y = this.sprite.y;
        this.playerObject.facing = this.sprite.facing;
        this.playerObject.holding = this.sprite.holding;

        // send new info to SOCKET server
        let data = {
            author: this.UUID,
            type: 'updatePlayer',
            property: "position",
            value: this.playerObject,
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
        this.chunkSize = 16;
        this.playerList = {};
        this.localPlayer = new Player("Player1", "blue", this);  // args from URL?
        this.playerEvents = new Phaser.Events.EventEmitter();
        this.playerEvents.on('move', this.localPlayer.onPlayerMove.bind(this.localPlayer));
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

    cursors = this.input.keyboard.createCursorKeys();
    wasdKeys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    lpSprite = this.physics.add.sprite(100, 450, 'player');
    lpSprite.setScale(0.075);
    game.localPlayer.sprite = lpSprite;

    
    
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

                    if (data.property == "position") {
                        this.playerList[data.UUID].position = data.position;
                        console.log(`updated ${data.player.name} position to: ${data.position}`);
                        break;
                    }

                    break;
                case "playerJoined":
                    // Add player to list
                    if (data.player.name == game.localPlayer.name) {
                        game.localPlayer.UUID = data.UUID; // get UUID from server
                        console.log("My UUID is: " + game.localPlayer.UUID);
                        return; // no need to add myself
                    }

                    // it is another player
                    // add to clientside player list
                    game.playerList[data.UUID] = data.player;
                    console.log("Player joined: " + data.player.name + " with UUID: " + data.UUID);
                    break;

                default:
                    console.log("Unknown message type:", data.type);
                    break;
            }
        }.bind(this); 
    }
    
    send(data){
        this.socket.send(data);
    }
}

const network = new Network();


function update() {
    game.localPlayer.sprite.setVelocity(0);
    this.cameras.main.setBackgroundColor(0x25BE4B); 

    if (cursors.left.isDown || wasdKeys.left.isDown) {
        game.localPlayer.moveLeft();
    } else if (cursors.right.isDown || wasdKeys.right.isDown) {
        game.localPlayer.moveRight();
    }

    if (cursors.up.isDown || wasdKeys.up.isDown) {
        game.localPlayer.moveUp();
    } else if (cursors.down.isDown || wasdKeys.down.isDown) {
        game.localPlayer.moveDown();
    }

    if (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown ||
        wasdKeys.left.isDown || wasdKeys.right.isDown || wasdKeys.up.isDown || wasdKeys.down.isDown) {
        game.playerEvents.emit('move');
    }
}
