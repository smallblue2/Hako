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
  sources = {},
  dest = nil,
  prompt_overwrite = false,
  overwrite_existing = true,
  refuse_file_to_dir = false,
  print_usage = false,
}

local flags = {
  ["f"] = {
    help = "Don't prompt before overwriting",
    handle = function() config.prompt_overwrite = false end,
  },
  ["i"] = {
    help = "Interactive, prompt before overwrite",
    handle = function() config.prompt_overwrite = true end,
  },
  ["n"] = {
    help = "Don't overwrite an existing file",
    handle = function() config.overwrite_existing = false end,
  },
  ["T"] = {
    help = "Refuse to move if DEST is a directory",
    handle = function() config.refuse_file_to_dir = true end,
  },
  ["h"] = {
    help = "Show this help message",
    handle = function() config.print_usage = true end,
  },
}
local flag_order = {"f", "i", "n", "T"}

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
Usage: mv [-finT] SOURCE DEST
or: mv [-fin] SOURCE... DIRECTORY

Rename SOURCE to DEST, or move SOURCEs to DIRECTORY
]])
end

local function usage()
  usage_banner()
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

if #argv == 1 or #positional == 1 then
  config.print_usage = true
end

if config.print_usage then
  usage()
  process.exit(0)
end

for i, pos in ipairs(positional) do
  if i == #positional then
    config.dest = pos
  else
    table.insert(config.sources, pos)
  end
end

if config.refuse_file_to_dir and #config.sources ~= 1 then
  abort(quote(positional[3]), "extra operand")
end

local function confirm(msg)
  local answer = terminal.prompt(msg .. " ")
  return answer and answer:match("^[Yy]")
end

local function basename(path)
  return path:match("[^/]*$")
end

local function exists(path)
  return select(2, file.stat(path)) == nil
end

local function trim_slash(path)
  if path == "/" then return "/" end
  return path:match(".*[^/$]")
end

local multiple_sources = #config.sources ~= 1
if multiple_sources then
  -- config.dest should be a directory
  local stat, err = file.stat(config.dest)
  if err ~= nil then
    abort(config.dest, errors.as_string(err))
  end

  if stat.type ~= DIRECTORY then
    abort(string.format("target '%s'", config.dest), "Not a directory")
  end

  -- Move all the sources into the directory
  for _, src in ipairs(config.sources) do
    local name = basename(src)
    local dst = trim_slash(config.dest) .. "/" .. basename(name)
    if exists(dst) then
      if not config.overwrite_existing or (config.prompt_overwrite and not confirm(string.format("mv: overwrite '%s'? [y/N]", name))) then
        goto continue
      end
    end
    err = file.move(src, dst)
    if err ~= nil then
      abort(string.format("moving '%s' to '%s'", src, dst), errors.as_string(err))
    end
    ::continue::
  end
else
  local src = config.sources[1]
  local dst = config.dest

  local src_stat, err = file.stat(src)
  if err ~= nil then
    abort(src, errors.as_string(err))
  end

  local dst_stat, dst_err = file.stat(dst)
  local dst_exists = dst_err == nil

  if dst_exists and src_stat.type == FILE and dst_stat.type == DIRECTORY
      and config.refuse_file_to_dir then
    abort("moving files", string.format("'%s' is a directory", config.dest))
  end

  if dst_exists then
    if not config.overwrite_existing or (config.prompt_overwrite and not confirm(string.format("mv: overwrite '%s'? [y/N]", basename(src)))) then
      goto skip
    end
  end

  if dst_exists and dst_stat.type == DIRECTORY then
    dst = trim_slash(dst) .. "/" .. basename(src)
  end

  err = file.move(src, dst)
  if err ~= nil then
    abort(string.format("moving '%s' to '%s'", src, dst), errors.as_string(err))
  end

  ::skip::
end
