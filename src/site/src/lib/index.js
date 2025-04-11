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

export const SECTION_STYLE = [
  "resize-border-top-left",
  "resize-border-top",
  "resize-border-top-right",
  "resize-border-right",
  "resize-border-bottom-right",
  "resize-border-bottom",
  "resize-border-bottom-left",
  "resize-border-left",
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

export function getInitWindowSize() {
  const width = window.innerWidth * 0.4;
  const height = window.innerHeight * 0.5;
  return { initWidth: width, initHeight: height };
}

export function getResizeFromSect(sect, relX, relY) {
  let dw = 0;
  let dh = 0;

  switch (sect) {
    case BOTTOM_RIGHT_CORNER:
      dw = relX;
      dh = relY;
      break;
    case RIGHT:
      dw = relX;
      break;
    case BOTTOM:
      dh = relY;
      break;
    case TOP_LEFT_CORNER:
      dw = -relX;
      dh = -relY;
      break;
    case LEFT:
      dw = -relX;
      break;
    case TOP:
      dh = -relY;
      break;
    case TOP_RIGHT_CORNER:
      dw = relX;
      dh = -relY;
      break;
    case BOTTOM_LEFT_CORNER:
      dw = -relX;
      dh = relY;
      break;
  }

  return [ dw, dh ];
}
