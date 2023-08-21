const canvas = document.getElementById("myCanvas")
const ctx = canvas.getContext("2d");

const rockImg = new Image()
rockImg.src = "assets/rock.jpg"
const paperImg = new Image()
paperImg.src = "assets/paper.jpg"
const scissorImg = new Image()
scissorImg.src = "assets/scissors.jpg"

let anti = {
    "rock": "paper", "paper": "scissors", "scissors": "rock"
}

let myObjects = [];
let size = 40;
let count = 50;
let speed = 6;

let push = 2;
let minSpeed = 0.00001;
let centerGravity = 0.0008;

const populate = () => {
    myObjects = [];
    for (let i = 0; i < count; i++) {
        myObjects.push({ x: Math.random() * (1280 - size), y: Math.random() * (720 - size), type: ["rock", "paper", "scissors"][Math.floor((Math.random() * 3))] })
    }
}

let countSlider = document.getElementById("countRange");
let countOutput = document.getElementById("count");

let sizeSlider = document.getElementById("sizeRange");
let sizeOutput = document.getElementById("size");

let speedSlider = document.getElementById("speedRange");
let speedOutput = document.getElementById("speed");

countSlider.oninput = function () {
    count = countSlider.value;
    countOutput.innerText = countSlider.value;
    populate();
}

sizeSlider.oninput = function () {
    size = sizeSlider.value;
    sizeOutput.innerText = sizeSlider.value;
    populate();
}

speedSlider.oninput = function () {
    speed = speedSlider.value;
    speedOutput.innerText = speedSlider.value;
    populate();
}

populate()
window.main = async () => {
    window.requestAnimationFrame(main);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    myObjects.forEach(obj1 => {
        myObjects.forEach(obj2 => {
            if (obj1 !== obj2) {
                let dx = (obj2.x - obj1.x);
                let dy = (obj2.y - obj1.y);
                let dist = Math.sqrt((dx * dx) + (dy * dy));

                if (anti[obj1.type] === obj2.type || obj1.type === obj2.type) {
                    if (dx < 0) {
                        obj1.x += speed / dist / push;
                    }
                    else if (dx > 0) {
                        obj1.x -= speed / dist / push;
                    }
                    if (dy < 0) {
                        obj1.y += speed / dist / push;
                    }
                    else if (dy > 0) {
                        obj1.y -= speed / dist / push;
                    }
                }
                else if (obj1.type === anti[obj2.type]) {
                    if (dx < 0) {
                        obj1.x -= speed / dist + minSpeed;
                    }
                    else if (dx > 0) {
                        obj1.x += speed / dist + minSpeed;
                    }

                    if (dy < 0) {
                        obj1.y -= speed / dist + minSpeed;
                    }
                    else if (dy > 0) {
                        obj1.y += speed / dist + minSpeed;
                    }
                }

                if (Math.abs(dx) < size && Math.abs(dy) < size) {
                    if (anti[obj1.type] === obj2.type) {
                        obj1.type = obj2.type
                    }
                    else if (obj1.type === anti[obj2.type]) {
                        obj2.type = obj1.type
                    }
                }
            }
        });

        obj1.x += Math.random() * 2 - 1;
        obj1.y += Math.random() * 2 - 1;

        obj1.x += (640 - obj1.x) * centerGravity;
        obj1.y += (360 - obj1.y) * centerGravity;

        obj1.x = Math.max(Math.min(obj1.x, 1279 - size), 1);
        obj1.y = Math.max(Math.min(obj1.y, 719 - size), 1);
    });

    myObjects.forEach(obj => {
        switch (obj.type) {
            case "rock":
                ctx.drawImage(rockImg, obj.x, obj.y, size, size);
                break;
            case "paper":
                ctx.drawImage(paperImg, obj.x, obj.y, size, size);
                break;
            case "scissors":
                ctx.drawImage(scissorImg, obj.x, obj.y, size, size);
                break;

            default:
                break;
        }

    });
};
main();
