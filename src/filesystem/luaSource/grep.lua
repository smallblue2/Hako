local argv = process.argv
local argi = 2

local function error(ctx, msg)
  output(string.format("%s: %s: %s", process.argv[1], ctx, msg))
end

local function error_if(ctx, msg, cond)
  if cond then
    return error(ctx, msg)
  end
end

local function abort(ctx, msg)
  error(ctx, msg)
  process.exit(1)
end
 
local FILES_MATCH = 1
local FILES_NOMATCH = 2

local config = {
  name_only = 0, -- 1 means print only names that match, 2 means print names that don't match
  match_only = false,
  ignore_case = false,
  line_no = false,
  patterns = {},
  recurse = false,
  filename_prefix = true,
  print_usage = false,
  invert = false,
  quiet = false,
  suppress = false,
  file_set = {}
}

local flags = {
  ["l"] = {
    help = "Show only names of files that match",
    handle = function() config.name_only = 1 end,
  },
  ["L"] = {
    help = "Show only names of files that don't match",
    handle = function() config.name_only = 2 end,
  },
  ["o"] = {
    help = "Show only the matching part of line",
    handle = function() config.match_only = true end,
  },
  ["i"] = {
    help = "Ignore case",
    handle = function() config.ignore_case = true end,
  },
  ["n"] = {
    help = "Add 'line_no:' prefix",
    handle = function() config.line_no = true end,
  },
  ["e"] = {
    help = "Pattern to match",
    argument = "PATTERN",
    handle = function()
      local positional = argv[argi + 1]
      if positional == nil then
        abort("no argument given to flag", "'e'")
      end
      table.insert(config.patterns, positional)
    end,
  },
  ["r"] = {
    help = "Recurse directories",
    handle = function() config.recurse = true end,
  },
  ["h"] = {
    help = "Do not add 'filename:' prefix",
    handle = function() config.filename_prefix = false end,
  },
  ["H"] = {
    help = "Add 'filename:' prefix",
    handle = function() config.filename_prefix = true end,
  },
  ["help"] = {
    long = true,
    help = "Output this help message",
    handle = function() config.print_usage = true end,
  },
  ["v"] = {
    help = "Select non-matching lines",
    handle = function() config.invert = true end,
  },
  ["q"] = {
    help = "Quiet. Return 0 if PATTERN is found, 1 otherwise",
    handle = function() config.quiet = true end, 
  },
  ["s"] = {
    help = "Suppress open and read errors",
    handle = function() config.suppress = true end,
  },
}

local function is_sflag(s)
  return s:match("^%-[^%-]") ~= nil
end

local function is_lflag(s)
  return s:match("^%-%-") ~= nil
end

local function sflags(sflag)
  local flag_i = 2 -- ignore "-"
  return function()
    if flag_i <= #sflag then
      local flag = sflag:sub(flag_i, flag_i)
      flag_i = flag_i + 1
      return flag
    end
    return nil
  end
end

local function get_lflag(lflag)
  return lflag:sub(#"--" + 1)
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
  output("Usage: grep [-vhilHnoqrsL] { PATTERN | -e PATTERN... } [FILE]...")
  output("\nSearch for PATTERN in FILEs (or stdin)\n")
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

local positional = {}
while argi <= #argv do
  local arg = argv[argi]
  if is_sflag(arg) then
    local positional_flag = nil
    for sflag in sflags(arg) do
      local flag = flags[sflag]
      if flag == nil then
        abort("unrecognized option", quote(sflag))
      end
      flag.handle()
      if positional_flag ~= nil then
        abort("cannot have more than one short flag with positional argument", string.format("'%s' defined before '%s'", positional_flag, sflag))
      end
      if flag.argument ~= nil then -- its positional: just consume the positional argument
        argi = argi + 1
        positional_flag = sflag
      end
    end
  elseif is_lflag(arg) then
    local lflag = get_lflag(arg)
    local flag = flags[lflag]
    if flag == nil then
      abort("unrecognized option", quote(lflag))
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

if #argv == 1 then
  config.print_usage = true
end

for i, pos in ipairs(positional) do
  if i == 1 then -- should be the pattern
    table.insert(config.patterns, pos)
  else
    config.file_set[pos] = true
  end
end

if config.print_usage then
  usage()
  process.exit(0)
end

-- Unfortunately we need to explicitly disambiguate whether the user
-- wants to pass the -h flag or they are looking for help.
if not config.filename_prefix and #argv == 2 then
  usage()
  process.exit(0)
end

-- Validate the files and directories
for fname, _ in pairs(config.file_set) do
  if fname ~= "-" then
    local stat, err = file.stat(fname)
    if err ~= nil then
      abort(fname, "No such file or directory")
    end
    if stat.type == DIRECTORY and not config.recurse then
      abort(fname, "Is a directory (maybe try with -r?)")
    end
  end
end

local function out(text)
  if not config.quiet then
    output(text)
  end
end

local function grep_output(ctx, line)
  local prefix = ""
  if config.line_no then
    prefix = prefix .. ctx.line_no .. ":"
  end
  if config.filename_prefix then
    prefix = prefix .. ctx.file_name .. ":"
  end
  if config.match_only then
    out(prefix .. ctx.match)
  else
    out(prefix .. line)
  end
end

local function grep_line(ctx, line)
  local orig_line = line
  if config.ignore_case then
    line = line:lower()
  end

  for i, pat in ipairs(config.patterns) do
    if config.ignore_case then
      pat = pat:lower()
    end
    local match = string.match(line, pat)
    if match then
      ctx.match = match
      if config.name_only == 0 then
        grep_output(ctx, orig_line)
      end
      return true
    end
    if config.invert then
      if config.name_only == 0 then
        grep_output(ctx, orig_line)
      end
      return true
    end
  end
  return false
end

local function grep_text(ctx, text)
  local match = false
  ctx.line_no = 1
  for line in text:gmatch('[^\n]*') do
    if grep_line(ctx, line) then
      match = true
    end
    ctx.line_no = ctx.line_no + 1
  end
  if not match and config.name_only == FILES_NOMATCH then
    output(ctx.file_name)
  end
  if match and config.name_only == FILES_MATCH then
    output(ctx.file_name)
  end
  return match
end

local function grep_file(file_name)
  local fd, err = file.open(file_name, "r")
  if err ~= nil then
    error_if(file, errors.as_string(err), not config.suppress)
    return false
  end
  local data, err = file.read_all(fd)
  if err ~= nil then
    error_if(file, errors.as_string(err), not config.suppress)
    file.close(fd)
    return false
  end
  file.close(fd)
  return grep_text({ file_name = file_name }, data)
end

-- Filter relative directory entries i.e.: ".", ".."
local function filter_rel(entries)
  for i = #entries, 1, -1 do -- so we can in place remove items
    local entry = entries[i]
    if entry == "." or entry == ".." then
      table.remove(entries, i)
    end
  end
end

local function grep(parent, files_or_dirs)
  local match = false
  for _, fname in ipairs(files_or_dirs) do
    if fname == "-" then
      local text, err = process.input_all()
      if err ~= nil then
        error_if("(standard input)", errors.as_string(err), not config.suppress)
      else
        match = grep_text({ file_name = "(standard input)" }, text) or match
      end
    else
      local full_path
      if parent ~= "/" then
        full_path = parent .. "/" .. fname
      else
        full_path = "/" .. fname
      end
      local stat, err = file.stat(full_path)
      if err ~= nil then
        error_if(fname, errors.as_string(err), not config.suppress)
      else
        if stat.type == DIRECTORY then
          local entries, err = file.read_dir(fname)
          if err ~= nil then
            error_if(fname, errors.as_string(err), not config.supress)
          else
            filter_rel(entries)
            match = grep(full_path, entries) or match
          end
        else
          match = grep_file(full_path) or match
        end
      end
    end
  end
  return match
end

local cwd, err = file.cwd()
errors.ok(err)

local files_or_dirs = {}
for fname, _ in pairs(config.file_set) do
  table.insert(files_or_dirs, fname)
end

-- Assume stdin if no files specified
if #files_or_dirs == 0 then
  table.insert(files_or_dirs, "-")
end

if grep(cwd, files_or_dirs) then
  process.exit(0)
else
  process.exit(1)
end
