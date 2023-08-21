const canvas = document.getElementById("myCanvas")
const ctx = canvas.getContext("2d");

const frameSlider = document.getElementById("frameRange");
const frameOutput = document.getElementById("frame");
const scoreOutput = document.getElementById("score");

let gridSize = 40;
let frameTime = 250;

let player;
let apple;
let playerDirection;
let running;

let StartGame = () => {
    player = [{ x: 16, y: 9 }, { x: 15, y: 9 }, { x: 14, y: 9 }, { x: 13, y: 9 }, { x: 12, y: 9 }]
    apple = { x: Math.floor(Math.random() * 32), y: Math.floor(Math.random() * 18) };
    playerDirection = "RIGHT"
    running = false;
}


window.addEventListener("keydown", (event) => {
    if (!running) running = true;
    switch (event.code) {
        case "KeyW":
            if (player[0].x !== player[1].x || player[0].y - 1 !== player[1].y)
                playerDirection = "UP";
            break;
        case "KeyS":
            if (player[0].x !== player[1].x || player[0].y + 1 !== player[1].y)
                playerDirection = "DOWN";
            break;
        case "KeyA":
            if (player[0].x - 1 !== player[1].x || player[0].y !== player[1].y)
                playerDirection = "LEFT";
            break;
        case "KeyD":
            if (player[0].x + 1 !== player[1].x || player[0].y !== player[1].y)
                playerDirection = "RIGHT";
            break;
        case "KeyD":
            if (player[0].x + 1 !== player[1].x || player[0].y !== player[1].y)
                playerDirection = "RIGHT";
            break;
    }
}, false);

let update = () => {
    if (!running) return;
    for (let i = player.length - 1; i > 0; i--) {
        player[i] = { x: player[i - 1].x, y: player[i - 1].y };
    }

    switch (playerDirection) {
        case "UP":
            player[0].y -= 1;
            break;
        case "DOWN":
            player[0].y += 1;
            break;
        case "LEFT":
            player[0].x -= 1;
            break;
        case "RIGHT":
            player[0].x += 1;
            break;
    }

    for (let i = 1; i < player.length; i++) {
        if (player[0].x < 0 || player[0].x > 31 || player[0].y < 0 || player[0].y > 17 || (player[0].x == player[i].x && player[0].y == player[i].y)) {
            alert("loser");
            player = [{ x: 16, y: 9 }, { x: 15, y: 9 }, { x: 14, y: 9 }, { x: 13, y: 9 }, { x: 12, y: 9 }];
            playerDirection = "RIGHT"
            apple = { x: Math.floor(Math.random() * 32), y: Math.floor(Math.random() * 18) };
            running = false;
        }
    }

    if (player[0].x == apple.x && player[0].y == apple.y) {
        player.push(player[player.length - 1])
        apple = { x: Math.floor(Math.random() * 32), y: Math.floor(Math.random() * 18) };
    }
    scoreOutput.innerText = player.length - 5;
};

let interval = setInterval(update, frameTime);
StartGame();

frameSlider.oninput = function () {
    frameTime = frameSlider.value;
    frameOutput.innerText = frameSlider.value;
    clearInterval(interval);
    interval = setInterval(update, frameTime);
    StartGame();
}

function drawBoard() {
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(0.5 + x, 0);
        ctx.lineTo(0.5 + x, canvas.height);
    }

    for (let x = 0; x <= canvas.height; x += gridSize) {
        ctx.moveTo(0, 0.5 + x);
        ctx.lineTo(canvas.width, 0.5 + x);
    }

    ctx.strokeStyle = "black";
    ctx.stroke();
}

function drawPlayer() {
    ctx.fillStyle = "black";
    player.forEach(e => {
        ctx.fillRect(e.x * gridSize, e.y * gridSize, gridSize, gridSize);
    });
}


function drawApple() {
    ctx.fillStyle = "red";
    ctx.fillRect(apple.x * gridSize, apple.y * gridSize, gridSize, gridSize);
}

window.main = async () => {
    window.requestAnimationFrame(main);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawPlayer();
    drawApple();

};
main();


