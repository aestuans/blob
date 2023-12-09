import { getGl, setupShaderProgram, setupBuffer, render } from './render.js';

const gl = getGl();
const programInfo = setupShaderProgram(gl);
const positionBuffer = setupBuffer(gl);

let mouseX = 0.5; // Middle of the screen
let mouseY = 0.5; // Middle of the screen

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        const ret = new Vec2(this.x, this.y);
        ret.x += vector.x;
        ret.y += vector.y;
        return ret;
    }

    subtract(vector) {
        const ret = new Vec2(this.x, this.y);
        ret.x -= vector.x;
        ret.y -= vector.y;
        return ret;
    }

    scale(scalar) {
        const ret = new Vec2(this.x, this.y);
        ret.x *= scalar;
        ret.y *= scalar;
        return ret;
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    normalize() {
        const mag = this.magnitude();
        return new Vec2(this.x / mag, this.y / mag);
    }
}

class Blob {
    static maxSpeed = 0.7;
    static gravityConstant = 0.0015;
    static repulsionConstant = 0.00005;
    static momentum = 0.9;

    constructor(pos, radius) {
        this.pos = pos;
        this.radius = radius;

        this.velocity = new Vec2(0, 0);
        this.prevVelocity = new Vec2(0, 0);

        const randomVelocity = function() {
            return Math.random() * (Blob.maxSpeed - Blob.minSpeed) + Blob.minSpeed;
        }

        this.velocity = new Vec2(randomVelocity(), randomVelocity());
    }

    move() {
        // Apply gravity-like attraction towards cursor
        const dMouse = new Vec2(mouseX, mouseY).subtract(this.pos);
        const distance = dMouse.magnitude() * 2;
        const forceMagnitude = Blob.gravityConstant / (distance * distance);
        let force = dMouse.normalize().scale(forceMagnitude);

        if (distance < 0.1) {
            force = force.scale(distance * distance);
        }

        this.velocity = this.prevVelocity.scale(Blob.momentum).add(force);

        // Limit velocity
        if (this.velocity.magnitude() > Blob.maxSpeed) {
            this.velocity = this.velocity.normalize().scale(Blob.maxSpeed);
            this.momentum = this.velocity.scale(this.mass);
        }

        this.prevVelocity = this.velocity;

        // Update position
        this.pos = this.pos.add(this.velocity.scale(0.1));

        // Boundary reflection
        if (this.pos.x < 0 || this.pos.x > 1)
        {
            this.prevVelocity.x *= -1;
            // this.momentum.x *= -1;
        }
        if (this.pos.y < 0 || this.pos.y > 1)
        {
            this.prevVelocity.y *= -1;
            // this.momentum.y *= -1;
        }
    }
}



let blobs = [];
for (let i = 0; i < 20; i++) {
    blobs.push(new Blob(new Vec2(Math.random(), Math.random()), 0.02));
}

function calculateFPS() {
    const now = performance.now();
    while (times.length > 0 && times[0] <= now - 1000) {
        times.shift();
    }
    times.push(now);
    const fps = times.length;
    fpsElement.textContent = `FPS: ${fps}`;
}
let times = [];
let fpsElement = document.getElementById('fps');

function drawScene() {
    blobs.forEach(circle => {
        circle.move();
    });

    render(gl, programInfo, positionBuffer, blobs);

    calculateFPS();

    requestAnimationFrame(drawScene);
}

// Track cursor position
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
});

drawScene();
