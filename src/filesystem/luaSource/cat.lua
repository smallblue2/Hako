-- ===================================================
-- Arg parsing / help
-- ===================================================
function parse_args()
  local opts = {
    help = false,
    number = false,
    show_ends = false,
    show_tabs = false
  }
  local files = {}

  -- check for flags
  for i, arg in ipairs(process.argv) do
    if i ~= 1 then
      if arg == "--help" or arg == "-h" then
        opts.help = true
      elseif arg == "--number" or arg == "-n" then
        opts.number = true
      elseif arg == "--show-ends" or arg == "-E" then
        opts.show_ends = true
      elseif arg == "--show-tabs" or arg == "-T" then
        opts.show_tabs = true
      -- bundled flags
      elseif arg ~= "-" and arg:sub(1,1) == "-" then
        for flag in arg:sub(2):gmatch(".") do
          if flag == "n" then opts.number = true
          elseif flag == "E" then opts.show_ends = true
          elseif flag == "T" then opts.show_tabs = true
          else
            output(string.format("cat: invalid option -- '%s'", flag))
            output("Try 'cat --help' for more information")
            process.exit(1)
          end
        end
      else
        table.insert(files, arg)
      end
    end
  end

  return opts, files
end

function print_help()
  output([[Usage: cat [OPTION]... [FILE]...
Concatenate FILE(s) to standard output.
With no FILE, or when FILE is -, read standard input.

Options:
  -n, --number      number all output lines
  -E, --show-ends   display $ at the end of each line
  -T, --show-tabs   display TAB characters as ^I
  -h, --help        display this help and exit
  ]])
end

local opts, files = parse_args()

if opts.help then
  print_help()
  process.exit(0)
end

-- ===================================================
-- Util
-- ===================================================

function report_error(path, err)
  local msg = errors.as_string(err) or ("error "..tostring(err))
  output(string.format("cat: %s: %s", path, msg))
end

-- ===================================================
-- Core
-- ===================================================

-- Handles lines of text
function cat_text(txt, opts, state)
  for segment in txt:gmatch("([^\n]*\n?)") do
    if segment ~= "" then
      -- Trail newline for processing
      local line, newline = segment, ""
      if line:sub(-1) == "\n" then
        newline = "\n"
        line = line:sub(1, -2)
      end

      -- Visualisation options
      if opts.show_tabs then line = line:gsub("\t", "^I") end
      if opts.show_ends then line = line .. "$" end

      -- Numbering
      if opts.number then
        line = string.format("%6d\t%s", state.line_number, line)
        state.line_number = state.line_number + 1
      end

      output(line .. newline, { newline = false })
    end
  end
end

-- Handles reading from different streams (stdin or files)
function cat_stream(read_fn, source_name, opts, state)
  local data, err = read_fn()
  if err then
    report_error(source_name, err)
  elseif data then
    cat_text(data, opts, state)
  end
end

-- Handles reading from stdin or files
function cat_file(path, opts, state)
  if path == "-" then
    cat_stream(process.input_all, "stdin", opts, state)
    return
  end

  local fd, err = file.open(path, "r")
  if err or not fd then
    report_error(path, err)
    return
  end

  local txt, rerr = file.read_all(fd)
  if rerr then
    report_error(path, rerr)
  else
    cat_text(txt or "", opts, state)
  end
  file.close(fd)
end

-- ===================================================
-- Main
-- ===================================================

local opts, files = parse_args()

if opts.help then
  print_help()
  process.exit(0)
end

-- If no files stated, just read from stdin
if #files == 0 then files = { "-" } end

local state = { line_number = 1 }
for _, path in ipairs(files) do
  cat_file(path, opts, state)
end
