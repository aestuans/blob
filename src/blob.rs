use nalgebra::{Vector2, clamp};
use rand::distributions::Uniform;
use rand::Rng;

#[derive(Clone, Copy)]
pub struct Config {
    pub max_speed: f32,
    pub gravity: f32,
    pub min_distance: f32,
    pub friction: f32,
    pub time_step: f32,
}

pub struct Blob {
    pub pos: Vector2<f32>,
    pub config: Config,
    velocity: Vector2<f32>,
}

impl Blob {
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

    pub fn update(&mut self, target_x: f32, target_y: f32) {
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
