export class FSView {
  /** @type {string[]} */
  #currentPath = [];
  /** @type {function} */
  #onChange;

  /** @param onWrite {function} */
  constructor(onChange = () => {}) {
    this.#onChange = onChange;
  }

  /** @param dirName {string} */
  changeDir(dirName) {
    if (dirName === ".") {
      return;
    } else if (dirName === "..") {
      this.#currentPath.pop();
      this.#onChange();
    } else {
      this.#currentPath.push(dirName);
      this.#onChange();
    }
  }

  cwd() {
    return `/${this.#currentPath.join("/")}`;
  }

  /** @param entry {string} */
  relative(entry) {
    return `${this.cwd()}/${entry}`;
  }
}
