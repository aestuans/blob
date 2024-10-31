# blob

A showcase of wasm and WebGL in Rust through a simple 2D fluid and gravity simulation: https://aestuans.github.io/blob/

## Build

1. Install `wasm-pack`
```
cargo install wasm-pack
```

2. Generate the wasm module

```
wasm-pack build --release --target web --out-dir dist/
```

4. Run with a simple http server. Such as:
```
python -m http.server
```
