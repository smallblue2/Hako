-- ===================================================
-- Helpers
-- ===================================================

function join_path(a, b)
  if a:sub(-1) == "/" then return a .. b else return a .. "/" .. b end
end

function report_error(path, err)
  if err then
    local msg = errors.as_string(err) or ("error " .. tostring(err))
    output(string.format("rm: cannot remove '%s': %s", path, msg))
  end
end

-- ===================================================
-- Argument parsing
-- ===================================================

function parse_args()
  local opts = {
    force = false,
    recursive = false,
    interactive = false,
    help = false
  }
  local files = {}

  local reading_flags = true

  -- check for flags
  for i, arg in ipairs(process.argv) do
    if i ~= 1 then
      if arg == "--" then
        reading_flags = false
        goto continue
      end

      if reading_flags then
        if arg == "--help" or arg == "-h" then
          opts.help = true
        elseif arg == "--force" or arg == "-f" then
          opts.force = true
        elseif arg == "--recursive" or arg == "-r" then
          opts.recursive = true
        elseif arg == "--interactive" or arg == "-i" then
          opts.interactive = true
        -- bundled flags
        elseif arg ~= "-" and arg:sub(1,1) == "-" then
          for flag in arg:sub(2):gmatch(".") do
            if flag == "i" then opts.interactive = true
            elseif flag == "r" then opts.recursive = true
            elseif flag == "f" then opts.force = true
            else
              output(string.format("rm: invalid option -- '%s'", flag))
              output("Try 'rm --help' for more information")
              process.exit(1)
            end
          end
        else
          table.insert(files, arg)
        end
      else
        table.insert(files, arg)
      end
      ::continue::
    end
  end

  -- -i overrides -f (GNU states the opposite, but I believe prioritising the weaker is better)
  if opts.interactive then opts.force = false end

  return opts, files
end

function print_help()
  output([[Usage: rm [OPTION]... FILE...
Remove (unlink) each FILE.
By default, it does not remove directories. Use -r to do so.
    
Options:
  -f, --force         ignore nonexistent files; never prompt
  -i, --interactive   prompt before every removal
  -r, --recursive     remove directories and their contents recursively
  -h, --help          display this help and exit]])
end

-- ===================================================
-- Interactive confirmation
-- ===================================================

function confirm(msg, opts)
  if not opts.interactive then return true end
  local answer = terminal.prompt(msg .. " ")
  return answer and (answer:match("^[Yy]"))
end

-- ===================================================
-- Core
-- ===================================================

function remove_path(path, opts, top_level)
  -- Stat so we know what it is
  local stat, err = file.stat(path)
  if err then
    if not opts.force then report_error(path, err) end
    return
  end

  -- If it's a dir do some checks
  if stat.type == DIRECTORY then
    -- If we're not set to be recursive
    if not opts.recursive then
      -- If we're not set to force
      if not opts.force then
        -- Complain it's a directory
        output(string.format("rm: cannot remove '%s': Is a directory", path))
      end
      return
    end

    if not confirm(string.format("rm: descend into directory '%s'? [y/N]", path), opts) then
      return
    end

    -- First remove all contents
    local entries, derr = file.read_dir(path)
    if derr then
      report_error(path, derr)
      return
    end
    for _, ent in ipairs(entries or {}) do
      if ent ~= "." and ent ~= ".." then
        remove_path(join_path(path, ent), opts, false)
      end
    end

    -- Then the directory itself
    if confirm(string.format("rm: remove directory '%s'? [y/N]", path), opts) then
      local rerr = file.remove_dir(path)
      if rerr and not opts.force then report_error(path, rerr) end
    end

  else -- Otherwise handle it, as it's a file
    if confirm(string.format("rm: remove file '%s'? [y/N]", path), opts) then
      local rerr = file.remove(path)
      if rerr and not opts.force then report_error(path, rerr) end
    end
  end
end

-- ===================================================
-- Main
-- ===================================================

local opts, files = parse_args()

if opts.help then
  print_help()
  process.exit(0)
end

if #files == 0 then
  output("rm: missing operand")
  output("Try 'rm --help' for more information")
  process.exit(2)
end

for _, path in ipairs(files) do
  remove_path(path, opts, true)
end

process.exit(0)
