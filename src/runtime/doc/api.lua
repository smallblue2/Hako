---@diagnostic disable: lowercase-global

---Manipulate files and directories.
file = {}

FILE --[[@type number]] = nil
DIRECTORY --[[@type number]] = nil

---@diagnostic disable-next-line: undefined-doc-name
---@alias File_Type (FILE | DIRECTORY)

---@class Time
---@field sec number The time in seconds.
---@field nsec number The time in nanoseconds.

---@class File_Status
---@field size number The size of the file.
---@field blocks number The number of blocks.
---@field blocksize number The size of each block.
---@field ino number The inode identifier.
---@field perm string The file permissions (e.g. "rw" - read and write permissions).
---@field type File_Type The type of the file-like object.
---@field atime Time Last accessed.
---@field mtime Time Last modified.
---@field ctime Time Last time properties were changed.

---Create or open a file.
---@param path string The path to the file.
---@param flags string A string containing sequence of "r" (read), "w" (write) and "c" (create).
---@return number | nil fd The file descriptor.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.open(path, flags) end

---Close a file.
---@param fd number The file descriptor associated with the file to close.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.close(fd) end

---Write some text to a file.
---@param fd number The file descriptor associated with the file to write to.
---@param text string The text to write.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.write(fd, text) end

---Read some text from a file.
---@param fd number The file descriptor associated with the file to read from.
---@param amt number The number of bytes to read
---@return string | nil text The text that was read.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.read(fd, amt) end

---Read all the text from a file.
---@param fd number The file descriptor associated with the file to read from.
---@return string | nil text The text contents of the file.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.read_all(fd) end

---Move the cursor for open file forward.
---@param fd number The file descriptor associated with the open file.
---@param amount number The number of characters to shift by.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.shift(fd, amount) end

---Move the cursor to position in open file.
---@param fd number The file descriptor associated with the open file.
---@param position number The number of characters to shift by.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.jump(fd, position) end

---Remove a file.
---@param path string The path of the file to remove.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.remove(path) end

---Move file or directory from one path to another (rename).
---@param old_path string The old path of the file.
---@param new_path string The new path of the file.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.move(old_path, new_path) end

---Make a directory.
---@param path string The path of the new directory.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.make_dir(path) end

---Remove a directory.
---@param path string The path of the directory to remove.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.remove_dir(path) end

---Change the current working directory.
---@param path string The path to the new working directory.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.change_dir(path) end

---Read the contents of a directory (akin to `ls').
---@param path string The path of directory to read from.
---@return string[] | nil entries The directory contents.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.read_dir(path) end

---Get file or directory metadata.
---@param path string The path of the file or directory with the to be returned metadata.
---@return File_Status | nil status The metadata.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.stat(path) end

---Get metadata for open file.
---@param fd string The file descriptor of the open file with the to be returned metadata.
---@return File_Status | nil status The metadata.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.fdstat(fd) end

---Change the permissions of an open file.
---@param fd number The file descriptor associated with the file to change the permissions of.
---@param flags string A string containing sequence of "r" (read), "w" (write) and "x" (create).
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.permit(fd, flags) end

---Get the current working directory of the current process.
---@return string | nil cwd Current working directory.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function file.cwd() end

---Process specific functionality.
process = {}

---The list of command line arguments passed to the current running process.
process.argv = nil --[[@type table<string>]]

STDIN --[[@type number]] = nil
STDOUT --[[@type number]] = nil

---@class Create_Opts
---@field pipe_in? boolean Whether to pipe standard input.
---@field pipe_out? boolean Whether to pipe standard output.
---@field argv? string[] The command line arguments passed to the created process.
-- @field redirect_in? string Redirect input from this file.
-- @field redirect_out? string Redirect output to this file, if it doesn't exist it creates it.

---@diagnostic disable-next-line: undefined-doc-name
---@alias Stream_Type (STDIN | STDOUT)

---@class Output_Opts
---@field newline boolean Whether to include newline or not.

---@alias Process_State "reading" | "running" | "sleeping" | "terminating" | "starting" | "invalid"

---@class Process_Descriptor
---@field pid number The identifier for the process.
---@field alive number The number of seconds the process has been alive for.
---@field created number The timestamp for when the process was created.
---@field state Process_State The state of the process.

---Create a new process (Does not start it!).
---@param path string The absolute path to the Lua source code for the new process.
---@param opts? Create_Opts Create options (optional).
---@return number | nil pid The new process' identifier.
---@return number | nil err Error code.
---@see process.start
---@diagnostic disable-next-line: unused-local
function process.create(path, opts) end

---Start a newly created process.
---@param pid number The process identifier of the to be started process.
---@return number | nil err Error code.
---@see process.create
---@diagnostic disable-next-line: unused-local
function process.start(pid) end

---Exit the current running process.
---@param code number The exit code.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function process.exit(code) end

---Read some text from standard input.
---@return string | nil text The text read.
---@return number | nil err Error code.
function process.input() end

---Read all text from standard input.
---@return string | nil text The rest of standard input after called.
---@return number | nil err Error code.
function process.input_all() end

---Read a line of text from standard input.
---@return string | nil text The line of text.
---@return number | nil err Error code.
function process.input_line() end

---Forcefully close standard input.
---@return number | nil err Error code.
function process.close_input() end

---Output text to standard output.
---@param text string The text to output.
---@param opts? Output_Opts Output options (optional).
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function process.output(text, opts) end

---Wait for process to exit.
---@param pid number The identifier of the process to wait for.
---@return number | nil err Er_Descriptorror code.
---@diagnostic disable-next-line: unused-local
function process.wait(pid) end

---Kill a process.
---@param pid number The identifier of the process to kill.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function process.kill(pid) end

---List the current processes.
---@return Process_Descriptor[] | nil Window_Descriptorrocesses The list of current processes.
---@return number | nil err Error code.
function process.list() end

---Open a new window of the given type.
---@param Window_Type type the type of window
---Get the process identifier for the current running protypecess.
-- 
---@return number | nil pid The process identifier.
---@return number | nil err Error code.
function process.get_pid() end

---Pipe the standard output of one process to the standard input of another.
---@param out_pid number The process identifier providing data.
---@param in_pid number The process identifier consuming data.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function process.pipe(out_pid, in_pid) end

---Check whether standard input or standard output are attached to a terminal.
---@param stream Stream_Type Which stream to check (STDIN or STDOUT).
---@return boolean | nil attached Whether it is attached to a terminal.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local
function process.isatty(stream) end

input = process.input
input_all = process.input_all
input_line = process.input_line
output = process.output

---Error inspection and handling.
errors = {}

---Convert error number into human readable string.
---@param code number the error code.
---@return string errs The string form of error code.
---@diagnostic disable-next-line: unused-local, missing-return
function errors.as_string(code) end

---Exit with error if given code is not nil.
---@param code number | nil the error code.
---@param msg? string the context message, usually used to indicate what activity raised the error (optional).
---@diagnostic disable-next-line: unused-local
function errors.ok(code, msg) end

---Terminal specific functions.
terminal = {}

---Clear/Reset the terminal text.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local, missing-return
function terminal.clear() end

---Draw a prompt and support REPL like functionality.
---@param prompt_text string the prompt to print
---@return string | nil user inputted line.
---@return number | nil err Error code.
---@diagnostic disable-next-line: unused-local, missing-return
function terminal.prompt(prompt_text) end

---Window management specific functions.
window = {}

TERMINAL --[[@type number]] = nil
FILE_MANAGER --[[@type number]] = nil
EDITOR --[[@type number]] = nil
MANUAL --[[@type number]] = nil

---@diagnostic disable-next-line: undefined-doc-name
---@alias Window_Type (TERMINAL | FILE_MANAGER | EDITOR | MANUAL)

---@class Size
---@field width number horizontal size.
---@field height number vertical size.

---@class Position
---@field x number horizontal position.
---@field y number vertical position.

---@class Window_Descriptor
---@field id number the window identifier.
---@field type Window_Type the type of the window
-- @field show boolean whether the window is hidden or not.

---Get the size of the valid window area.
---@return Size dimensions the dimensions of the window area.
---@diagnostic disable-next-line: missing-return
function window.area() end

---Get the list of current open windows.
---@return Window_Descriptor[]
---@diagnostic disable-next-line: missing-return
function window.list() end

---Open a new window of the given type.
---@param type Window_Type the type of window.
---@diagnostic disable-next-line: unused-local
function window.open(type) end

---Hide a window.
---@param id number the identifier associated with the window to hide.
---@diagnostic disable-next-line: unused-local
function window.hide(id) end

---Show a window.
---@param id number the identifier associated with the window to show.
---@diagnostic disable-next-line: unused-local
function window.show(id) end

---Focus a window.
---@param id number the identifier associated with the window to focus.
---@diagnostic disable-next-line: unused-local
function window.focus(id) end

---Get the position of a window.
---@param id number the identifier associated with the window to get the position of.
---@return Position position the position of the window.
---@diagnostic disable-next-line: unused-local, missing-return
function window.position(id) end

---Move a window to the given position.
---@param id number the identifier associated with the window to move.
---@param x number the horizontal position.
---@param y number the vertical position.
---@diagnostic disable-next-line: unused-local
function window.move(id, x, y) end

---Get the dimensions of a window.
---@param id number the identifier associated with the window to get the dimensions of.
---@return Size dimensions the dimensions of the window.
---@diagnostic disable-next-line: unused-local, missing-return
function window.dimensions(id) end

---Resize a window to given dimensions.
---@param id number the identifier associated with the window to resize.
---@param width number the horizontal size.
---@param height number the vertical size.
---@diagnostic disable-next-line: unused-local
function window.resize(id, width, height) end

---Close a window.
---@param id number the identifier associated with the window to close.
---@diagnostic disable-next-line: unused-local
function window.close(id) end
