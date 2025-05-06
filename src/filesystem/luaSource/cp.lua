-- ===================================================
-- Helpers
-- ===================================================

function help()
  output([[Usage: cp [OPTION]... SOURCE... DEST

Copy SOURCE to DEST, or multiple SOURCE(s) into directory DEST.

Options:
  -f, --force        overwrite without prompting
  -n, --no-clobber   do not overwrite existing files
  -i, --interactive  prompt before overwrite
  -r, --recursive    copy directories recursively
  -h, --help         display this help and exit]])
end

function report_error(src, dst, err)
  local msg = errors.as_string(err) or ("error " .. tostring(err))
  output(string.format("cp: cannot copy '%s' to '%s': '%s'", src, dst, msg))
end

function confirm(msg, opts)
  if not opts.interactive then
    return false
  end
  local ans = terminal.prompt(msg .. " [y/N] ")
  return ans and ans:match("^[Yy]")
end

function trim_slash(msg)
  if msg == "/" then return "/" end
  return msg:match(".*[^/$]")
end

function basename(path)
  return path:match("([^/]+)$")
end

function join_path(first, second)
  return (first:sub(-1) == "/") and (first .. second) or (first .. "/" .. second)
end

-- ===================================================
-- Parse
-- ===================================================

function parse_args()
  local opts = {
    force = false,
    no_clobber = false,
    interactive = false,
    recursive = false,
    help = false
  }
  local args = {}

  for i = 2, #process.argv do
    local arg = process.argv[i]
    if arg == "-h" or arg == "--help" then opts.help = true
    elseif arg == "-f" or arg == "--force" then opts.force = true
    elseif arg == "-n" or arg == "--no-clobber" then opts.no_clobber = true
    elseif arg == "-i" or arg == "--interactive" then opts.interactive = true
    elseif arg == "-r" or arg == "--recursive" then opts.recursive = true
    elseif arg:sub(1,1) == "-" and #arg > 1 then
      for flag in arg:sub(2):gmatch(".") do
        if flag == "f" then opts.force = true
        elseif flag == "n" then opts.no_clobber = true
        elseif flag == "i" then opts.interactive = true
        elseif flag == "r" then opts.recursive = true
        elseif flag == "h" then opts.help = true
        else
          local inv_opt = ""
          if flag == "-" then
            inv_opt = arg
          else
            inv_opt = flag
          end
          output(string.format("cp: invalid option -- '%s'", inv_opt))
          output("Try 'cp --help' for more information")
          process.exit(1)
        end
      end
    else
      table.insert(args, arg)
    end
  end

  -- -n overrides -f
  if opts.no_clobber then
    opts.force = false
  end

  -- -i overrides -f
  if opts.interactive then
    opts.force = false
  end

  return opts, args
end

-- ===================================================
-- Copying
-- ===================================================

function copy_file(src, dst, opts, err_flag)
  local st, serr = file.stat(src)
  if serr then
    report_error(src, dst, serr)
    err_flag[1] = true
  end

  -- check if dest exists
  local dst_st, dst_err = file.stat(dst)
  if dst_st then
    if opts.no_clobber then
      return
    end
    if opts.interactive then
      if not confirm(string.format("cp: overwrite '%s'?", dst), opts) then
        return
      end
    end
  end

  -- open source
  local infd, inerr = file.open(src, "r")
  if inerr then
    report_error(src, dst, inerr)
    err_flag[1] = true
    return
  end

  -- Delete destination if it exists
  if dst_st then
    local remerr = file.remove(dst)
    if remerr then
      report_error(src, dst, remerr)
      err_flag[1] = true
      return
    end
  end

  -- open destination
  local outfd, outerr = file.open(dst, "wc")
  if outerr then
    report_error(src, dst, outerr)
    err_flag[1] = true
    return
  end

  -- read source
  local content, readerr = file.read_all(infd)
  if readerr then
    report_error(src, dst, readerr)
    err_flag[1] = true
    return
  end

  -- write read content to destination
  local writerr = file.write(outfd, content)
  if writerr then
    report_error(src, dst, readerr)
    err_flag[1] = true
    return
  end

  file.close(infd)
  file.close(outfd)
end

function copy_path(src, dst, opts, err_flag)
  local st, serr = file.stat(src)
  if serr then
    report_error(src, dst, serr)
    err_flag[1] = true
    return
  end

  if st.type == DIRECTORY then
    if not opts.recursive then
      output(string.format("cp: omitting directory '%s'", src))
      return
    end

    local dst_st, dst_err = file.stat(dst)
    if dst_st and dst_st.type ~= DIRECTORY then
      output(string.format("cp: cannot overwrite non-directory '%s' with directory '%s'", dst, src))
      err_flag[1] = true
      return
    end

    -- make destination directory if needed
    if not dst_st then
      local merr = file.make_dir(dst)
      if merr then
        report_error(src, dst, merr)
        err_flag[1] = true
        return
      end
    end

    -- copy entries
    local entries, ent_err = file.read_dir(src)
    if ent_err then
      report_error(src, dst, merr)
      err_flag[1] = true
      return
    end
    for _, entry in ipairs(entries) do
      if entry ~= "." and entry ~= ".." then
        copy_path(
          join_path(src, entry),
          join_path(dst, entry),
          opts,
          err_flag
        )
      end
    end

  else

    -- regular file
    copy_file(src, dst, opts, err_flag)
  end
end

-- ===================================================
-- Main
-- ===================================================

local opts, args = parse_args()

if opts.help then
  help()
  process.exit(0)
end

if #args < 2 then
  output("cp: missing file operand")
  output("Try 'cp --help' for more information")
  process.exit(2)
end

local err_flag = { false }
local dst = args[#args] -- Destination is final arg
local sources = { table.unpack(args, 1, #args - 1) }
local dest_is_dir = false

-- If multiple sources, destination MUST be a directory
local dst_st, dst_err = file.stat(dst)
if dst_st then
  if dst_st.type == DIRECTORY then dest_is_dir = true end
  if dst_is_dir and #sources > 1 then
    output(string.format("cp: target '%s' is not a directory", dst))
  end
end

-- Copy each source
for _, src in ipairs(sources) do
  local target = dest_is_dir and join_path(dst, basename(trim_slash(src))) or dst
  copy_path(src, target, opts, err_flag)
end

if err_flag[1] then
  process.exit(1)
end
process.exit(0)
