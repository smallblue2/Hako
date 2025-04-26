-- ===================================================
-- Constants
-- ===================================================

local BLUE = "\27[34m"
local RESET = "\27[0m"

-- ===================================================
-- Helpers
-- ===================================================

function human(n)
  local units = { "K", "M", "G", "T" }
  local u = ""
  while n >= 1024 and #units > 0 do
    n = n / 1024
    u = table.remove(units, 1)
  end
  return string.format("%.1f%s", n, u)
end

function join(a,b)
  return (a:sub(-1) == "/" and a .. b) or (a .. "/" .. b)
end

function get_extension(name)
  return (name:match("%.([^./]+)$") or ""):lower()
end

function fmt_time(sec)
  return fmt.date("%b %e %H:%M", sec)
end

function fmt_perm(stat)
  local dir_indicator = stat.type == DIRECTORY and "d" or "-"
  return string.format("%s%3s", dir_indicator, stat.perm)
end

function fmt_name(entry, opts)
  local name = entry.name
  if entry.stat.type == DIRECTORY then
    if opts.slash_dir then name = name .. "/" end
    local res, _ = process.isatty(STDOUT)
    if res then name = BLUE .. name .. RESET end
    return name
  end
  return name
end

function fmt_entry(entry, opts)
  local s = entry.stat
  local parts = {}
  if opts.inode and s.ino then parts[#parts + 1] = string.format("%4d", s.ino) end
  if opts.blocks and s.blocks then parts[#parts + 1] = string.format("%4d", s.blocks) end
  parts[#parts + 1] = fmt_name(entry, opts)
  return table.concat(parts, " ")
end

-- ===================================================
-- Parse args / Print help
-- ===================================================

function parse_args()
  local opts = {
    one = false, -- -1
    all = false, -- -a
    almost_all = false, -- -A
    recurse = false, -- -R
    long = false, -- -l
    inode = false, -- -i
    blocks = false, -- -s
    slash_dir = false, -- -p
    time_field = "mtime", -- smtime / sctime / satime
    list_time = "mtime", -- l, lc, lu
    human = false, -- -h
    sort = "name", -- name / size / ext / mtime / ctime / atime
    reverse = false,
    help = false
  }
  local paths = {}

  for i = 2, #process.argv do
    local arg = process.argv[i]
    if arg:sub(1, 2) == "--" then
      if arg == "--one" then opts.one = true
      elseif arg == "--almost-all" then opts.almost_all = true
      elseif arg == "--recurse" then opts.recurse = true
      elseif arg == "--long" then opts.long = true
      elseif arg == "--inode" then opts.inode = true
      elseif arg == "--block" then opts.blocks = true
      elseif arg == "--human" then opts.human = true
      elseif arg == "--size" then opts.sort = "size"
      elseif arg == "--ext" then opts.sort = "ext"
      elseif arg == "--ctime" then opts.list_time = "ctime"
      elseif arg == "--atime" then opts.list_time = "atime"
      elseif arg == "--sctime" then opts.sort = "ctime"
      elseif arg == "--satime" then opts.sort = "atime"
      elseif arg == "--smtime" then opts.sort = "mtime"
      elseif arg == "--reverse" then opts.reverse = true
      elseif arg == "--help" then opts.help = true
      else
        output("ls: unknown option" .. arg)
        process.exit(1)
      end
    elseif arg:sub(1, 1) == "-" and arg ~= "-" then
      for f in arg:sub(2):gmatch(".") do
        if f == "1" then opts.one = true
        elseif f == "a" then opts.all = true
        elseif f == "A" then opts.almost_all = true
        elseif f == "R" then opts.recurse = true
        elseif f == "l" then opts.long = true
        elseif f == "s" then opts.blocks = true
        elseif f == "i" then opts.inode = true
        elseif f == "p" then opts.slash_dir = true
        elseif f == "h" then opts.human = true
        elseif f == "S" then opts.sort = "size"
        elseif f == "X" then opts.sort = "ext"
        elseif f == "t" then opts.sort = "mtime"
        elseif f == "m" then opts.sort = "ctime"
        elseif f == "e" then opts.sort = "atime"
        elseif f == "c" then opts.list_time = "ctime"
        elseif f == "u" then opts.list_time = "atime"
        elseif f == "r" then opts.reverse = true
        else
          output("ls: invalid option -- '" .. f .. "'")
          process.exit(1)
        end
      end
    else
      table.insert(paths, arg)
    end
  end

  -- Settle arg conflicts

  -- -1 always forces single-column output
  if opts.one then opts.long = false end
  -- -a wins over -A
  if opts.all then opts.almost_all = false end
  
  -- Default to current dir if no paths supplied
  if #paths == 0 then paths[1] = "." end

  return opts, paths
end

function print_help()
  output([[Usage: ls [OPTION]... [FILE]...
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
]])
  process.exit(0)
end

-- ===================================================
-- Sorting helper
-- ===================================================

function get_key(opts)
  if opts.sort == "size" then return function(e) return e.stat.size end
  elseif opts.sort == "ext" then return function(e) return ext(e.name) end
  elseif opts.sort == "mtime" then return function(e) return e.stat.mtime end
  elseif opts.sort == "ctime" then return function(e) return e.stat.ctime end
  elseif opts.sort == "atime" then return function(e) return e.stat.atime end
  else return function(e) return e.name:lower() end
  end
end

-- ===================================================
-- Print helpers
-- ===================================================

function long_line(entry, opts)
  local s = entry.stat
  local parts = {}
  if opts.inode and s.ino then parts[#parts + 1] = string.format("%4d", s.ino) end
  if opts.blocks then parts[#parts + 1] = string.format("%4d", s.blocks) end
  parts[#parts + 1] = fmt_perm(s)
  parts[#parts + 1] = string.format("%10s", opts.human and human(s.size) or tostring(s.size))
  parts[#parts + 1] = fmt_time(s[opts.list_time].sec)
  parts[#parts + 1] = fmt_name(entry, opts)
  return table.concat(parts, " ")
end

function print_columns(list, opts)
  -- Decide how many characters we can fit on the 
  -- screen (default to 80)
  local is_tty, _ = process.isatty(STDOUT)
  local term_w = (is_tty and terminal.width()) or 80

  -- Format entries and collect them
  -- Also keep track of the longest entry
  local names, maxlen = {}, 0
  for _, e in ipairs(list) do
    local n = fmt_entry(e, opts)
    names[#names + 1] = n
    if #n > maxlen then maxlen = #n end
  end

  -- Add two spaces between columns (GNU ls behaviour)
  local col_w = maxlen + 2

  -- The number of columns we can fit on a line
  local cols = math.max(1, math.floor(term_w / col_w))
  -- The number of rows we will have
  local rows = math.ceil(#names / cols)

  -- Print row-by-row
  for r = 1, rows do
    -- Collect the cells in this row
    local pieces = {}
    -- Iterate over columns
    for c = 0, cols - 1 do
      -- Convert (row, col) into a flat index
      -- row 1: names[1], names[1 + rows], names[1 + 2 * rows]
      -- row2: names[2], names[2 + rows], names[2 + 2 * 2]
      local i = r + c * rows
      local n = names[i]
      -- Could be nil in the last column
      if n then
        -- Pad all but the last column on the row so that subsequent
        -- columns line up
        local pad = (c == cols - 1) and 0 or (col_w - #n)
        pieces[#pieces + 1] = n .. string.rep(" ", pad)
      end
    end
    -- Concat the cells into a single physical line
    local line = table.concat(pieces)
    -- Remove trailing spaces added to fill the last column
    line = line:gsub("%s+$", "")
    output(line)
  end
end

-- ===================================================
-- Dir reading & printing
-- ===================================================

function list_dir(path, opts, label_paths, first_call)
  local entries, err = file.read_dir(path)
  if err then
    output(string.format("ls: cannot access '%s': %s", path, errors.as_string(err) or ("error" .. tostring(err))))
    return
  end

  -- Label prefix ("foo:") when listing multiple dirs or when recursing
  if label_paths then
    if not first_call then output("") end
    output(path .. ":")
  end

  -- Build the list
  local list = {}
  for _, name in ipairs(entries) do
    if opts.all or (opts.almost_all and not (name == "." or name == "..")) or (name:sub(1,1) ~= ".") then
      local full = join(path, name)
      local st, st_err = file.stat(full)
      if not st_err then
        table.insert(list, { name = name, full = full, stat = st })
      end
    end
  end

  -- Sort
  local key = get_key(opts)
  table.sort(list, function(a, b)
      local ka, kb = key(a), key(b)
      if ka == kb then
        return a.name:lower() < b.name:lower()
      else
        return ka < kb
      end
    end)
  if opts.reverse then
    for i = 1, math.floor(#list / 2) do
      list[i], list[#list - i + 1] = list[#list - i + 1], list[i]
    end
  end

  -- Print
  if opts.long then
    for _, e in ipairs(list) do
      output(long_line(e, opts))
    end
  elseif opts.one then
    for _, e in ipairs(list) do
      output(fmt_entry(e, opts))
    end
  else
    print_columns(list, opts)
  end

  -- Recurse (-R)
  if opts.recurse then
    for _, e in ipairs(list) do
      if e.stat.type == DIRECTORY and not (e.name == "." or e.name == "..") then
        list_dir(e.full, opts, true, false)
      end
    end
  end
end

-- ===================================================
-- Main
-- ===================================================

local opts, paths = parse_args()
local label_needed = (#paths > 1) or opts.recurse

if opts.help then
  print_help()
end

for i, p in ipairs(paths) do
  list_dir(p, opts, label_needed, i == 1)
end
