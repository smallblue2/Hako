interface DeApi {
  creflect: any,
  windowOpen: (type: WindowType) => number,
  windowHide: (id: number) => void,
  windowShow: (id: number) => void,
  windowClose: (id: number) => void,
  windowFocus: (id: number) => void,
  windowMove: (id: number, x: number, y: number) => void,
  windowGetX: (id: number) => number,
  windowGetY: (id: number) => number,
  windowResize: (id: number, width: number, height: number) => void,
  windowGetWidth: (id: number) => number,
  windowGetHeight: (id: number) => number,
  windowList: () => OpenWindowRestricted[],
}

interface Window {
  Filesystem?: any,
  ProcessManager?: any,
  isFilesystemInitialised?: boolean,
  _FSM?: any,
  deapi?: DeApi,
}

declare enum WindowType {
  TERMINAL = 0,
  FILE_MANAGER,
  EDITOR,
  OTHER,
}

interface OpenWindowRestricted {
  readonly id: number,
  readonly type: WindowType,
  readonly show: boolean,
}

interface WindowContext {
  position: { x: number, y: number },
  dimensions: { width: number, height: number },
}

interface WindowVTable {
  syncSize: () => void,
  syncPosition: () => void,
}

interface OpenWindow {
  readonly id: number,
  readonly type: WindowType,
  state: { show: boolean, ctx: WindowContext, vtable: WindowVTable },
  readonly component: HTMLElement,
}

type HTMLSnippet = string;

interface Application {
  readonly icon: HTMLSnippet,
  readonly name: string,
  instances: number,
  alwaysShow: boolean,
  readonly create: Function,
}

type FilesystemError = string;

interface Stat {
  size: number,
  blocks: number,
  blocksize: number,
  ino: number,
  type: string,
  perm: string,
  atime: { sec: number, nsec: number },
  mtime: { sec: number, nsec: number },
  ctime: { sec: number, nsec: number },
}

type StatResult = { error: null, stat: Stat } | { error: FilesystemError, stat: null };
