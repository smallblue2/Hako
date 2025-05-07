-- ===================================================
-- Main
-- ===================================================

local content = {
  [""] = [[Usage: help [ITEM]

CORE UTILS (COMMANDS)

  File & Directory
    ls        - list files
    cat       - concatenate and print files
    cp        - copy files or directories
    mv        - move/rename files
    rm        - remove files or directories
    mkdir     - create directories
    rmdir     - remove directories
    touch     - create empty files
    find      - search for files
    grep      - search for patterns in text
    chmod     - change file and directory permissions

  Shell & Processes
    shell     - start a new shell
    ps        - list running processes
    kill      - kills a process
    lua       - runs Lua code in the shell

  Screen & Terminal:
    clear     - clear the screen
    pwd       - print current directory
    echo      - display a line of text

APPLICATIONS
  terminal-app         - the terminal emulator
  editor-app           - simple text editor
  file-browser-app     - navigate your filesystem
  api-manual-app       - browse the system API docs

SYSTEM APIS
  file, process, errors, terminal, window, fmt

See 'help COMMAND' for details. Run `api-manual` for full SYSTEM API docs.]],
  ["ls"] = [[NAME
  ls - list files in a directory

CODE
  Code available at `/bin/ls.lua`

SEE ALSO
  `ls --help` for help and usage details.]],
  ["grep"] = [[NAME
  grep - search for patterns in text

CODE
  Code available at `/bin/grep.lua`

SEE ALSO
  `grep --help` for help and usage details.]],
  ["chmod"] = [[NAME
  chmod - change file and directory permissions

CODE
  Code available at `/bin/chmod.lua`

SEE ALSO
  `chmod --help` for help and usage details.]],
  ["cat"] = [[NAME
  cat - concatenate and print files

INFO
  Also useful for displaying contents of files, `cat foo.txt` will display the contents of `foo.txt`.

CODE
  Code available at `/bin/cat.lua`

SEE ALSO
  `cat --help` for help and usage details.]],
  ["cp"] = [[NAME
  cp - copy files or directories

CODE
  Code available at `/bin/cp.lua`

SEE ALSO
  `cp --help` for help and usage details.]],
  ["mv"] = [[NAME
  mv - mv/rename files

CODE
  Code available at `/bin/mv.lua`

SEE ALSO
  `mv --help` for help and usage details.]],
  ["rm"] = [[NAME
  rm - remove files or directories

INFO
  Will not remove a directory unless `-r` is specified.

CODE
  Code available at `/bin/rm.lua`

SEE ALSO
  `rm --help` for help and usage details.]],
  ["mkdir"] = [[NAME
  mkdir - make a directory

CODE
  Code available at `/bin/mkdir.lua`

SEE ALSO
  `mkdir --help` for help and usage details.]],
  ["rmdir"] = [[NAME
  rmdir - remove a directory

INFO
  Will not remove a directory if it has files/directories in it.

CODE
  Code available at `/bin/rmdir.lua`

SEE ALSO
  `rmdir --help` for help and usage details.]],
  ["touch"] = [[NAME
  touch - create empty files

CODE
  Code available at `/bin/touch.lua`

SEE ALSO
  `touch --help` for help and usage details.]],
  ["find"] = [[NAME
  find - search for files

CODE
  Code available at `/bin/find.lua`

SEE ALSO
  `find --help` for help and usage details.]],
  ["shell"] = [[NAME
  shell - start a new shell

CHANGE DIRECTORY
  To change the directory of your shell, you can use the `cd` (Change Directory)
  command.

PIPELINES
  You can pipe the output of one command into the input of another
  using the '|' operator.

  Example:
   - `ls -l | grep hello.txt` causes grep to search ls's output for `hello.txt`

SHORT CIRCUIT EVALUATION
  You can join pipelines together with logical operators '&&' (AND)
  and '||' (OR).

  && - Executes the next pipeline IFF the previous one was succesful (exit code 0)
  || - Executes the next pipeline IFF the previous one failed (exit code > 0)

  Examples:
   - `cat hello.txt || echo "hello world" > hello.txt` - if cat fails (hello.txt) doesn't
                                                         exist, we create it by echoing into
                                                         `hello.txt`
   - `ls bad_dir && rm -rf bad_dir` - if ls suceeds (bad_dir exists), then we delete it.

I/O REDIRECTION
  You can redirect the input or output to your commands.
   - `<` redirects stdin
   - `>` redirects stdout

  Examples:
   - `echo hello world > hello.txt` writes to (or creates) hello.txt,
                                    with content "hello world"
   - `cat - < hello.txt` '-' makes cat use stdin, and stdin is replaced
                             with `hello.txt`, so we print the contents
                             of `hello.txt` (equivelant to `cat hello.txt`)

GROUPING
  You can group your commands with operators '{', '}'.
  This does not spin up a sub-shell.

MULTIPLE LINES
  You can have multiple lines by using the ';' operator.

  Example:
   - `ls -l ; touch foobar.txt`

SUBSHELL
  Can use `--subshell` to execute commands in a sub-shell (seperate shell),
  everything after `--subshell` will be the input to the subshell.

CODE
  Code available at `/bin/shell.lua`

SEE ALSO
  `shell --help` for usage details.]],
  ["ps"] = [[NAME
  ps - list running processes

CODE
  Code available at `/bin/ps.lua`

SEE ALSO
  `ps --help` for usage details.]],
  ["kill"] = [[NAME
  kill - kills a process

CODE
  Code available at `/bin/kill.lua`

SEE ALSO
  `kill --help` for usage details.]],
  ["lua"] = [[NAME
  lua - runs Lua code in the shell

CODE
  Code available at `/bin/lua.lua`]],
  ["clear"] = [[NAME
  clear - clear the terminal

INFO
  You can also do 'Ctrl + L' to clear the terminal too.

CODE
  Code available at `/bin/clear.lua`]],
  ["pwd"] = [[NAME
  pwd - prints the current directory

CODE
  Code available at `/bin/pwd.lua`]],
  ["echo"] = [[NAME
  echo - displays a line of text

CODE
  Code available at `/bin/echo.lua`]],
  ["terminal-app"] = [[NAME
  Terminal - The terminal emulator
      
HOW TO OPEN
  Launch by clicking the first icon in the taskbar, or using the `window` system
  api.

DESCRIPTION
  A terminal is a text-based interface that lets you interact with your computer
  by typing commands. Instead of clicking on icons like in a desktop environment,
  you type instructions, run programs, and see their output all in one place.
  It's like a direct line to the operating system, making it powerful for programming,
  system management, and automation.]],
  ["editor-app"] = [[NAME
  Editor - A simple text editor

HOW TO OPEN
  Launch by clicking the second icon in the taskbar, or using the `window` system
  api.

DESCRIPTION    
  A text editor is a program that lets you create and edit plain text files.
  It's mainly used for writing code or taking notes - without adding formatting
  like bold or italics like you'd see in a word processor. Text editors are
  simple, fast and essential tools for programming and system work.]],
  ["file-browser-app"] = [[NAME
  File Browser - A graphical interface to browse your filesystem

HOW TO OPEN
  Launch by clicking the third icon in the taskbar, or using the `window` system
  api.

DESCRIPTION
  A file browser is a program that lets you look at, open, move, and manage the
  files and folders on your computer. It shows the structure of your storage
  in a way that's easy to navigate with a visual layout.

INFO
  You can also use `cd` and `ls` commands to explore your filesystem from the
  terminal.]],
  ["api-manual-app"] = [[NAME
  Manual - Instructions on how to interact with the system.

HOW TO OPEN
  Launch by clicking the fourth icon in the taskbar, or using the `window` system
  api.

DESCRIPTION
  This is a guide on how to interact with your system. It describes what parts
  of the system do, how to interact with them correctly, what inputs are needed,
  what outputs they give - it's a detailed instruction book for developers like
  you!]],
  ["file"] = [[NAME
  file - filesystem manipulation

SYNOPSIS
  fd, err = file.open(path, flags)
  err     = file.close(fd)
  n, err  = file.write(fd, text)
  n, err  = file.read(fd, amt)
  s, err  = file.read_all(fd)
  err     = file.shift(fd, amount)
  err     = file.jump(fd, position)
  err     = file.remove(path)
  err     = file.move(old, new)
  err     = file.make_dir(path)
  err     = file.remove_dir(path)
  entries, err = file.read_dir(path)
  info, err    = file.stat(path)
  info, err    = file.fdstat(fd)
  cwd, err     = file.cwd()
  err     = file.change_dir(path)
  err     = file.permit(fd, flags)

DESCRIPTION
  The `file` API provides low-level primitives for creating, reading,
  writing, moving and deleting files and directories. Flags are a
  string of any combination of:
  - "r" = read
  - "w" = write
  - "c" = create if missing

EXAMPLES
  -- Creating and writing "Hello" into notes.txt
  local fd, err = file.open("notes.txt", "wc")
  if not fd then output(errors.as_string(err)) end
  file.write(fd, "Hello")
  file.close(fd)

  -- List current directory
  local entries, err = file.read_dir(".")
  for _, entry in ipairs(entries) do
    output(entry)
  end

SEE ALSO
  api-manual (fourth icon in taskbar)]],
  ["process"] = [[NAME
  process - spawn and control processes

SYNOPSIS
  pid, err  = process.create(path, opts)
  err       = process.start(pid)
  err       = process.kill(pid)
  err       = process.wait(pid)
  list      = process.list()
  err       = process.output(text, opts)
  err       = process.close_output()
  str, err  = process.input()
  line, err = process.input_line()
  str, err  = process.input_all()
  err       = process.close_input()
  ok, err   = process.isatty(stream)
  err       = process.pipe(in_pid, out_pid)
  pid, err  = process.get_pid()
  process.exit(code)

DESCRIPTION
  The `process` API lets you launch new Lua scripts as subprocesses,
  send and receive their I/O, wait for exit, or terminate them.
  Creation (`create`) does not start execution until `start(pid)`.

EXAMPLES
  -- run 'ls' in a process
  local pid, err = process.create("/bin/ls", { args = {"-l", "."}})
  if err then
    output("Failed to create process: " .. errors.as_string(err))
  end
  process.start(pid)
  process.wait(pid)

  -- get the current process's pid
  local pid, err = process.get_pid()
  if not err then output("My pid: " .. tostring(pid)) end

SEE ALSO
  api-manual (fourth icon in taskbar)]],
  ["errors"] = [[NAME
  errors - error inspection and handling

SYNOPSIS
  str = errors.as_string(code)
  errors.ok(code, message)

DESCRIPTION
  The `errors` API converts numeric error codes into human-readable
  strings and provides a convenient `ok()` helper to abort with context
  when a call fails.

EXAMPLES
  -- Aborting with `errors.ok`
  local fd, err = file.open("foo.txt", "r")
  errors.ok(err, "opening foo.txt") -- exits if `err` is not nil

  -- Converting an error code to a string
  local fd, err = file.open("foo.txt", "r")
  if err then output("Error: " errors.as_string(err)) end

SEE ALSO
  api-manual (fourth icon in taskbar)]],
  ["terminal"] = [[NAME
  terminal - interacts with the current TTY

SYNOPSIS
  err  = terminal.clear()
  text = terminal.prompt(prompt_text)
  w    = terminal.width()
  h    = terminal.height()

DESCRIPTION
  The `terminal` API offers simple control over your text console:
   - Clearing the screen
   - Prompting the user and receiving input
   - Getting the width of the terminal
   - Getting the height of the terminal

EXAMPLES
  -- Clearing the terminal
  terminal.clear()

  -- Prompting the user for their name
  local name = terminal.prompt("What is your name? ")
  output("Your name: " .. name)

SEE ALSO
  api-manual (fourth icon in taskbar)]],
  ["window"] = [[NAME
  window - desktop window management

SYNOPSIS
  size = window.area()
  list = window.list()
  size = window.dimensions(id)
  pos  = window.position(id)
  id   = window.open(type)
  window.hide(id)
  window.show(id)
  window.focus(id)
  window.move(id, x, y)
  window.resize(id, w, h)
  window.close(id)

DESCRIPTION
  The `window` API lets you create, hide/show, move, resize and
  focus GUI windows of predefined types.

EXAMPLES
  -- Open a terminal window
  local id = window.open(TERMINAL)

  -- Close a window of ID '3'
  window.close(3)

SEE ALSO
  api-manual (fourth icon in taskbar)]],
  ["fmt"] = [[NAME
  fmt - date and time formatting

SYNOPSIS
  str = fmt.date(format, time)
  t   = fmt.time(date_table)

DESCRIPTION
  The `fmt` API wraps Lua's `os.date` and `os.time`:
   - `fmt.date` returns a formatted string (or table) for a
     given epoch seconds or the current time.
   - `fmt.time` returns the current timestamp or converts a
     date-table into seconds since epoch.

EXAMPLES
  -- Output the current time
  output("Now: " .. fmt.date("Y%-%m-%d %H:%M:S"))
    
SEE ALSO
  api-manual (fourth icon in taskbar)]],
}

local option = #process.argv == 1 and "" or process.argv[2]:lower()
local msg = content[option] or string.format("help: '%s' isn't a valid option.\nTry `help` to view options.", option)

output(msg)
process.exit(0)
