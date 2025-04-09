export class FSView {
  /** @type {string[]} */
  #currentPath = [];
  /** @type {function} */
  #onChange = () => {};

  /** @param onWrite {function} */
  constructor(onWrite) {
    this.#onChange = onWrite;
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

  /** @param pathParts {string[]} */
  changeDirAbs(pathParts) {
    this.#currentPath = pathParts;
    this.#onChange();
  }

  cwdDelim(delim) {
    return `${delim}${this.#currentPath.join(delim)}`;
  }

  cwd() {
    return this.cwdDelim("/");
  }

  /** @param entry {string} */
  relative(entry) {
    return this.relativeDelim(entry, "/");
  }

  relativeDelim(entry, delim) {
    if (entry === "..") {
      let copy = [...this.#currentPath];
      copy.splice(copy.length - 1, 1);
      return `${delim}${copy.join(delim)}`;
    } else if (entry === ".") {
      return this.cwdDelim(delim);
    }
    return `${this.cwdDelim(delim)}${delim}${entry}`;
  }

  hasSingleEntry(dirName) {
    return this.#currentPath.length === 1 && this.#currentPath[0] === dirName;
  }

  entries() {
    return this.#currentPath;
  }
}
