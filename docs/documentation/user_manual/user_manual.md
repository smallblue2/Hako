---
title: "Hako User Manual"
author: [Niall Ryan (21454746), Cathal O'Grady]
date: "2025-04-28"
titlepage: true
titlepage-logo: "../../logos/hako_banner.png"
toc-own-page: true
logo-width: 32em
titlepage-color: E1C396
titlepage-rule-color: 553F2A
titlepage-text-color: 553F2A
footer-center: "Hako - Web Native OS"
page-background-opacity: 0.1
lang: "en"
---

# Hako User Manual

## Hako

Hako is a platform agnostic Unix-like integrated development platform for the purposes of educating the youth about programming in a more "systems-oriented" way.

## Target Readers

This manual is intended for Hako's two target audiences;

 - Students
 - Mentors
 - Contributors
 
## Content

If you want to build from source, and host locally, this manual will describe:

 - How to build hako from source
 - How to run it locally 

This manual will also describe the features of Hako;

 - Applications
 - Core-Utils
 - System API

## Building

### Dependencies

Build instructions applicable Unix/Posix/Linux environments

* Justfile
* ldoc (lua-ldoc)
* Meson + Ninja (fortnite)
* Gcc
* Emscripten
* Node (npm)
* gpg
* cp

### Build instructions

```shell
just
```

You can do a clean build with:

```shell
just clean && just
```

You can also build the site as a static bundle with:

```shell
just site
```

You can then run it with any webserver. Just make sure that the following response headers are added:

```
Cross-Origin-Embedder-Policy require-corp
Cross-Origin-Opener-Policy same-origin
```

## Running

### Development Server (Easiest)

If you wish to simply run Hako for personal use, you can run it using a development server.

A development server is a simple server on your own machine for personal use, and allows you to use the application easily - often used for the actual development of Hako.

Once you build Hako (see build instructions above), a development server can be ran via:
```
just site-run-dev
```
or more succinctly
```
just srd
```

It will then be available on `127.0.0.1:5173` (`localhost:5173`) in your browser.

### Self-Hosting

Hako is incredibly simple to self-host as it  is **completely client-side**, which means it all runs on your device. There are no servers or any other compute required to run the application.

If you build the site (see build instructions above), you have a fully self-contained static bundle of Hako. It contains all the HTML, JS, CSS, Web Assembly, etc required for Hako to run.

This can be exposed via a simple web server (like Nginx, Apache, Vercel, etc).

## Features

Hako has a whole bunch of features to assist you in learning (or teaching) systems programming!

A high-level category of these features are:

 - **The Desktop** -- The graphical user interface for the system
 - **Applications** -- The applications available for you to use
 - **Core-Utils** -- Useful tools and utilities for you to use in the terminal
 - **System APIs** -- Interfaces to manipulate and use your system with
 
### Desktop

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/desktop-labelled.png}

The desktop should be a familiar interface to those who have used a typical operating system before (such as Windows, MacOS, ChromeOS).

It is a "floating window manager", which means windows can:

 - Be dragged and placed anywhere on the screen
 - Overlap eachother (windows can be on top of others)
 - Be manually resized and positioned
 - No strict rules are automatically enforced

#### Taskbar

\

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/taskbar-labelled.png}

You can "left click" on an icon to open one instance of that application type.

Furthermore, if an instance of this application type already exists when you "left click" them, it will cycle bringing the instances to the forefront, starting with the closest going to the furthest.

Hako comes with four built-in graphical user interface (GUI) applications:

 - **Terminal** (first icon)
 - **File** (second icon)
 - **Text Editor** (third icon)
 - **System API Documentation** (fourth icon)

The functionality of these can be read about below in the "Applications" section.

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/taskbarctx-labelled.png}

You can "right click" on any application icon to open the context menu.

The context menu allows you to perform actions on a single application type, these actions include:

 - **Close all** -- Closes all instances of that application type
 - **Hide all** -- Hides all instances of that application type
 - **Show all** -- Shows all instances of that application type
 - **New window** -- Creates a new instance of that application type

You can also hit a keybind whilst the context menu is open to perform the associated action, as denoted above.

 - **C** -- Close all
 - **H** -- Hide all
 - **S** -- Show all
 - **N** -- New window
 

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/taskbarhints-labelled.png}

The taskbar also denotes if none, one or multiple instances of an application type are open. See image above.

#### Windows

\

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/window-labelled.png}

Windows contain the application's graphical interface, information about the application, and methods to manipulate the application instance.

The window title in the top-left corner displays the window's application's name.

The window actions in the top-right corner allow you to minimise, maximise and close the window.

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/windowresize-labelled.png}

Windows can be dragged around the desktop by holding "left click" on the window's title bar.

Windows can be resized by hovering on any of the window's four borders, and holding "left click" whilst dragging to increase or decrease in the direction you wish.

### Applications

#### Terminal

\

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/terminal.png}

The terminal is an application that provides a text-based interface that lets you interact directly with the Hako operating system or other programs.

Through a terminal you can:

 - **Run commands** to control the system (like managing files, prcoesses, windows, etc)
 - **Automate tasks** by writing and running lua scripts
 - **Interact with programs** that don't have a graphical user interface (GUI)

The default program that the terminal runs is the **shell**, which you can read more about below in the "core-utils" section.

The terminal also has additional features, such as:

 - **Line manipulation** -- You can edit a line like you typically would, going back and forth with arrows keys
 - **Command history** -- Go to previous commands ran with arrows keys
 - **Command search** -- Enter "Ctrl + R" to search your history for previous commands

If the shell process attached to a terminal dies, the terminal instance will close.

#### Editor

The text editor is a lightweight and fast application that lets you to edit and view plain text easily.

It's primary features are:

 - Allow file editing
 - Syntax highlighting for Lua files
 - Auto-save to avoid loss of data

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/editorchoosefile.png}

When you open the text editor from the task bar, it will request a file to open.

Upon clicking "Select file", it will open the file browser, allowing you to select or create a file.

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/editor-labelled.png}

The editor window's name reflects the file being edited.

There are two indicators in the bottom right:

 - **Save indicator** -- The circle. Blue indicates saved, Red indicates not-saved.
 - **File Permissions** -- Whether the file is Read Only \[RO\] or Read Write \[RW\]

#### File Browser

The file browser is an application that provides a graphical interface for you to view, organise and manage the files and folders on Hako.

The primary features of the file browser are:

 - Viewing your filesystem
 - Traversing your filesystem
 - Creating files or directories
 - Renaming files or directories
 - Deleting files or directories
 - Drag and drop for moving files or directories

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/filebrowser-labelled.png}

Directories have a "folder" icon.
Files have a "notes" icon.

The bottom-left contains "breadcrumbs", which shows your relative path from the root.

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/filebrowserctx-labelled.png}

You can "right-click" on the background of the file browser to open the general context menu.

This provides you with two options:

 - **New file** -- Creates a new file, prompts you for the name
 - **Create directory** -- Creates a new directory, prompts you for the name

You can also use the keybinds denoted in the context menu instead of directly clicking the options.

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/filebrowserdirctx-labelled.png}

You can "right-click" on a directory to open the directory context menu.

This provides you with two options:

 - **Rename directory** -- Rename the directory
 - **Delete directory** -- Delete the directory

You can also use the keybinds denoted in the context menu instead of directly clicking the options.

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/filebrowserfilectx-labelled.png}

You can "right-click" on a file to open the file context menu.

This provides you with two options:

 - **Rename file** -- Rename the file
 - **Delete file** -- Delete the file

You can also use the keybinds denoted in the context menu instead of directly clicking the options.

#### Manual

\

\includegraphics[width=1\textwidth,keepaspectratio]{./assets/apimanual.png}

Hako has multiple system APIs, described below in the "System APIs" section.

The manual is a full document describing all the different ways to interact with Hako.

The alternative is the `help` command that you can enter into your terminal, which describes Hako's system APIs at a higher level with examples

### Core-Utils

Hako comes with a powerful set of core-utils to make interacting with your system easy and productive.

Core-utils are a set of essential command-line programs that are fundamental for interacting with your operating system.

The core-utils are in the `/bin` directory, and by default, any files in this directory are accessible anywhere in your system from your shell.

For example, the `ls.lua` core-util can be accessed no matter where you are in your filesystem with the `ls` or `ls.lua` command -- and you can place any tool you create yourself in here to access them from anywhere in your system too!

#### ls

\

List the files in a directory.

If there is no directory listed, it defaults to listing the current directory.

Help Message:

```
Usage: ls [OPTION]... [FILE]...
List information about the FILEs (the current directory by default)
Sorts entries alphabetically by default.

Options:
 -1, --one         list one file per line
 -a, --all         do not ignore directories starting with .
 -A, --almost-all  do not list implied . and ..
 -R, --recurse     follow sub-directories and list their contents too
 -l, --long        long format
 -i, --inode       list inode numbers
 -s, --block       lists allocated blocks
 -p,               append / to directory names
 -c, --ctime       list ctime
 -u, --atime       list atime
 -h, --human       list human readable sizes (1K, 243M, 2G)
 -S, --size        sort by size
 -X, --ext         sort by extension
 -t, --smtime      sort by mtime
 -m, --sctime      sort by ctime
 -e, --satime      sort by atime
 -r, --reverse     reverse sort order
```

Code:

The code is available at `/bin/ls.lua`.

#### cat

\

Con**cat**enates and prints files.

Typically used to print files out at the command line to see their contents.

Help Message:

```
Usage: cat [OPTION]... [FILE]...
Concatenate FILE(s) to standard output.
With no FILE, or when FILE is -, read standard input.

Options:
  -n, --number      number all output lines
  -E, --show-ends   display $ at the end of each line
  -T, --show-tabs   display TAB characters as ^I
  -h, --help        display this help and exit
```

Code:

The code is available at `/bin/cat.lua`.

#### cp

\

Copies files or directories.

Help Message:

```
Usage: cp [OPTION]... SOURCE... DEST

Copy SOURCE to DEST, or multiple SOURCE(s) into directory DEST.

Options:
  -f, --force        overwrite without prompting
  -n, --no-clobber   do not overwrite existing files
  -i, --interactive  prompt before overwrite
  -r, --recursive    copy directories recursively
  -h, --help         display this help and exit
```

Code:

The code is available at `/bin/cp.lua`.

#### mv

\

Moves / renames files or directories.

Help Message:

```
Usage: mv [-finT] SOURCE DEST
or: mv [-fin] SOURCE... DIRECTORY

Rename SOURCE to DEST, or move SOURCEs to DIRECTORY

Options:
 -f  Don't prompt before overwriting
 -i  Interactive, prompt before overwrite
 -n  Don't overwrite an existing file
 -T  Refuse to move if DEST is a directory
 -h  Show this help message
```

Code:

The code is available at `/bin/mv.lua`.

#### rm

\

Removes files or directories.

Will not remove a directory unless `-r` is specified.

Help Message:

```
Usage: rm [OPTION]... FILE...
Remove (unlink) each FILE.
By default, it does not remove directories. Use -r to do so.
    
Options:
  -f, --force         ignore nonexistent files; never prompt
  -i, --interactive   prompt before every removal
  -r, --recursive     remove directories and their contents recursively
  -h, --help          display this help and exit
```

Code:

The code is available at `/bin/rm.lua`.

#### mkdir

\

Makes a directory.

Help Message:

```
Usage: mkdir [OPTION]... DIRECTORY...
Create the DIRECTORY(ies), if they do not already exist.

Options:
  -h, --help    displays this help and then exits
```

Code:

The code is available at `/bin/mkdir.lua`.

#### rmdir

\

Removes a directory (only if it's empty).

Help Message:

```
Usage: rmdir DIRECTORY...
Remove DIRECTORY if it is empty
```

Code:

The code is available at `/bin/rmdir.lua`.

#### touch

\

Create empty files.

Useful for creating files before opening or manipulating.

Example: `touch script.lua`.

Code:

The code is available at `/bin/touch.lua`.

#### find

\

Search for files.

Also allows much more complex behaviour, such as executing a command on each file via the `-exec` flag.

Help Message:

```
Usage: find [OPTION|PATH]...

Search for files and perform actions on them.

Options:
    -name PATTERN Match file name (without directory name) to PATTERN
   -iname PATTERN Case insensitive -name
    -path PATTERN Match path to PATTERN
   -ipath PATTERN Case insensistive -path
   -atime DAYS    Match access time greater or equal than DAYS
   -mtime DAYS    Match modified time greater or equal than DAYS
   -ctime DAYS    Match creation time greater or equal than DAYS
    -type X       File type is X (one of: f,d)
 -pattern PATTERN Match pattern (lua pattern match string)
-maxdepth N       Descend at most N levels
-mindepth N       Don't act on first N levels
   -empty         Match empty file/directory
   -print         Print file name (default)
       -h         Print this help message.
```

Code:

The code is available at `/bin/find.lua`

#### grep

\

Search for patterns in text.

Help Message:

```
Search for PATTERN in each FILE.
Example: grep -r ipairs sys

Options:
 -l         Show only names of files that match
 -L         Show only names of files that don't match
 -o         Show only the matching part of line
 -i         Ignore case
 -n         Add 'line_no:' prefix
 -r         Recurse directories
 -h         Do not add 'filename:' prefix
 -H         Add 'filename:' prefix
 -v         Select non-matching lines
 -q         Quiet. Return 0 if PATTERN is found, 1 otherwise
 -s         Suppress open and read errors
 -e PATTERN Pattern to match
```

Code:

The code is available at `/bin/grep.lua`.

#### chmod

\

Change file and directory permissions.

Help Message:

```
Usage: chmod [OPTION]... [r|w|x] FILE...
Change the permissions of files.

Options:
 -R  Recurse on directories
 -f  Hide errors
 -h  Print this help message
```

Code:

The code is available at `/bin/chmod.lua`.

#### Shell

\

All operating systems (Windows, MacOS, Linux), including Hako, have shells to control them with.

The shell gives you a text interface, letting you type commands instead of clicking on graphical elements, to control your operating system.

Change Directory:

To change the directory of your shell, you can use the `cd` (Change Directory) command.

Example:

 - `cd /sys` will bring you into the `sys` directory.

Pipelines:

You can pipe the output of one command into the input of another using the `|` operator.

Example:

 - `ls -l | grep hello.txt` causes grep to search the ls comman's output for `hello.txt`

Short Circuit Evaluation:

You can join pipelines together with logical operators '&&' (AND) and '||' (OR).

 - `&&` -- Executes the next pipeline IFF the previous one was succesful (the exit code was 0)
 - `||` -- Executes the next pipeline IFF the previous one failed (the exit code was not 0)

Examples:

 - `cat hello.txt || echo "hello world" > hello.txt` -- if `cat` fails (hello.txt doesn't exist), we create it by echoing into `hello.txt`
 - `ls bad_dir && rm -rf bad_dir` -- if `ls` succeeds (bad_dir exists), then we delete it.

I/O Redirection:

You can redirect the input or output to your commands.

 - `<` -- redirects stdin
 - `>` -- redirects stdout

Examples:

 - `echo hello world > hello.txt` -- writes to (or creates) hello.txt, with content "hello world"
 - `cat - < hello.txt` -- cat uses stdin, and stdin is replaced with `hello.txt`, so we print the contents of `hello.txt` (equivelant to `cat hello.txt`)

Grouping:

You can group your commands with operators `{`, `}`.
This does not spin up a sub-shell.

Multiple Lines:

You can have multiple lines by using the `;` operator.

Example:

 - `ls -l ; touch foobar.txt` -- runs the two commands seperately

Subshell:

Can use `--subshell` to execute commands in a sub-shell (seperate shell), everything after `--subshell` will be the input to the subshell.

Code:

The code is available at `/bin/shell.lua`.

#### ps

\

List running processes.

Help Message:

```
Usage: ps [OPTION]
List current processes.
    
Options:
  -h        display this help and exit
  --help    display this help and exit
```

Code:

The code is available at `/bin/shell.lua`.

#### kill

\

Kills a running process.

Help Command:

```
Usage: kill PID...
```

Code:

The code is available at `/bin/kill.lua`.

#### lua

\

Runs Lua code in the shell

Example:

 - `lua 'output("Hello, Hako!")'`

Code:

The code is available at `/bin/lua.lua`.

#### clear

\

Clears the screen.

You can also type `Ctrl+L` to clear the terminal too!

Code:

The code is available at `/bin/clear.lua`.

#### pwd

\

Prints the current directory.

Code:

The code is available at `/bin/pwd.lua`.

#### echo

\

Displays a line of text.

Example: 

 - `echo hello Hako "this is a test!"` outputs `hello Hako this is a test!`.

Code:

The code is available at `/bin/echo.lua`.

### System APIs

Hako exposes many APIs for you to manipulate the operating system with, it's how you can ask Hako to "do something".

#### Desktop Environment API (window)

  TERMINAL = 0.0,
  FILE_MANAGER = 1.0,
  EDITOR = 2.0,
  MANUAL = 3.0,

#### Process API (process)

  STDIN = 0.0,
  STDOUT = 1.0,

#### Filesystem API (file)

  DIRECTORY = 1.0,
  FILE = 0.0,

#### Terminal API (terminal)

#### Format API (fmt)

#### Error API (errors)
