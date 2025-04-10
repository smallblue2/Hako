project('deapi', 'c',
  version : '0.1',
  default_options : ['warning_level=3', 'default_library=static'])

add_global_arguments('-pthread', language: 'c')

sources = files('src/deapi.c')
library('deapi', sources, c_args: ['-std=gnu2x', '-Os', '-Wall', '-Wextra'], link_args: [], install: true)
