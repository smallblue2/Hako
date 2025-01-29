import { mount, unmount } from "svelte";

let _topLayer = 2; // initially 1 as we want windows at higher z than default html elements

/** @type {number[]} */
const _layerFromId = $state([]);

/** @type {any[]} */
export const _windows = $state([]);

/** @type {HTMLElement | null} */
let rootSfc = null

let _IDCounter = 0;
function _newWID() {
  return _IDCounter++;
}

export function setRootSfc(el) {
  rootSfc = el;
}

export function openWindow(component, options) {
  console.assert(rootSfc !== null);
  if (options === undefined || options === null) {
    options = { props: {} };
  }

  options.target = rootSfc;

  const id = _newWID();
  options.props.id = id;

  _topLayer++;
  _layerFromId[id] = _topLayer;
  options.props.layerFromId = _layerFromId;

  // Object.freeze is used here to prevent some odd behaviour
  // with svelte mangling the component, making it unmountable
  _windows.push(Object.freeze({ id: id, component: mount(component, options)}));
}

export function closeWindow(id) {
  for (let i = 0; i < _windows.length; i++) {
    if (_windows[i].id == id) {
      unmount(_windows[i].component, { outro: false });
      _windows.splice(i, 1);
      return;
    }
  }
}

export function getWindowByID(id) {
  for (let i = 0; i < _windows.length; i++) {
    if (_windows[i].id == id) {
      return _windows[i];
    }
  }
}

export function focusWindow(id) {
  let maxz = Math.max(..._layerFromId);
  for (let i = 0; i < _layerFromId.length; i++) {
    _layerFromId[i] = Math.max(0, _layerFromId[i] - 1);
  }
  _layerFromId[id] = maxz;
}
