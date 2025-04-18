-- Checks to make sure we have correct number of arguments!
function validate_args()
  if #process.argv < 2 then
    output("mkdir: missing operand")
    output("Try 'mkdir --help' for more information")
    process.exit(2)
  end
end

-- Prints a help message
function print_help()
  local help_msg = [[Usage: mkdir [OPTION]... DIRECTORY...
Create the DIRECTORY(ies), if they do not already exist.

Options:
  -h, --help    displays this help and then exits
]]

  output(help_msg)
end

-- Checks for and performs any flags
function do_flags()
  local help = false
  
  for i, arg in ipairs(process.argv) do
    if arg == "--help" or arg == "-h" then help = true end
  end

  if help == true then
    print_help()
    process.exit(0)
  end
end

-- Handles any errors, printing messages for the user
function handle_error(err, path)
  if err == 20 then
    output(string.format("mkdir: cannot create directory '%s': File/Directory exists", path))
  else
    output(string.format("mkdir: cannot create directory '%s': error %d", path, err))
  end
end

-- Makes all directories
function mkdirs()
  for i, entry in ipairs(process.argv) do
    if i ~= 1 then
      local err = file.make_dir(entry)
      if err then
        handle_error(err, entry)
      end
    end
  end
end

-- Perform functions
validate_args()
do_flags()
mkdirs()
