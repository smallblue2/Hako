#ifndef PROCESSES_H
#include <stdbool.h>
#define PROCESSES_H

#ifndef MAIN_H
typedef int Error;
#endif

typedef enum { READY, RUNNING, SLEEPING, TERMINATING, STARTING } ProcessState;

typedef struct __attribute__((packed)) {
  int pid;             // 0
  int alive;           // 4
  int created;         // 8
  ProcessState state; // 12
} Process;             // 16

// Input
int proc__input_pipe(char *restrict buf, int max_bytes, Error *restrict err); // INFO: Not meant to be used directly, used by `proc__input`
char *proc__input_all_pipe(Error *err); // WARNING: MUST FREE OUTPARAM `BUF` // INFO: Not meant to be used directly, used by `proc__input_all`
char *proc__input_line_pipe(Error *err); // WARNING: MUST FREE OUTPARAM `BUF` // INFO: Not meant to be used directly, used by `proc__input_line`
int proc__input_exact_pipe(char *restrict buf, int exact_bytes, Error *restrict err); // INFO: Not meant to be used directly, used by `proc__input_exact`
int proc__input(char *restrict buf, int max_bytes, Error *restrict err);
int proc__input_exact(char *restrict buf, int exact_bytes, Error *err);
char *proc__input_all(Error *err); // WARNING: MUST FREE OUTPARAM `BUF`
char *proc__input_line(Error *err); // WARNING: MUST FREE OUTPARAM `BUF`
void proc__close_input(Error *err);

// Output
void proc__output_pipe(const char *restrict buf, int len, Error *restrict err);
void proc__output(const char *restrict buf, int len, Error *restrict err);
void proc__close_output(Error *err);

// Error
void proc__error_pipe(const char *restrict buf, int len, Error *restrict err);
void proc__close_error(Error *err);

// Pipes
void proc__pipe(int out_pid, int in_pid, Error *err);
bool proc__is_stdout_pipe(Error *err);
bool proc__is_stdin_pipe(Error *err);

// Processes
int proc__create(const char *restrict buf, int len, const char *restrict *args, int args_len, bool pipe_stdin, bool pipe_stdout, const char *restrict redirect_in, const char *restrict redirect_out, Error *restrict err);
int proc__wait(int pid, Error *err);
void proc__kill(int pid, Error *err);
Process* proc__list(int *restrict length, Error *restrict err); // WARNING: PROCESS* RETURN VALUE MUST BE FREED
int proc__get_pid(Error *err);
char *proc__get_redirect_in(Error *err);
char *proc__get_redirect_out(Error *err);
void proc__start(int pid, Error *err);
void proc__exit(int exit_code, Error *err);
void proc__args(int *restrict argc, char *restrict **argv, Error *restrict err); // WARNING: MUST FREE OUTPARAM `ARGV`
char *proc__get_lua_code(Error *err);

#endif
