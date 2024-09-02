/*

upon loading the site, it will prompt you to create a character.
this character data can either be saved with cookies or by IP in a database. (?)

when pressing play, the client will first establish another connection to the server.
it will add the player to a player list in the server;

whenever the server receives an event, it will check if its relevant to the other clients.
if so, thne it will update the serverside player list of player objects,
then send it to all thoe ther clients.
this should make it so players can see eahcoters movements.

// world generation

let chunkSize = 16;
make an initial array of chunks
update this according to player positions
and hide the ones that dont need to be rendered.

----

// client

class Network(){
    port
    ip
    hostnmae
    username
    this.identifier = hostname, etc. to know who sent what data

    events = [
    "updateColor"
    "updateName"
    "updatePosiiton"
    "updateFacing"
    etc.
    ]

    // methods
    connect()
    disconnect()
    send(event)
    etc.
}

class Player(name, color){
    // client variables (don't need thees in player object to send to server)
    such as someing idk
    ..
    || MAYBE USE AN ARRAY FOR CLIENT VARIABLES AND FOR SERVER VARAIBLES?
    // server variables
    these variables need to be in player object to send to server
    ..

    checkForUpatatedVariables()
    if something changed then run upate obj

    updatePlayerObject()
    // update player server object
    player[this.clientvars[i]].vaue = someing[i]

    network.send("updatePosition", this.identifier, player);
}

player = {

    name: "",
    color: "",
    x: 0,
    y: 0,
    facing: "",
    holding "",
}

// server
players = []

class network(){

    this.clientList = []


    receive(identifier, data){

        match data.eventType{
        case "updateposition:"{
         ..
            }
        }
    }

    send(data, receiver){
        req.send(receiver.ip, data)
    }
    
    updateClients(){
        forEach (client in this.clientList){
            
        }
    }

    this.onReceive(){
    if data.includes(player) && player.isObject{
            if player in players:
                players[player] = player
                updateclients()
            else{
            player no tin thing? fix
            }
    }
    }
    }
}
}



----

*/