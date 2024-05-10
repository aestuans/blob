import { Renderer } from './render.js';
import init, { Blob, Config } from '../dist/blob.js';
// Initialize the WebAssembly module
await init();
class FpsCounter {
    times = [];
    fpsElement;
    constructor() {
        this.fpsElement = document.getElementById('fps');
        ;
    }
    run() {
        const now = performance.now();
        while (this.times.length > 0 && this.times[0] <= now - 1000) {
            this.times.shift();
        }
        this.times.push(now);
        const fps = this.times.length;
        this.fpsElement.textContent = `FPS: ${fps}`;
    }
}
let renderer = new Renderer();
let fpsCounter = new FpsCounter();
let blobs = [];
for (let i = 0; i < renderer.MAX_BLOBS; i++) {
    blobs.push(new Blob(new Config(2e-2, 2e-4, 5e-3, 1e-2, 5e-1)));
}
let mouseX = 0.5;
let mouseY = 0.5;
function updatePosition(x, y) {
    mouseX = x / window.innerWidth;
    mouseY = y / window.innerHeight;
}
document.addEventListener('mousemove', (e) => {
    updatePosition(e.clientX, e.clientY);
});
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        updatePosition(touch.clientX, touch.clientY);
    }
}, { passive: false });
function drawScene() {
    blobs.forEach(blob => {
        blob.update(mouseX, mouseY);
    });
    renderer.render(blobs);
    fpsCounter.run();
    requestAnimationFrame(drawScene);
}
drawScene();
