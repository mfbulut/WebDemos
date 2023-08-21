function circle(radius, center = [0, 0]) {
  return (point) => {
    const distance = Math.sqrt(
      Math.pow(point[0] - center[0], 2) + Math.pow(point[1] - center[1], 2)
    );

    return distance - radius;
  };
}

function box(size, center = [0, 0]) {
  return (point) => {
    const halfWidth = size[0] / 2;
    const halfHeight = size[1] / 2;

    const dx = Math.abs(point[0] - center[0]) - halfWidth;
    const dy = Math.abs(point[1] - center[1]) - halfHeight;

    return Math.max(dx, dy);
  };
}

function line(p1, p2, thickness = 2) {
  return (point) => {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const baX = x2 - x1;
    const baY = y2 - y1;
    const paX = point[0] - x1;
    const paY = point[1] - y1;
    const h = Math.max(
      0,
      Math.min(1, (paX * baX + paY * baY) / (baX * baX + baY * baY))
    );
    const distanceX = paX - h * baX;
    const distanceY = paY - h * baY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance - thickness;
  };
}

function sdf(world, point) {
  let minDistance = Infinity;
  const numObjects = world.length;

  for (let i = 0; i < numObjects; i++) {
    const distance = world[i](point);

    if (distance === 0) {
      return 0;
    }

    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}


