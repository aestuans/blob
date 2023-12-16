export const MAX_BLOBS = 25;
export const BLOB_RADIUS = 0.02;

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
    uniform vec2 uBlobCenters[${MAX_BLOBS}]; // Array of blob centers
    uniform int uBlobCount;        // Number of blobs

    float blobSDF(vec2 st, vec2 p, float r, float aspect)
    {
        vec2 diff = p - st;
        diff.x *= aspect;

        return length(diff) - r;
    }

    float polySmoothMin(float a, float b, float k)
    {
        float h = clamp(0.5 + 0.5*(a-b)/k, 0.0, 1.0);
        return mix(a, b, h) - k*h*(1.0-h);
    }

    void main() {
        float aspect = uResolution.x / uResolution.y;
        vec2 st = gl_FragCoord.xy / uResolution;

        float d = 99.;
        for (int i = 0; i < ${MAX_BLOBS}; ++i) {
            if (i >= uBlobCount) {
                break;
            }
            vec2 c = uBlobCenters[i];
            float sdf = blobSDF(st, c, ${BLOB_RADIUS}, aspect);
            d = polySmoothMin(d, sdf, 0.1);
        }

        float shape = 1. - smoothstep(0.0, 0.001, d);

        gl_FragColor = vec4(vec3(0., 0.1, 0.3), shape);
    }
`;

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
            blobCenters: [],
            blobCount: gl.getUniformLocation(shaderProgram, 'uBlobCount'),
        },
    };
    for (let i = 0; i < MAX_BLOBS; i++) {
        programInfo.uniformLocations.blobCenters.push(gl.getUniformLocation(shaderProgram, `uBlobCenters[${i}]`));
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

export function render(gl, programInfo, positionBuffer, blobs) {
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

    // Pass the blob data to the shader
    let count = Math.min(blobs.length, MAX_BLOBS);
    gl.uniform1i(programInfo.uniformLocations.blobCount, count);

    for (let i = 0; i < count; i++) {
        gl.uniform2f(programInfo.uniformLocations.blobCenters[i], blobs[i].pos.x, 1 - blobs[i].pos.y);
    }

    // Draw the blobs
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}