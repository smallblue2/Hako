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

local config = {
  print_usage = false,
  recursive = false,
  hide_errors = false,
}

local flags = {
  ["R"] = {
    help = "Recurse on directories",
    handle = function() config.recursive = true end,
  },
  ["f"] = {
    help = "Hide errors",
    handle = function() config.hide_errors = true end,
  },
  ["h"] = {
    help = "Print this help message",
    handle = function() config.print_usage = true end,
  },
  ["help"] = {
    long = true,
    help = "Print this help message",
    handle = function() config.print_usage = true end,
  },
}
local flag_order = { "R", "f", "h" }

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
  output([[
Usage: chmod [OPTION]... [r|w|x] FILE...
Change the permissions of files.
]])
end

local function usage()
  usage_banner()
  output("Options:")
  local max_col1 = 0
  local max_col2 = 0
  for _, flag_name in ipairs(flag_order) do
    local flag = flags[flag_name]
    if #flag_name > max_col1 then
      max_col1 = #flag_name + (flag.long and #"--" or #"-")
    end
    if flag.argument ~= nil and #flag.argument > max_col2 then
      max_col2 = #flag.argument
    end
  end
  for _, flag_name in ipairs(flag_order) do
    local flag = flags[flag_name]
    local flagp = flag.long and "--" or "-"
    output(string.format("%s %s %s", padl(flagp .. flag_name, max_col1 + 1), padr(flag.argument or "", max_col2),
      flag.help))
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
        abort("cannot have more than one short flag with positional argument",
          string.format("'%s' defined before '%s'", positional_flag, sflag))
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

if config.print_usage then
  usage()
  process.exit(0)
end

if #positional < 2 then
  output([[chmod: missing operand
Try 'chmod --help' for more information.]])
  process.exit(0)
end

local mode = positional[1]
if not mode:match("^[rwx][rwx]?[rwx]?$") then
  abort(string.format("invalid operand '%s'", mode), "must be of form [r|w|x] (e.g. w)")
end

local function join_paths(base, add)
  -- Check if ends with `/`
  local end_of_base = base:sub(-1, -1)
  if end_of_base == "/" then
    base = base:sub(1, -2)
  end
  -- Check if starts with `/`
  local start_of_add = add:sub(1, 1)
  if start_of_add == "/" then
    add = add:sub(2, -1)
  end
  return base .. "/" .. add
end

local function filter_rel(entries)
  for i = #entries, 1, -1 do -- so we can in place remove items
    local entry = entries[i]
    if entry == "." or entry == ".." then
      table.remove(entries, i)
    end
  end
end

local function chmod(perm, parent, files)
  for _, file_name in ipairs(files) do
    local full_path = join_paths(parent, file_name)
    local stat, err = file.stat(full_path)
    if err ~= nil then
      error_if(string.format("accessing file '%s'", full_path), errors.as_string(err), not config.hide_errors)
      goto continue
    end
    if stat.type == DIRECTORY then
      local entries
      entries, err = file.read_dir(full_path)
      if err ~= nil then
        error_if(string.format("accessing file '%s'", full_path), errors.as_string(err), not config.hide_errors)
        goto continue
      end
      filter_rel(entries)
      chmod(perm, full_path, entries)
    else
      err = file.permit(full_path, perm)
      if err ~= nil then
        error_if(string.format("changing permission of file '%s'", full_path), errors.as_string(err),
          not config.hide_errors)
      end
    end
    ::continue::
  end
end

local cwd, err = file.cwd()
errors.ok(err)

local files = { table.unpack(positional, 2) }
chmod(mode, cwd, files)
