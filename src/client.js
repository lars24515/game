document.addEventListener('DOMContentLoaded', function() {
  console.log("document loaded");
});

async function play() {
    try {
        const playerName = document.getElementById("playerName").value;
        if (playerName.length == 0) {
            throw new Error("Name cannot be empty");
        }
        const response = await fetch('https://ef5e0306-0487-4d18-a598-b6d297d84958-00-1ks7cvl637dyq.riker.replit.dev/play', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerName: playerName })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

       if (data.message == "OK"){
        // redirec to game.html tihng
        window.location.href = "../game/game.html";
       } else {
        // shoe error on client
        console.log("invalid data esnt to server:")
        console.log(data.message);
       }
    } catch (error) {
        console.error('Error:', error);
    }
}
