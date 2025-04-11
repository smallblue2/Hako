interface Window {
  Filesystem?: any,
  ProcessManager?: any,
  isFilesystemInitialised?: boolean,
  _FSM?: any,
}

declare enum WindowType {
  TERMINAL = 0,
  FILE_MANAGER,
  EDITOR,
  OTHER,
}

interface OpenWindow {
  readonly id: number,
  readonly type: WindowType,
  state: { show: boolean },
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
