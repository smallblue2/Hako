import { Filesystem } from './api.js';

export const Tests = {};

Tests.createFile = function(location) {
  const fd = Filesystem.fs_open(location, Filesystem.O_CREAT, 0o644);
  if (fd < 0) {
    console.error("Failed to create a file at", location);
  } else {
    console.log("File descriptor", fd);
  }
};

Tests.writeFile = function(fd, content) {
  // Encode string to array
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(content);

  // Write data
  console.log("Writing raw data:", data);
  const bytesWritten = Filesystem.fs_write(fd, data, data.length);
  console.log("Wrote", bytesWritten, "bytes.");
}

Tests.readFile = function(fd, bufferLength) {
  const readBuffer = new Uint8Array(bufferLength);
  const bytesRead = Filesystem.fs_read(fd, readBuffer, bufferLength);

  if (bytesRead < 0) {
    console.error("Failed to read file at descriptor", fd);
  }

  console.log("Read", bytesRead, "bytes.");

  console.log("Raw data:", readBuffer.subarray(0, bytesRead));

  const textDecoder = new TextDecoder();
  const fileContent = textDecoder.decode(readBuffer.subarray(0, bytesRead));
  console.log(fileContent);
}
