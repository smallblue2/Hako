export const ProcessStates = Object.freeze({
  READY: 0,
  RUNNING: 1,
  SLEEPING: 2,
  TERMINATING: 3
});

export const StreamDescriptor = Object.freeze({
  STDIN: 0,
  STDOUT: 1,
});

export const ProcessOperations = Object.freeze({
  CHANGE_STATE: "changeState",
  WAIT_ON_PID: "waitOnPID",
  CREATE_PROCESS: "createProcess",
  KILL_PROCESS: "killProcess",
  GET_PROCESS_LIST: "getProcessList",
  PIPE_PROCESSES: "pipeProcesses",
  START_PROCESS: "startProcess",
  EXIT_PROCESS: "exitProcess"
});

export const ProcessExitCodeConventions = Object.freeze({
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INCORRECT_USAGE: 2,
  KILLED: 137
})

export class CustomError extends Error {

  static symbols = Object.freeze({
    PROC_NO_WORKER: -1,
    PROC_NO_EXIST: -2,
    WAITING_PROC_NO_EXIST: -3,
    STATE_NO_EXIST: -4,
    PTY_PROCESS_NO_PTY: -5,
    NO_PROC_FOR_WORKER: -6,
    PROC_TABLE_FULL: -7,
    EXTERNAL_ERROR: -8,
    UNKOWN_ERROR: -9,
    PROC_NOT_SET_TO_PIPE_STDOUT: -10,
    PROC_NOT_SET_TO_PIPE_STDIN: -11,
    STDIN_EMPTY: -12,
    STDOUT_WRITE_FAIL: -13,
    STDIN_FAIL_READ: -14,
    PIPE_STARTED_PROC: -15,
    LUA_FILE_NO_EXIST: -16,
    INVALID_PROC_AGS: -17
 });

  static #codeToMessageMap = Object.freeze({
    "-1": "Process doesn't have a registered worker",
    "-2": "Process doesn't exist",
    "-3": "Waiting process no longer exists",
    "-4": "Process state doesn't exist",
    "-5": "Tried to create PTY process without a PTY",
    "-6": "No process to register a worker to",
    "-7": "No available PIDs - Process table is full",
    "-8": "External error",
    "-9": "Unknown error",
    "-10": "Process isn't set to pipe its stdout",
    "-11": "Process isn't set to pipe its stdin",
    "-12": "Stdin is empty",
    "-13": "Failed to write to stdout",
    "-14": "Failed to read stdin",
    "-15": "Tried to pipe input into process that has already started",
    "-16": "Lua file doesn't exist",
    "-17": "Invalid arguments passed to process"
  });

  constructor(code) {

    super(CustomError.getMessage(code));
    this.code = code
    this.name = "CustomError"

    Object.setPrototypeOf(this, CustomError.prototype);
  }

  static getMessage(code) {
    return CustomError.#codeToMessageMap[String(code)] ?? `Unknown error code: ${code}`;
  }
}

// TODO:
//  - Have createProcess return on registerProcess not createProcess
//  - Refactor all errors to use customError
//  - Float errors up to process API
