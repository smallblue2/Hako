export const ProcessStates = Object.freeze({
  READY: 0,
  RUNNING: 1,
  SLEEPING: 2,
  TERMINATING: 3
});

export const ProcessOperations = Object.freeze({
  CHANGE_STATE: "changeState",
  WAIT_ON_PID: "waitOnPID",
  CREATE_PROCESS: "createProcess",
  KILL_PROCESS: "killProcess",
  GET_PROCESS_LIST: "getProcessList"
})
