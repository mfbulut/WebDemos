const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const sprites = [];
const camera = {
  x: 0,
  y: 0,
  zoom: 1,
};

const SpriteList = document.getElementById("sprites");

const displayElements = {
  name: document.getElementById("NameDisplay"),
  x: document.getElementById("PositionXDisplay"),
  y: document.getElementById("PositionYDisplay"),
  width: document.getElementById("ImageWidthDisplay"),
  height: document.getElementById("ImageHeightDisplay"),
};

const inputElements = {
  x: document.getElementById("PositionX"),
  y: document.getElementById("PositionY"),
  width: document.getElementById("ImageWidth"),
  height: document.getElementById("ImageHeight"),
  ImageFile: document.getElementById("ImageFile"),
};

const handleFileInput = (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.src = e.target.result;
    img.onload = function () {
      const sprite = {
        image: img,
        name: file.name,
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      };
      sprites.push(sprite);
      render();
    };
  };
  reader.readAsDataURL(file);
};

Object.entries(inputElements).forEach(([key, element]) => {
  if (key === "ImageFile") {
    element.addEventListener("change", handleFileInput);
    return;
  }

  element.addEventListener("input", () => {
    selectedSprite && (selectedSprite[key.toLowerCase()] = element.value);
    render();
  });
});

const defaultImage = new Image();
defaultImage.src = "images.png";
defaultImage.onload = () => {
  sprites.push({
    x: 0,
    y: 0,
    width: 150,
    height: 200,
    name: "images.png",
    image: defaultImage,
  });
  selectedSprite = sprites[0];
  render();
};

let gridSize = 32;
function render() {
  if (selectedSprite) {
    Object.entries(displayElements).forEach(([key, element]) => {
      element.innerText = selectedSprite[key.toLowerCase()];
      if (key === "name") {
        element.innerText += " - " + sprites.indexOf(selectedSprite);
      }
    });
    Object.entries(inputElements).forEach(([key, element]) => {
      if (key === "ImageFile") return;
      element.value = selectedSprite[key.toLowerCase()];
    });
  }

  SpriteList.innerHTML = "<legend>Sprites</legend>";
  sprites.forEach((sprite, index) => {
    let label = document.createElement("label");
    label.innerText = sprite.name + " - " + index;

    let input = document.createElement("input");
    input.type = "radio";
    input.value = index;
    input.name = "sprites";
    if (sprite === selectedSprite) {
      input.checked = true;
    }

    input.onclick = function () {
      selectedSprite = sprites[this.value];
    };

    SpriteList.appendChild(label);
    SpriteList.appendChild(input);
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(camera.x, camera.y);

  if (gridSize <= Math.max(canvas.width, canvas.height)) {
    const grid = new Path2D();
    for (let i = -canvas.width; i < canvas.width; i += gridSize) {
      grid.moveTo(i, -canvas.height);
      grid.lineTo(i, canvas.height);
    }
    for (let i = -canvas.height; i < canvas.height; i += gridSize) {
      grid.moveTo(-canvas.width, i);
      grid.lineTo(canvas.width, i);
    }
    ctx.stroke(grid);
  }

  sprites.forEach((sprite) => {
    ctx.drawImage(
      sprite.image,
      sprite.x - sprite.width / 2,
      sprite.y - sprite.height / 2,
      sprite.width,
      sprite.height
    );
  });
  ctx.restore();
}

let selectedSprite = null;
let copiedSprite = null;
let isHolding = false;
let offsetX = 0;
let offsetY = 0;

canvas.addEventListener("mousedown", (event) => {
  const mouseX =
    (event.clientX - canvas.offsetLeft - canvas.width / 2) / camera.zoom -
    camera.x;
  const mouseY =
    (event.clientY - canvas.offsetTop - canvas.height / 2) / camera.zoom -
    camera.y;

  sprites.forEach((sprite) => {
    if (
      mouseX >= sprite.x - sprite.width / 2 &&
      mouseX <= sprite.x + sprite.width / 2 &&
      mouseY >= sprite.y - sprite.height / 2 &&
      mouseY <= sprite.y + sprite.height / 2
    ) {
      selectedSprite = sprite;
      selectedSprite.originalWidth = sprite.width;
      selectedSprite.originalHeight = sprite.height;
      selectedSprite.originalX = sprite.x;
      selectedSprite.originalY = sprite.y;
      selectedSprite.mouseX = mouseX;
      selectedSprite.mouseY = mouseY;
      isHolding = true;
      render();
    }
  });
});

canvas.addEventListener("mousemove", (event) => {
  if (event.buttons === 4) {
    camera.x += event.movementX / camera.zoom;
    camera.y += event.movementY / camera.zoom;
    render();
  }

  if (isHolding && event.buttons & 1) {
    selectedSprite.x =
      selectedSprite.originalX +
      (event.clientX - canvas.offsetLeft - canvas.width / 2) / camera.zoom -
      camera.x -
      selectedSprite.mouseX;

    selectedSprite.y =
      selectedSprite.originalY +
      (event.clientY - canvas.offsetTop - canvas.height / 2) / camera.zoom -
      camera.y -
      selectedSprite.mouseY;
    render();
  }

  if (isHolding && event.buttons & 2) {
    if (selectedSprite) {
      let scaleWidth = 2;
      let scaleHeight = 2;
      if (event.shiftKey) {
        scaleWidth =
          selectedSprite.originalWidth /
          (selectedSprite.mouseX - selectedSprite.originalX);
        scaleHeight =
          selectedSprite.originalHeight /
          (selectedSprite.mouseY - selectedSprite.originalY);
      }

      const newWidth = Math.abs(
        selectedSprite.originalWidth +
          ((event.clientX -
            canvas.offsetLeft -
            canvas.width / 2 -
            (selectedSprite.mouseX + camera.x) * camera.zoom) *
            scaleWidth) /
            camera.zoom
      );

      const newHeight = Math.abs(
        selectedSprite.originalHeight +
          ((event.clientY -
            canvas.offsetTop -
            canvas.height / 2 -
            (selectedSprite.mouseY + camera.y) * camera.zoom) *
            scaleHeight) /
            camera.zoom
      );

      if (event.ctrlKey) {
        selectedSprite.width = newWidth;
        selectedSprite.height =
          newWidth *
          (selectedSprite.originalHeight / selectedSprite.originalWidth);
      } else {
        selectedSprite.width = newWidth;
        selectedSprite.height = newHeight;
      }

      render();
    }
  }
});

canvas.addEventListener("mouseup", (event) => {
  isHolding = false;
});

canvas.addEventListener("mousewheel", (event) => {
  if (event.ctrlKey) {
    event.preventDefault();
    gridSize *= 1 + event.deltaY * -0.001;
  } else {
    camera.zoom *= 1 + event.deltaY * -0.001;
  }
  render();
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

let upscaleRate = 2;
document.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyC":
      if (event.ctrlKey) {
        if (event.shiftKey) {
          event.preventDefault();
          selectedSprite && (copiedSprite = selectedSprite);
        } else {
          selectedSprite && (copiedSprite = { ...selectedSprite });
        }
      }
      break;
    case "KeyV":
      if (event.ctrlKey) {
        copiedSprite && sprites.push({ ...copiedSprite });
        render();
      }
      break;
    case "KeyZ":
      if (event.ctrlKey && selectedSprite) {
        selectedSprite.x = selectedSprite.originalX;
        selectedSprite.y = selectedSprite.originalY;
        selectedSprite.width = selectedSprite.originalWidth;
        selectedSprite.height = selectedSprite.originalHeight;
        render();
      }
      break;
    case "KeyS":
      if (event.ctrlKey) {
        if (event.shiftKey) {
          event.preventDefault();
          canvas.width *= upscaleRate;
          canvas.height *= upscaleRate;
          camera.zoom *= upscaleRate;
          render();
        } else {
          event.preventDefault();
          const dataURL = canvas.toDataURL();
          const link = document.createElement("a");
          link.download = "image.png";
          link.href = dataURL;
          link.click();
        }
        if (!event.shiftKey) {
          canvas.width /= upscaleRate;
          canvas.height /= upscaleRate;
          camera.zoom /= upscaleRate;
          render();
        }
      }
      break;
    case "KeyT":
      if (selectedSprite) {
        sprites.splice(sprites.indexOf(selectedSprite), 1);
        sprites.push(selectedSprite);
        render();
      }
      break;
    default:
      break;
  }
});

canvas.addEventListener("drop", (event) => {
  event.preventDefault();

  for (let file of event.dataTransfer.files) {
    let image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      let rect = canvas.getBoundingClientRect();
      let x = (event.clientX - rect.left) / camera.zoom - camera.x;
      let y = (event.clientY - rect.top) / camera.zoom - camera.y;
      sprites.push({
        image: image,
        x: x - image.width,
        y: y - image.height,
        width: image.width,
        height: image.height,
      });
      render();
    };
  }
});

canvas.addEventListener("dragover", (event) => {
  event.preventDefault();
});
