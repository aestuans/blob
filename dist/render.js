export class Renderer {
    MAX_BLOBS = 40;
    BLOB_RADIUS = 0.02;
    // Vertex shader source
    vsSource = `
    attribute vec4 aVertexPosition;
    void main() {
        gl_Position = aVertexPosition;
    }
    `;
    // Fragment shader source
    fsSource = `
    precision mediump float;
    uniform vec2 uResolution;
    uniform vec2 uBlobCenters[${this.MAX_BLOBS}];
    uniform int uBlobCount;

    float blobSDF(vec2 st, vec2 p, float r, float aspect) {
        vec2 diff = p - st;
        diff.x *= aspect;
        return length(diff) - r;
    }

    float polySmoothMin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
        return mix(a, b, h) - k * h * (1.0 - h);
    }

    void main() {
        float aspect = uResolution.x / uResolution.y;
        vec2 st = gl_FragCoord.xy / uResolution;

        float d = 99.0;
        for (int i = 0; i < ${this.MAX_BLOBS}; ++i) {
            if (i >= uBlobCount) {
                break;
            }
            vec2 c = uBlobCenters[i];
            float sdf = blobSDF(st, c, ${this.BLOB_RADIUS}, aspect);
            d = polySmoothMin(d, sdf, 0.1);
        }

        float shape = 1.0 - smoothstep(0.0, 0.001, d);
        gl_FragColor = vec4(vec3(0.0, 0.1, 0.3), shape);
    }
    `;
    gl;
    programInfo;
    constructor() {
        this.gl = this.getGl();
        const vertexShader = this.loadShader(this.gl, this.gl.VERTEX_SHADER, this.vsSource);
        const fragmentShader = this.loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.fsSource);
        const positionBuffer = this.setupBuffer(this.gl);
        if (!vertexShader || !fragmentShader || !positionBuffer) {
            throw new Error('Failed to initialize WebGL');
        }
        const shaderProgram = this.gl.createProgram();
        if (!shaderProgram) {
            throw new Error('Failed to create shader program');
        }
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            throw new Error('Failed to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
        }
        this.programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                resolution: this.gl.getUniformLocation(shaderProgram, 'uResolution'),
                blobCenters: [],
                blobCount: this.gl.getUniformLocation(shaderProgram, 'uBlobCount')
            },
            positionBuffer: positionBuffer,
        };
        for (let i = 0; i < this.MAX_BLOBS; i++) {
            this.programInfo.uniformLocations.blobCenters.push(this.gl.getUniformLocation(shaderProgram, `uBlobCenters[${i}]`));
        }
    }
    render(blobs) {
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.programInfo.program);
        this.gl.uniform2f(this.programInfo.uniformLocations.resolution, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.programInfo.positionBuffer);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 2, // Number of components per iteration
        this.gl.FLOAT, // Data type
        false, // Normalize
        0, // Stride
        0 // Offset
        );
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        let count = Math.min(blobs.length, this.MAX_BLOBS);
        this.gl.uniform1i(this.programInfo.uniformLocations.blobCount, count);
        for (let i = 0; i < count; i++) {
            this.gl.uniform2f(this.programInfo.uniformLocations.blobCenters[i], blobs[i].x, 1 - blobs[i].y);
        }
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    getGl() {
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
    loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        if (!shader) {
            alert('Unable to create shader');
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    setupBuffer(gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        return positionBuffer;
    }
}
