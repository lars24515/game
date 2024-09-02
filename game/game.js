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
    constructor(name, color, scene) {
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
            author: this.playerObject.name,
            type: 'updatePosition',
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
        this.playerList = [];
        this.localPlayer = new Player("Player1", "blue", this);  // args from URL?
        this.playerEvents = new Phaser.Events.EventEmitter();
        this.playerEvents.on('move', this.localPlayer.onPlayerMove.bind(this.localPlayer));
        console.log("finished game constructor");
    }
}

var game = new Game();

function preload() {
    this.load.image("player", "../assets/player.png");
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

    // Create player sprite
    lpSprite = this.physics.add.sprite(100, 450, 'player');
    lpSprite.setScale(0.075);
    game.localPlayer.sprite = lpSprite;

    
    
    //this.add.text(100, 100, "Hello, Phaser!", textStyle);
    // i will make all display names from playerlis tfrom server
}

class Network{
    constructor(){
        this.socket = new WebSocket('ws://localhost:8080');
        this.socket.onopen = function(event) {
            console.log('Connected to WebSocket server');
            // send playerJoined
            this.send({
                type: "playerJoined",
                player: game.localPlayer,
            })
        };
        this.socket.onmessage = function(event) {
            switch (JSON.parse(event.data.type)) {
                case "updatePlayer":
                    // Update a specific players' property


                case "playerJoined":
                    // Add player to list
                    if (data.player.name == player.name) {
                        this.UUID = data.UUID; // get UUID from server
                        console.log("My UUID is: " + this.UUID);
                        return; // no shit dont add myself
                    }
                    // it is another player
                    // add to client side player list
                    game.playerList.push(data.player);
                    console.log("Player joined: " + data.player.name + " with UUID: " + data.UUID);

                default:
                    console.log("what? i tihnk no type?");
                    console.log(JSON.parse(event.data));
            }
        }
    }
    
    send(data){
        this.socket.send(JSON.stringify(data));
    }

}

const network = new Network();


function update() {
    // Reset velocity each frame
    game.localPlayer.sprite.setVelocity(0);
    this.cameras.main.setBackgroundColor(0x25BE4B); // Set green background color

    // Handle movement with WASD or Arrow keys
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

    // Emit move event when the player moves
    if (cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown ||
        wasdKeys.left.isDown || wasdKeys.right.isDown || wasdKeys.up.isDown || wasdKeys.down.isDown) {
        game.playerEvents.emit('move');
    }
}
