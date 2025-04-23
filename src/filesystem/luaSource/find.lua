local argv = process.argv
local argi = 2

local function error(ctx, msg)
  output(string.format("%s: %s: %s", process.argv[1], ctx, msg))
end

local function abort(ctx, msg)
  error(ctx, msg)
  process.exit(1)
end

local config = {
  print_usage = false,
  max_depth = nil,
  min_depth = nil,
  match_name = nil,
  name_insensitive = false,
  match_path = nil,
  path_insensitive = false,
  match_pattern = nil,
  match_type = nil,
  match_mtime = nil,
  match_atime = nil,
  match_ctime = nil,
  match_empty = false,
  cmd = nil,
}

local flags = {
  ["h"] = {
    help = "Print this help message.",
    handle = function() config.print_usage = true end,
  },
  ["maxdepth"] = {
    help = "Descend at most N levels",
    argument = "N",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'maxdepth'")
      end
      config.max_depth = tonumber(positional) or abort("number expected, got", positional)
    end,
  },
  ["mindepth"] = {
    help = "Don't act on first N levels",
    argument = "N",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'mindepth'")
      end
      config.min_depth = tonumber(positional) or abort("number expected, got", positional)
    end,
  },
  ["name"] = {
    help = "Match file name (without directory name) to PATTERN",
    argument = "PATTERN",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'name'")
      end
      config.match_name = positional
    end,
  },
  ["iname"] = {
    help = "Case insensitive -name",
    argument = "PATTERN",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'iname'")
      end
      config.match_name = positional
      config.name_insensitive = true
    end,
  },
  ["path"] = {
    help = "Match path to PATTERN",
    argument = "PATTERN",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'path'")
      end
      config.match_path = positional
    end,
  },
  ["ipath"] = {
    help = "Case insensistive -path",
    argument = "PATTERN",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'ipath'")
      end
      config.match_path = positional
      config.path_insensitive = true
    end,
  },
  ["pattern"] = {
    help = "Match pattern (lua pattern match string)",
    argument = "PATTERN",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'pattern'")
      end
      config.match_pattern = positional
    end
  },
  ["type"] = {
    help = "File type is X (one of: f,d)",
    argument = "X",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'type'")
      end
      if positional == "f" then
        config.match_type = FILE
      elseif positional == "d" then
        config.match_type = DIRECTORY
      else
        abort("type must be one of: (f,d), Got", positional)
      end
    end
  },
  ["mtime"] = {
    help = "Match modified time greater or equal than DAYS",
    argument = "DAYS",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'mtime'")
      end
      config.match_mtime = tonumber(positional) or abort("number expected, got", positional)
    end,
  },
  ["atime"] = {
    help = "Match access time greater or equal than DAYS",
    argument = "DAYS",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'atime'")
      end
      config.match_atime = tonumber(positional) or abort("number expected, got", positional)
    end,
  },
  ["ctime"] = {
    help = "Match creation time greater or equal than DAYS",
    argument = "DAYS",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'ctime'")
      end
      config.match_ctime = tonumber(positional) or abort("number expected, got", positional)
    end,
  },
  ["empty"] = {
    help = "Match empty file/directory",
    handle = function()
      config.match_empty = true
    end,
  },
  ["print"] = {
    help = "Print file name (default)",
    handle = function()
      config.cmd = nil
    end,
  },
  ["exec"] = {
    help = "Run CMD with all instances of {} replaced by file name. Fails if CMD exits with nonzero",
    argument = "CMD",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'exec'")
      end
      config.cmd = positional
    end,
  },
}

local function is_sflag(s)
  return s:match("^%-[^%-]") ~= nil
end

local function quote(s)
  return "'" .. s .. "'"
end

local function padl(s, to, unit)
  return string.rep(unit or " ", to - #s) .. s
end

local function padr(s, to, unit)
  return s .. string.rep(unit or " ", to - #s)
end

local function usage_banner()
  output([[
Usage: find [OPTION|PATH]...

Search for files and perform actions on them.
]])
end

local function usage()
  usage_banner()
  local max_col1 = 0
  local max_col2 = 0
  for flag_name, flag in pairs(flags) do
    if #flag_name > max_col1 then
      max_col1 = #flag_name + (flag.long and #"--" or #"-")
    end
    if flag.argument ~= nil and #flag.argument > max_col2 then
      max_col2 = #flag.argument
    end
  end
  for flag_name, flag in pairs(flags) do
    local flagp = flag.long and "--" or "-"
    output(string.format("%s %s %s", padl(flagp .. flag_name, max_col1 + 1), padr(flag.argument or "", max_col2), flag.help))
  end
end

local function dedupe(list)
  local result = {}
  local seen = {}
  for _, item in ipairs(list) do
    if not seen[item] then
      table.insert(result, item)
      seen[item] = true
    end
  end
  return result
end

local positional = {}
while argi <= #argv do
  local arg = argv[argi]
  if is_sflag(arg) then
    local sflag = arg:match("[^%-]+")
    local flag = flags[sflag]
    if flag == nil then
      abort("unrecognized option", quote(sflag))
    end
    flag.handle()
    if flag.argument ~= nil then -- its positional: just consume the positional argument
      argi = argi + 1
    end
  else
    table.insert(positional, arg)
  end
  argi = argi + 1
end
positional = dedupe(positional)

if #argv == 1 then
  config.print_usage = true
end

if config.print_usage then
  usage()
  process.exit(0)
end

for _, fname in pairs(positional) do
  if fname ~= "-" then
    local stat, err = file.stat(fname)
    if err ~= nil then
      abort(fname, "No such file or directory")
    end
  end
end

local function filter_rel(entries)
  for i = #entries, 1, -1 do -- so we can in place remove items
    local entry = entries[i]
    if entry == "." or entry == ".." then
      table.remove(entries, i)
    end
  end
end

local function basename(path)
  return path:match("[^/]*$")
end

local function action(depth, stat, path)
  if config.min_depth and depth < config.min_depth then
    return false
  end

  if config.match_name then
    local name = config.match_name
    local fname = basename(path)
    if config.name_insensitive then
      name = name:lower()
      fname = fname:lower()
    end   
    if name ~= fname then
      return false
    end
  end

  if config.match_path then
    local cpath = config.match_path
    local opath = path
    if config.path_insensitive then
      cpath = cpath:lower()
      opath = opath:lower()
    end
    if cpath ~= opath then
      return false
    end
  end

  if config.match_pattern then
    if not path:match(config.match_pattern) then
      return false
    end
  end

  if config.match_type and config.match_type ~= stat.type then
    return false
  end

  if config.match_mtime then
    if config.match_mtime < stat.mtime then
      return false
    end
  end

  if config.match_atime then
    if config.match_atime < stat.atime then
      return false
    end
  end

  if config.match_ctime then
    if config.match_ctime < stat.ctime then
      return false
    end
  end

  if config.match_empty then
    if stat.size ~= 0 then
      return false
    end
  end
  
  if config.cmd then
    local cmd = config.cmd:gsub("{}", path)
    local pid, err = process.create("/sys/shell.lua", { argv = { "/sys/shell.lua", "--subshell", cmd } })
    if err ~= nil then
      error("creating process /sys/shell.lua", errors.as_string(err))
      return false
    end
    process.start(pid)
    local exit = process.wait(pid)
    if exit ~= 0 then
      return false
    end
  else
    output(path)
  end

  return true
end

local function find(depth, parent, files_or_dirs)
  local match = false
  if config.max_depth and depth > config.max_depth then
    return match
  end
  for _, fname in ipairs(files_or_dirs) do
    local full_path
  
    if parent == "/" and fname ~= "." then
      parent = ""
    end
    
    if fname ~= "/" then
      full_path = parent .. "/" .. fname
    else
      full_path = "/"
    end
    
    if fname == "." then
      full_path = parent
    end

    local stat, err = file.stat(full_path)
    if err ~= nil then
      error(full_path, errors.as_string(err))
    else
      if stat.type == DIRECTORY then
        local entries, err = file.read_dir(fname)
        if err ~= nil then
          error(fname, errors.as_string(err))
        else
          filter_rel(entries)
          match = action(depth, stat, full_path) or match
          match = find(depth + 1, full_path, entries) or match
        end
      else
        match = action(depth, stat, full_path) or match
      end
    end
  end
  return match
end

local cwd, err = file.cwd()
errors.ok(err)

if find(0, cwd, positional) then
  process.exit(0)
else
  process.exit(1)
end
