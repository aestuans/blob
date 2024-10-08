use crate::blob::Blob;
use wasm_bindgen::prelude::*;
use web_sys::{
    window, WebGl2RenderingContext, WebGlBuffer, WebGlProgram, WebGlShader, WebGlUniformLocation,
};

pub struct Renderer {
    context: WebGl2RenderingContext,
    program: WebGlProgram,
    position_buffer: WebGlBuffer,
    uniforms: Uniforms,
    attributes: Attributes,
}

impl Renderer {
    pub fn new() -> Result<Renderer, String> {
        let document = window()
            .ok_or("No global window exists")?
            .document()
            .ok_or("Failed to get document")?;
        let canvas = document
            .get_element_by_id("canvas")
            .ok_or("Failed to get document element 'canvas'")?
            .dyn_into::<web_sys::HtmlCanvasElement>()
            .map_err(|_| "Failed to convert to HtmlCanvasElement")?;

        let window = window().ok_or("No global window exists")?;
        canvas.set_width(window.inner_width().unwrap().as_f64().unwrap() as u32);
        canvas.set_height(window.inner_height().unwrap().as_f64().unwrap() as u32);

        let context = canvas
            .get_context("webgl2")
            .map_err(|_|"Failed to get WebGL2 context")?
            .ok_or("Failed to get WebGL2 context")?
            .dyn_into::<WebGl2RenderingContext>()
            .map_err(|_| "Failed to convert to WebGl2RenderingContext")?;

        let vertex_shader = vertex_shader(&context)?;
        let fragment_shader = fragment_shader(&context)?;

        let program = context
            .create_program()
            .ok_or("Unable to create shader program")?;

        context.attach_shader(&program, &vertex_shader);
        context.attach_shader(&program, &fragment_shader);
        context.link_program(&program);

        if !context
            .get_program_parameter(&program, WebGl2RenderingContext::LINK_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            return Err(context
                .get_program_info_log(&program)
                .unwrap_or_else(|| String::from("Unknown error linking program")));
        }

        let position_buffer = setup_buffer(&context)?;

        let resolution = context
            .get_uniform_location(&program, "uResolution")
            .ok_or("Cannot find uniform location for uResolution")?;

        let blob_count = context
            .get_uniform_location(&program, "uBlobCount")
            .ok_or("Cannot find uniform location for uBlobCount")?;

        let vertex_position = context.get_attrib_location(&program, "aVertexPosition") as u32;

        let mut blob_centers = Vec::new();
        for i in 0..MAX_BLOBS {
            let uniform_name = format!("uBlobCenters[{}]", i);
            let location = context
                .get_uniform_location(&program, &uniform_name)
                .ok_or(format!("Cannot find uniform location for {}", uniform_name))?;
            blob_centers.push(location);
        }

        let uniforms = Uniforms {
            blob_centers,
            blob_count,
            resolution,
        };

        let attributes = Attributes { vertex_position };

        Ok(Renderer {
            context,
            program,
            position_buffer,
            uniforms,
            attributes,
        })
    }

    pub fn render(&self, blobs: &[Blob]) -> Result<(), String> {
        let context = &self.context;

        context.clear_color(1.0, 1.0, 1.0, 1.0);
        context.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);

        context.use_program(Some(&self.program));

        context.uniform2f(
            Some(&self.uniforms.resolution),
            context.drawing_buffer_width() as f32,
            context.drawing_buffer_height() as f32,
        );

        context.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.position_buffer),
        );

        context.vertex_attrib_pointer_with_i32(
            self.attributes.vertex_position,
            2,
            WebGl2RenderingContext::FLOAT,
            false,
            0,
            0,
        );

        context.enable_vertex_attrib_array(self.attributes.vertex_position);

        let count = std::cmp::min(blobs.len(), MAX_BLOBS);
        context.uniform1i(Some(&self.uniforms.blob_count), count as i32);

        for i in 0..count {
            let blob = &blobs[i];
            let x = blob.pos.x;
            let y = 1.0 - blob.pos.y; // Flip Y coordinate
            context.uniform2f(Some(&self.uniforms.blob_centers[i]), x, y);
        }

        context.draw_arrays(WebGl2RenderingContext::TRIANGLE_STRIP, 0, 4);

        Ok(())
    }
}

const MAX_BLOBS: usize = 40;
const BLOB_RADIUS: f32 = 0.02;

fn compile_shader(
    context: &WebGl2RenderingContext,
    shader_type: u32,
    source: &str,
) -> Result<WebGlShader, String> {
    let shader = context
        .create_shader(shader_type)
        .ok_or_else(|| String::from("Unable to create shader object"))?;
    context.shader_source(&shader, source);
    context.compile_shader(&shader);

    if context
        .get_shader_parameter(&shader, WebGl2RenderingContext::COMPILE_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        Ok(shader)
    } else {
        Err(context
            .get_shader_info_log(&shader)
            .unwrap_or_else(|| String::from("Unknown error creating shader")))
    }
}

/// Creates the vertex shader.
fn vertex_shader(context: &WebGl2RenderingContext) -> Result<WebGlShader, String> {
    compile_shader(
        &context,
        WebGl2RenderingContext::VERTEX_SHADER,
        r#"
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
        "#,
    )
}

/// Creates the fragment shader.
fn fragment_shader(context: &WebGl2RenderingContext) -> Result<WebGlShader, String> {
    compile_shader(
        &context,
        WebGl2RenderingContext::FRAGMENT_SHADER,
        &format!(
            r#"
            precision mediump float;
            uniform vec2 uResolution;
            uniform vec2 uBlobCenters[{MAX_BLOBS}];
            uniform int uBlobCount;

            float blobSDF(vec2 st, vec2 p, float r, float aspect) {{
                vec2 diff = p - st;
                diff.x *= aspect;
                return length(diff) - r;
            }}

            float polySmoothMin(float a, float b, float k) {{
                float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
                return mix(a, b, h) - k * h * (1.0 - h);
            }}

            void main() {{
                float aspect = uResolution.x / uResolution.y;
                vec2 st = gl_FragCoord.xy / uResolution;

                float d = 99.0;
                for (int i = 0; i < {MAX_BLOBS}; ++i) {{
                    if (i >= uBlobCount) {{
                        break;
                    }}
                    vec2 c = uBlobCenters[i];
                    float sdf = blobSDF(st, c, {BLOB_RADIUS}, aspect);
                    d = polySmoothMin(d, sdf, 0.1);
                }}

                float shape = 1.0 - smoothstep(0.0, 0.001, d);
                gl_FragColor = vec4(vec3(0.0, 0.1, 0.3), shape);
            }}
            "#,
            MAX_BLOBS = MAX_BLOBS,
            BLOB_RADIUS = BLOB_RADIUS
        ),
    )
}

struct Uniforms {
    blob_centers: Vec<WebGlUniformLocation>,
    blob_count: WebGlUniformLocation,
    resolution: WebGlUniformLocation,
}

struct Attributes {
    vertex_position: u32,
}

fn setup_buffer(context: &WebGl2RenderingContext) -> Result<WebGlBuffer, String> {
    let position_buffer = context
        .create_buffer()
        .ok_or("Failed to create buffer")?;
    context.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&position_buffer));

    let positions: [f32; 8] = [
        1.0, 1.0,    // Top Right
        -1.0, 1.0,   // Top Left
        1.0, -1.0,   // Bottom Right
        -1.0, -1.0,  // Bottom Left
    ];

    unsafe {
        let positions_array_buf_view = js_sys::Float32Array::view(&positions);

        context.buffer_data_with_array_buffer_view(
            WebGl2RenderingContext::ARRAY_BUFFER,
            &positions_array_buf_view,
            WebGl2RenderingContext::STATIC_DRAW,
        );    
    }

    Ok(position_buffer)
}