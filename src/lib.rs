use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{HtmlDivElement, MouseEvent, TouchEvent};

mod render;
use crate::render::Renderer;

mod blob;
use crate::blob::{Blob, Config};

use std::rc::Rc;
use std::cell::RefCell;
use std::collections::VecDeque;

#[wasm_bindgen(start)]
pub fn run_app() -> Result<(), JsValue> {
    let fps_counter = FpsCounter::new()?;

    let renderer = Renderer::new().map_err(|e| JsValue::from_str(&e))?;

    let blobs = (0..40)
        .map(|_| {
            let config = Config {
                max_speed: 2e-2,
                gravity: 2e-4,
                min_distance: 5e-3,
                friction: 1e-2,
                time_step: 5e-1,
            };
            Blob::new(config)
        })
        .collect();

    let app = Rc::new(RefCell::new(App {
        renderer,
        fps_counter,
        blobs,
        mouse_x: 0.5,
        mouse_y: 0.5,
    }));

    setup_event_listeners(&app)?;
    start_animation_loop(&app)?;

    Ok(())    // Start the animation loop

}

fn setup_event_listeners(app: &Rc<RefCell<App>>) -> Result<(), JsValue> {
    let document = web_sys::window().unwrap().document().unwrap();

    let app_clone = Rc::clone(app);
    // Mouse move event
    let mouse_move_closure = Closure::wrap(Box::new(move |event: MouseEvent| {
        let window = web_sys::window().unwrap();
        let mut app = app_clone.borrow_mut();
        app.mouse_x = event.client_x() as f32 / window.inner_width().unwrap().as_f64().unwrap() as f32;
        app.mouse_y = event.client_y() as f32 / window.inner_height().unwrap().as_f64().unwrap() as f32;
    }) as Box<dyn FnMut(_)>);
    document.add_event_listener_with_callback("mousemove", mouse_move_closure.as_ref().unchecked_ref())?;
    mouse_move_closure.forget();

    let app_clone = Rc::clone(app);
    // Touch move event
    let touch_move_closure = Closure::wrap(Box::new(move |event: TouchEvent| {
        event.prevent_default();
        let window = web_sys::window().unwrap();
        let mut app = app_clone.borrow_mut();
        if let Some(touch) = event.touches().get(0) {
            app.mouse_x = touch.client_x() as f32 / window.inner_width().unwrap().as_f64().unwrap() as f32;
            app.mouse_y = touch.client_y() as f32 / window.inner_height().unwrap().as_f64().unwrap() as f32;
        }
    }) as Box<dyn FnMut(_)>);
    document.add_event_listener_with_callback("touchmove", touch_move_closure.as_ref().unchecked_ref())?;
    touch_move_closure.forget();

    Ok(())
}

fn start_animation_loop(app: &Rc<RefCell<App>>) -> Result<(), JsValue> {
    let f: Rc<RefCell<Option<Closure<dyn FnMut()>>>> = Rc::new(RefCell::new(None));
    let g: Rc<RefCell<Option<Closure<dyn FnMut()>>>> = f.clone();

    let app_clone = Rc::clone(app);

    *g.borrow_mut() = Some(Closure::wrap(Box::new(move || {
        {
            let mut app = app_clone.borrow_mut();
            if let Err(e) = app.draw_scene() {
                web_sys::console::error_1(&e);
            }
        }
        // Schedule the next frame
        web_sys::window().unwrap()
            .request_animation_frame(f.borrow().as_ref().unwrap().as_ref().unchecked_ref())
            .expect("Failed to request animation frame");
    }) as Box<dyn FnMut()>));

    // Start the loop
    web_sys::window().unwrap()
        .request_animation_frame(g.borrow().as_ref().unwrap().as_ref().unchecked_ref())
        .expect("Failed to start animation loop");

    Ok(())
}

struct App {
    renderer: Renderer,
    fps_counter: FpsCounter,
    blobs: Vec<Blob>,
    mouse_x: f32,
    mouse_y: f32,
}

impl App {
    fn draw_scene(&mut self) -> Result<(), JsValue> {
        for blob in &mut self.blobs {
            blob.update(self.mouse_x, self.mouse_y);
        }
        self.renderer.render(&self.blobs).map_err(|e| JsValue::from_str(&e))?;
        self.fps_counter.run();
        Ok(())
    }
}

pub struct FpsCounter {
    times: VecDeque<f64>,
    fps_element: HtmlDivElement,
}

impl FpsCounter {
    pub fn new() -> Result<FpsCounter, JsValue> {
        let document = web_sys::window().unwrap().document().unwrap();
        let fps_element = document.get_element_by_id("fps")
            .ok_or("Cannot find element with id 'fps'")?
            .dyn_into::<HtmlDivElement>()?;
        Ok(FpsCounter {
            times: VecDeque::new(),
            fps_element,
        })
    }

    pub fn run(&mut self) {
        let now = js_sys::Date::now();
        while let Some(&front) = self.times.front() {
            if front <= now - 1000.0 {
                self.times.pop_front();
            } else {
                break;
            }
        }
        self.times.push_back(now);
        let fps = self.times.len();
        self.fps_element.set_text_content(Some(&format!("FPS: {}", fps)));
    }
}
