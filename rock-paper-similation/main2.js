var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");

// Player class


// Rectangle class
function Rectangle(x, y, width, height, color) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.color = color;
  //draw rectangle
  this.draw = function () {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  };
}

//creat a player
var player = new Player(250, 0, 50, 50, "blue");

//create a rectangle
rect = new Rectangle(450, 400, 200, 50, "green");
rect2 = new Rectangle(100, 270, 100, 250, "grey");
rect3 = new Rectangle(350, 200, 200, 50, "red");

// draw loop
function draw() {
  ctx.clearRect(0, 0, c.width, c.height);
  player.update();
  player.handleCollision(rect);
  player.handleCollision(rect2);
  player.handleCollision(rect3);
  player.draw();
  rect.draw();
  rect2.draw();
  rect3.draw();
  requestAnimationFrame(draw);
}

draw();

//keyboard event
document.addEventListener("keydown", function (event) {
  if (event.keyCode == 37) {
    player.velocity = -5;
  }
  if (event.keyCode == 39) {
    player.velocity = 5;
  }
  if (event.keyCode == 38) {
    player.jump();
  }
});

document.addEventListener("keyup", function (event) {
  if (event.keyCode == 37) {
    player.velocity = 0;
  }
  if (event.keyCode == 39) {
    player.velocity = 0;
  }
});
