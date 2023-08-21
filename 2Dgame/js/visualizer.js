const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const analyser = audioContext.createAnalyser();
analyser.fftSize = 4096 * 8;
// fftSize Is Important

const vcanvas = document.getElementById("visualizer");
vcanvas.width = window.innerWidth;
vcanvas.height = window.innerWidth / 5;
const vctx = vcanvas.getContext("2d");

const audio = new Audio();
audio.src = "assets/audio.weba";
audio.crossOrigin = "anonymous";
audio.loop = true;

const source = audioContext.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioContext.destination);

// Math.floor(Math.random() * 400) or 0
const offset = 600;
function render() {
  vctx.clearRect(0, 0, vcanvas.width, vcanvas.height);

  if (!audio.paused) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const barWidth = vcanvas.width / 256; // adjust

    for (let i = 0; i < 256; i++) {
      const barHeight = (dataArray[i + offset] / 255) * vcanvas.height;
      const x = i * barWidth;
      const y = vcanvas.height - barHeight;

      vctx.fillStyle = "white";
      vctx.fillRect(x, y, barWidth, Math.log2(barHeight));
    }
  }

  requestAnimationFrame(render);
}

document.addEventListener("click", () => {
  audioContext.resume();
  audio.play();
});

document.addEventListener("keydown", () => {
  audioContext.resume();
  audio.play();
});

render();
