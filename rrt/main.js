let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");

let line = (p1, p2) => {
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p2.x, p2.y, 1, 0, 2 * Math.PI);
  ctx.fill();
};

let start = Vec2.create(640, 360);
let stepSize = 10;
let points = [];

let slider = document.getElementById("myRange");
let output = document.getElementById("stepSize");

slider.oninput = function() {
  output.innerText = this.value;
  stepSize = this.value;
  points = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.main = () => {
  window.requestAnimationFrame(main);

  let random = Vec2.random(1280, 720);
  let dist = start.squareDistance(random);
  let closest = start;

  points.forEach(point => {
    let newDist = point.squareDistance(random)
    if (newDist < dist) {
      dist = newDist;
      closest = point;
    }
  });

  if (closest.distance(random) > stepSize ) {
    let pos = closest.clone();
    random = pos.add(random.sub(pos).normalize().scale(stepSize));
  }

  points.push(random)

  line(closest, random);
};

main();
