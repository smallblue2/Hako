#ifndef PROCESSES_H
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

int proc__input(char* buf, int len, Error *err);
int proc__inputAll(char* buf, int len, Error *err);
int proc__inputLine(char* buf, int len, Error *err);
int proc__output(char* buf, int len, Error *err);
int proc__error(char* buf, int len, Error *err);
void proc__wait(int pid, Error *err);
int proc__create(char *buf, int len, Error *err);
void proc__kill(int pid, Error *err);

Process* proc__list(Error* err);

#endif
