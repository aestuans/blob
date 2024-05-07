/* tslint:disable */
/* eslint-disable */
/**
*/
export class Blob {
  free(): void;
/**
* @param {Config} config
*/
  constructor(config: Config);
/**
* @param {number} target_x
* @param {number} target_y
*/
  update(target_x: number, target_y: number): void;
/**
*/
  config: Config;
/**
*/
  readonly x: number;
/**
*/
  readonly y: number;
}
/**
*/
export class Config {
  free(): void;
/**
* @param {number} max_speed
* @param {number} gravity
* @param {number} min_distance
* @param {number} friction
* @param {number} time_step
*/
  constructor(max_speed: number, gravity: number, min_distance: number, friction: number, time_step: number);
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_config_free: (a: number) => void;
  readonly config_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly __wbg_blob_free: (a: number) => void;
  readonly __wbg_get_blob_config: (a: number) => number;
  readonly __wbg_set_blob_config: (a: number, b: number) => void;
  readonly blob_new: (a: number) => number;
  readonly blob_x: (a: number) => number;
  readonly blob_y: (a: number) => number;
  readonly blob_update: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
