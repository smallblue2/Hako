export const ProcessStates = Object.freeze({
  READY: "ready",
  RUNNING: "running",
  SLEEPING: "sleeping",
  TERMINATING: "terminating"
});

export const ProcessOperations = Object.freeze({
  CHANGE_STATE: "changeState",
  WAIT_ON_PID: "waitOnPID",
  CREATE_PROCESS: "createProcess",
  RETURN_CREATED_PID: "returnCreatedPID"
})
