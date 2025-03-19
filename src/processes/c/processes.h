#ifndef PROCESSES_H
#include <stdbool.h>
#define PROCESSES_H

#ifndef MAIN_H
typedef int Error;
#endif

typedef enum : int {
  READY,
  RUNNING,
  SLEEPING,
  TERMINATING
} ProcessStates;

typedef struct __attribute__((packed)) {
  int pid; // 0
  int alive; // 4
  int created_low; // 8
  int created_high; // 12
  ProcessStates state; // 16
} Process; // 20

// Input
int proc__input_pipe(char *buf, int max_bytes, Error *err); // INFO: Not meant to be used directly, used by `proc__input`
int proc__input_all_pipe(char **buf, Error *err); // WARNING: MUST FREE OUTPARAM `BUF` // INFO: Not meant to be used directly, used by `proc__input_all`
int proc__input_line_pipe(char **buf, Error *err); // WARNING: MUST FREE OUTPARAM `BUF` // INFO: Not meant to be used directly, used by `proc__input_line`
int proc__input_exact_pipe(char *buf, int exact_bytes, Error *err); // INFO: Not meant to be used directly, used by `proc__input_exact`
int proc__input(char *buf, int max_bytes, Error *err);
int proc__input_exact(char *buf, int exact_bytes, Error *err);
int proc__input_all(char **buf, Error *err); // WARNING: MUST FREE OUTPARAM `BUF`
int proc__input_line(char **buf,Error *err); // WARNING: MUST FREE OUTPARAM `BUF`
void proc__close_input(Error *err);

// Output
int proc__output_pipe(char *buf, int len, Error *err);
int proc__output(char *buf, int len, Error *err);
void proc__close_output(Error *err);

// Error
int proc__error_pipe(char *buf, int len, Error *err);
void proc__close_error(Error *err);

// Pipes
void proc__pipe(int out_pid, int in_pid, Error *err);
bool proc__is_stdout_pipe(Error *err);
bool proc__is_stdin_pipe(Error *err);

// Processes
int proc__create(char *buf, int len, bool pipe_stdin, bool pipe_stdout, Error *err);
int proc__wait(int pid, Error *err);
void proc__kill(int pid, Error *err);
Process* proc__list(Error *err); // WARNING: PROCESS* RETURN VALUE MUST BE FREED
int proc__get_pid(Error *err);
void proc__start(int pid, Error *err);
int proc__get_lua_code(char *buf, int len, Error *err);
void proc__exit(int exit_code, Error *err);
void proc__args(int *argc, char **argv, Error *err); // WARNING: MUST FREE OUTPARAM `ARGV`

#endif
