import { getGl, setupShaderProgram, setupBuffer, render } from './render.js';


const gl = getGl();
const programInfo = setupShaderProgram(gl);
const positionBuffer = setupBuffer(gl);

export class Circle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = Math.random() * 0.01 - 0.005;
        this.dy = Math.random() * 0.01 - 0.005;
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;

        if (this.x < 0 || this.x > 1) this.dx *= -1;
        if (this.y < 0 || this.y > 1) this.dy *= -1;
    }
}

let circles = [];
for (let i = 0; i < 10; i++) {
    circles.push(new Circle(Math.random(), Math.random(), 0.05));
}

function drawScene() {
    circles.forEach(circle => {
        circle.move();
    });

    render(gl, programInfo, positionBuffer, circles);

    requestAnimationFrame(drawScene);
}

drawScene();
