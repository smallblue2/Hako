// place files you want to import through the `$lib` alias in this folder.
export const TOP_LEFT_CORNER = 0;
export const TOP = 1;
export const TOP_RIGHT_CORNER = 2;
export const RIGHT = 3;
export const BOTTOM_RIGHT_CORNER = 4;
export const BOTTOM = 5;
export const BOTTOM_LEFT_CORNER = 6;
export const LEFT = 7;

export const SECTION_CURSORS = ["nwse-resize", "ns-resize", "nesw-resize", "ew-resize", "nwse-resize", "ns-resize", "nesw-resize", "ew-resize"];

export const SECTION_BACKGROUND = [
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem",
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem",
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem",
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem",
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem",
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem",
  "linear-gradient(#ccc, #ccc) bottom left / 100% 0.5rem"
];


/**
 * @param {number} n
 * @param {number} min
 */
export function clamp(n, min) {
  if (n < min) {
    return min;
  }
  return n;
}
