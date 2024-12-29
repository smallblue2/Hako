#include <stdio.h>

typedef struct {
  char name[32];
  char address[32];
  int phone_number;
  char email[32];
} Db_Entry;

void print_db_entry(Db_Entry ent) {
  printf("--- Name: %s ---\n", ent.name);
  printf("lives at: %s\n", ent.address);
  printf("phone number: %d\n", ent.phone_number);
  printf("email: %s\n", ent.email);
}

void request_entry_from_user() {
  Db_Entry ent;
  printf("enter name: ");
  fflush(stdout);
  scanf("%s", ent.name);
  printf("enter address: ");
  fflush(stdout);
  scanf("%s", ent.address);
  printf("enter phone number: ");
  fflush(stdout);
  scanf("%d", &ent.phone_number);
  printf("enter email: ");
  fflush(stdout);
  scanf("%s", ent.email);
  print_db_entry(ent);
}

int main() {
  for (;;) {
    request_entry_from_user();
  }
}
