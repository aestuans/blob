// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    void main() {
        gl_Position = aVertexPosition;
    }
`;

// Fragment shader program
const fsSource = `
    precision mediump float;
    uniform vec2 uResolution;
    uniform vec2 uCircleCenters[10]; // Array of circle centers
    uniform float uCircleRadii[10];  // Array of circle radii
    uniform int uCircleCount;        // Number of circles

    float circleSDF(vec2 st, vec2 p, float r, float aspect)
    {
        vec2 diff = p - st;
        diff.x *= aspect;

        return length(diff) - r;
    }

    // Polynomial smooth min
    float smin(float a, float b, float k)
    {
        float h = max( k-abs(a-b), 0.0 )/k;
        return min( a, b ) - h*h*k*(1.0/4.0);
    }

    void main() {
        float aspect = uResolution.x / uResolution.y;
        vec2 st = gl_FragCoord.xy / uResolution;

        float d = 99.;
        for (int i = 0; i < 20; ++i) {
            if (i >= uCircleCount) {
                break;
            }

            vec2 c = uCircleCenters[i];
            float sdf = circleSDF(st, c, uCircleRadii[i], aspect);

            // sdf*=aspect;
            d = smin(d, sdf, 0.1);
        }

        float shape = smoothstep(0.0, 0.001, d);

        gl_FragColor = vec4(vec3(shape), 1.0);
    }
`;

const MAX_CIRCLES = 20;

// Creates a shader of the given type, uploads the source and compiles it.
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export function getGl() {
    const canvas = document.getElementById('webglCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        throw new Error('WebGL not supported');
    }

    return gl;   
}

export function setupShaderProgram(gl) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, 'uResolution'),
            circleCenters: [],
            circleRadii: [],
            circleCount: gl.getUniformLocation(shaderProgram, 'uCircleCount'),
        },
    };
    for (let i = 0; i < MAX_CIRCLES; i++) {
        programInfo.uniformLocations.circleCenters.push(gl.getUniformLocation(shaderProgram, `uCircleCenters[${i}]`));
        programInfo.uniformLocations.circleRadii.push(gl.getUniformLocation(shaderProgram, `uCircleRadii[${i}]`));
    }

    return programInfo;
}

export function setupBuffer(gl) {
    // Set up the buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
         1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
        -1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return positionBuffer;
}

export function render(gl, programInfo, positionBuffer, circles) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set the shader program
    gl.useProgram(programInfo.program);

    // Set the resolution
    gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);

    // Tell WebGL how to pull out the positions from the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        2, // Num components per iteration
        gl.FLOAT, // Type of data
        false, // Normalize
        0, // Stride
        0 // Offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Pass the circle data to the shader
    let count = Math.min(circles.length, MAX_CIRCLES);
    gl.uniform1i(programInfo.uniformLocations.circleCount, count);

    for (let i = 0; i < count; i++) {
        gl.uniform2f(programInfo.uniformLocations.circleCenters[i], circles[i].x, circles[i].y);
        gl.uniform1f(programInfo.uniformLocations.circleRadii[i], circles[i].radius);
    }

    // Draw the circles
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}