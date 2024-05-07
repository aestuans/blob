extern crate nalgebra as na;
extern crate rand;
extern crate wasm_bindgen;

use na::{Vector2, clamp};
use rand::distributions::Uniform;
use rand::Rng;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct Config {
    max_speed: f64,
    gravity: f64,
    min_distance: f64,
    friction: f64,
    time_step: f64,
}

#[wasm_bindgen]
impl Config {
    // For instantiation from JS
    #[wasm_bindgen(constructor)]
    pub fn new(max_speed: f64, gravity: f64, min_distance: f64, friction: f64, time_step: f64) -> Config {
        Config {
            max_speed: max_speed,
            gravity: gravity,
            min_distance: min_distance,
            friction: friction,
            time_step: time_step
        }
    }
}

#[wasm_bindgen]
pub struct Blob {
    pos: Vector2<f64>,
    velocity: Vector2<f64>,
    pub config: Config
}

#[wasm_bindgen]
impl Blob {
    #[wasm_bindgen(constructor)]
    pub fn new(config: Config) -> Blob {
        let mut rng = rand::thread_rng();

        let pos_dist = Uniform::new(0.0, 1.0);
        let vel_dist = Uniform::new(0.0, config.max_speed);

        Blob {
            pos: Vector2::new(rng.sample(pos_dist), rng.sample(pos_dist)),
            velocity: Vector2::new(rng.sample(vel_dist), rng.sample(vel_dist)),
            config: config
        }
    }

    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f64 {
        self.pos.x
    }

    #[wasm_bindgen(getter)]
    pub fn y(&self) -> f64 {
        self.pos.y
    }

    #[wasm_bindgen]
    pub fn update(&mut self, target_x: f64, target_y: f64) {
        let target = Vector2::new(target_x, target_y);

        let r = target - self.pos;
        let r_norm_squared = r.norm_squared();

        let acceleration;
        if r_norm_squared > self.config.min_distance {
            acceleration = self.config.gravity * r / r_norm_squared;
        }
        else {
            acceleration = -self.config.friction * self.velocity;
        }

        self.velocity += acceleration;


        if self.velocity.norm() > self.config.max_speed {
            self.velocity = self.velocity.normalize() * self.config.max_speed;
        }

        self.pos += self.velocity * self.config.time_step;

        // Boundary reflection
        if self.pos.x < 0.0 || self.pos.x > 1.0 {
            self.velocity.x = -self.velocity.x;
            self.pos.x = clamp(self.pos.x, 0.0, 1.0);
        }
        if self.pos.y < 0.0 || self.pos.y > 1.0 {
            self.velocity.y = -self.velocity.y;
            self.pos.y = clamp(self.pos.y, 0.0, 1.0);
        }
    }
}
