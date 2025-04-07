// This is a proxy over the pair of resolve and reject functions
// of a promise
export class Resolver {
  /** @type {function | null} */
  #resolve;
  /** @type {function | null} */
  #reject;
  constructor(resolve = null, reject = null) {
    this.#resolve = resolve;
    this.#reject = reject;
  }
  /** @param value {any} */
  resolve(value) {
    if (this.#resolve === null) {
      return false;
    }
    this.#resolve(value);
    return true;
  }
  /** @param msg {string} */
  reject(msg) {
    if (this.#reject === null) {
      return false;
    }
    this.#reject(msg);
    return true;
  }
}
