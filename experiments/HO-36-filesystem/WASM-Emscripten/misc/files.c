#include <stdio.h>

int main() {
  FILE *file = fopen("surprise.txt", "rb");
  if (!file) {
    printf("Cannot open file\n");
    return 1;
  }

  while (!feof(file)) {
    char c = fgetc(file);
    if (c != EOF) {
      putchar(c);
    }
  }

  fclose(file);
  return 0;
}
