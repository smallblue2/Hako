export class BrowserFileSystem {
  constructor() {
    this.root = null; // root of filesystem
  }

  // Initialises filesystem
  async initialise() {
    if (!window.showDirectoryPicker) {
      console.error("Directory Picker API is not supported in this browser.");
      return;
    }

    // Asks the user to select the root
    const mode = "readwrite";
    try {
      this.root = await window.showDirectoryPicker({ mode });
      console.log("Root directory selected:", this.root);
    } catch (err) {
      if (err.name == "AbortError") {
        console.log("User aborted root file selection");
      }
      if (err.name == "SecurityError") {
        console.log("User refused security permissions required");
      }
      alert("In order to use this web-app, you must select a directory and provide permissions. Please try again.")
      return;
    }
  }

  /**
   * Creates a file in the given directory handle.
   * 
   * @param {string} name - The name of the file to be created.
   * @param {FileSystemDirectoryHandle} fileHandle - The directory handle where the file should be created.
   * @returns {Promise<FileSystemFileHandle|undefined>} - Resolves to the file handle of the newly created file, or undefined if an error occurs.
   * 
   * @description
   * This function attempts to create a new file with the specified name inside the provided directory handle.
   * If the operation fails due to permission issues, an invalid name, or a conflicting directory, the error
   * is caught, logged, and the function resolves to `undefined`.
   * 
   * @example
   * const directoryHandle = await window.showDirectoryPicker();
   * const fileHandle = await createFile('example.txt', directoryHandle);
   * if (fileHandle) {
   *   console.log('File created successfully:', fileHandle);
   * } else {
   *   console.log('Failed to create file.');
   * }
   */
  async createFile(name, fileHandle) {
    try {
      const newFileHandle = await fileHandle.getFileHandle(name, { create: true });
      console.log("Created a new file ", newFileHandle);
      return newFileHandle;
    } catch (err) {
      if (err.name == "NotAllowedError") {
        console.log("Failed to write file", name);
      }
      if (err.name == "TypeError") {
        console.log("Name", name, "is invalid");
      }
      if (err.name == "TypeMismatchError") {
        console.log("Tried to save", name, "as a file, but exists as a directory");
      }
      // Also throws "NotFoundError", but can't be thrown as we have 'create: true'.
    }
  }

  /**
   * Creates a directory in the given directory handle.
   * 
   * @param {string} name - The name of the directory to be created.
   * @param {FileSystemDirectoryHandle} fileHandle - The directory handle where the new directory should be created.
   * @returns {Promise<FileSystemDirectoryHandle|undefined>} - Resolves to the handle of the newly created directory, or undefined if an error occurs.
   * 
   * @description
   * This function attempts to create a new directory with the specified name inside the provided directory handle.
   * If the operation fails due to permission issues, an invalid name, or a conflicting file, the error is caught,
   * logged, and the function resolves to `undefined`.
   * 
   * @example
   * const directoryHandle = await window.showDirectoryPicker();
   * const newDirHandle = await createDirectory('subfolder', directoryHandle);
   * if (newDirHandle) {
   *   console.log('Directory created successfully:', newDirHandle);
   * } else {
   *   console.log('Failed to create directory.');
   * }
   */
  async createDirectory(name, fileHandle) {
    try {
      const newDirHandle = await fileHandle.getDirectoryHandle(name, { create: true });
      console.log("Created a new directory ", newDirHandle);
      return newDirHandle;
    } catch (err) {
      if (err.name == "NotAllowedError") {
        console.log("Failed to write directory", name);
      }
      if (err.name == "TypeError") {
        console.log("Name", name, "is invalid");
      }
      if (err.name == "TypeMismatchError") {
        console.log("Tried to save", name, "as a directory, but exists as a file");
      }
      // Also throws "NotFoundError", but can't be thrown as we have 'create: true'.
    }
  }

  /**
   * Checks if a file or directory exists in the given directory.
   *
   * @param {FileSystemDirectoryHandle} directoryHandle - The directory handle to search in.
   * @param {string} name - The name of the entry (file or directory).
   * @returns {Promise<boolean>} - Resolves to true if the entry exists, false otherwise.
   */
  async existsInDirectory(name, directoryHandle) {
    // Ensure the handle is a directoryHandle!
    if (!directoryHandle || directoryHandle.kind !== 'directory') {
      throw new TypeError("Argument must be a FileSystemDirectoryHandle.");
    }

    try {
      // Attempt to get filehandle first
      await directoryHandle.getFileHandle(name);
      return true;
    } catch (fileErr) {
      // If it fails, check if it's a directory
      if (fileErr.name == "NotFoundError") {
        try {
          await directoryHandle.getDirectoryHandle(name);
          return true;
        } catch (dirErr) {
          return false;
        }
      }
    }
  }
}
