import { mount, unmount } from "svelte";

let _maxLayer = 1; // initially 1 as we want windows at higher z than default html elements

/** @type {number[]} */
const _layerFromId = $state([]);

/** @type {any[]} */
export const _windows = $state([]);

/** @type {HTMLElement | null} */
let rootSfc = null

let _IDCounter = 0;
function _newWID() {
  const r = _IDCounter;
  _IDCounter++;
  return r;
}

export function setRootSfc(el) {
  rootSfc = el;
}

export function openWindow(component, options) {
  console.assert(rootSfc !== null);
  if (options === undefined || options === null) {
    options = { props: {} };
  }
  const port = document.createElement("div");
  rootSfc.appendChild(port);

  options.target = port;
  options.props.onWindowFocus = _onWindowFocus;

  const id = _newWID();
  options.props.id = id;

  _maxLayer++;
  _layerFromId[id] = _maxLayer;
  options.props.layerFromId = _layerFromId;

  _windows.push({ id: id, parent: port, component: mount(component, options) });
}

export function closeWindow(id) {
  for (let i = 0; i < _windows.length; i++) {
    if (_windows[i].id == id) {
      unmount(_windows[i].component);
      _windows[i].parent.remove();
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

function _onWindowFocus(id, ev) {
  let maxz = Math.max(..._layerFromId);
  for (let i = 0; i < _layerFromId.length; i++) {
    _layerFromId[i] = Math.max(0, _layerFromId[i] - 1);
  }
  _layerFromId[id] = maxz;
}
