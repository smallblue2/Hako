import { mount, unmount } from "svelte";

import PlaceHolderIcon from "/src/placeholder.svg?raw";
import TerminalIcon from "/src/terminal.svg?raw";
import TextEditorIcon from "/src/text-editor.svg?raw";
import Terminal from "../components/Terminal.svelte";
import Editor from "../components/Editor.svelte";
import FileManager from "../components/FileManager.svelte";

// Window types
export const TERMINAL = 0;
export const EDITOR = 1;
export const FILE_MANAGER = 2;
export const OTHER = 3;

export const applications = $state([
  {
    icon: TerminalIcon,
    name: "Terminal",
    instances: 0,
    alwaysShow: true,
    create: () => {
      openWindow(TERMINAL, Terminal);
    },
  },
  {
    icon: TextEditorIcon,
    name: "Text Editor",
    instances: 0,
    alwaysShow: true,
    create: () => {
      openWindow(EDITOR, Editor);
    },
  },
  {
    icon: PlaceHolderIcon,
    name: "FileManager",
    instances: 0,
    alwaysShow: true,
    create: () => {
      openWindow(FILE_MANAGER, FileManager);
    }
  },
  {
    icon: PlaceHolderIcon,
    name: "Application",
    instances: 0,
    alwaysShow: false,
    create: null
  }
]);

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

export function openWindow(type, component, options) {
  const rootSfc = document.getElementById("window-area");
  console.assert(rootSfc !== null);
  if (options === undefined || options === null) {
    options = { props: {} };
  }

  switch (type) {
    case TERMINAL:
      applications[TERMINAL].instances += 1;
      break;
    case EDITOR:
      applications[EDITOR].instances += 1;
      break;
    case FILE_MANAGER:
      applications[FILE_MANAGER].instances += 1;
      break;
    default:
      applications[OTHER].instances += 1;
      break;
  }

  options.target = rootSfc;

  const id = _newWID();
  options.props.id = id;

  if (options.forceZ !== undefined) {
    options.props.layerFromId = {};
    options.props.layerFromId[id] = options.forceZ;
  } else {
    _topLayer++;
    _layerFromId[id] = _topLayer;
    options.props.layerFromId = _layerFromId;
  }

  // Object.freeze is used here to prevent some odd behaviour
  // with svelte mangling the component, making it unmountable
  _windows.push(Object.freeze({ id: id, type: type, state: { show: true }, component: mount(component, options)}));
  return id;
}

export function closeWindow(id) {
  for (let i = 0; i < _windows.length; i++) {
    if (_windows[i].id == id) {
      applications[_windows[i].type].instances -= 1;
      unmount(_windows[i].component, { outro: true });
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

export function hideWindow(id) {
  getWindowByID(id).state.show = false;
  const el = document.getElementById(`window-${id}`);
  el.style.display = "none";
}

export function showWindow(id) {
  getWindowByID(id).state.show = true;
  const el = document.getElementById(`window-${id}`);
  el.style.display = "";
}

export function focusWindow(id) {
  let maxz = Math.max(..._layerFromId);
  for (let i = 0; i < _layerFromId.length; i++) {
    _layerFromId[i] = Math.max(0, _layerFromId[i] - 1);
  }
  _layerFromId[id] = maxz;
}
