document.addEventListener('DOMContentLoaded', function() {
  console.log("document loaded");
});

async function play() {
    try {
        const playerName = document.getElementById("playerName").value;
        if (playerName.length == 0) {
            throw new Error("Name cannot be empty");
        }
        const response = await fetch('http://localhost:4000/play', {
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
        // redirect to game route on server
        window.location.href = "http://localhost:4000/game?username=" + playerName;
       } else {
        // show error on client
        console.log("invalid data sent to server:")
        console.log(data.message);
       }
    } catch (error) {
        console.error('Error:', error);
    }
}
