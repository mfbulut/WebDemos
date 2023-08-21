const c = document.getElementById("c");
const ctx = c.getContext("2d");

let balls = [];

const getAll = () => {
  const elements = myTree.retrieve({
    x: 0,
    y: 0,
    width: myTree.width,
    height: myTree.height,
  });
  return elements;
};

const drawCircle = (ball) => {
  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, 2 * Math.PI);
  ctx.fillStyle = ball.color;
  ctx.fill();
};

for (let i = 0; i < 500; i++) {
  balls.push({
    pos: Vec2.random(800, 300),
    vel: Vec2.create(0, 1),
    radius: 8,
    color: "#" + Math.floor(Math.random() * 16777215).toString(16),
  });
}

function update(progress) {
  for (let i = 0; i < 8; i++) {
    balls.forEach((ball) => {
      ball.pos.add(ball.vel);
      ball.pos.x = Math.min(
        Math.max(ball.pos.x, ball.radius),
        c.width - ball.radius
      );
      ball.pos.y = Math.min(ball.pos.y, c.height - ball.radius);
      for (let i = 0; i < 8; i++) {
        balls.forEach((ball2) => {
          if (ball !== ball2) {
            let diff = ball.pos.clone().sub(ball2.pos);
            let dist = diff.length();
            if (dist < ball.radius + ball2.radius) {
              diff.normalize().scale((16 - dist) / 2.0);
              ball.pos.add(diff);
              ball2.pos.sub(diff);
            }
          }
        });
      }
    });
  }
  ctx.clearRect(0, 0, c.width, c.height);
  balls.forEach((ball) => {
    drawCircle(ball);
  });
}

function loop(timestamp) {
  let progress = timestamp - lastRender;

  update(progress);

  lastRender = timestamp;
  window.requestAnimationFrame(loop);
}
let lastRender = 0;
window.requestAnimationFrame(loop);
