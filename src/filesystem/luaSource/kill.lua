local function error(ctx, msg)
  output(string.format("%s: %s: %s", process.argv[1], ctx, msg))
end

local function abort(ctx, msg)
  error(ctx, msg)
  process.exit(1)
end

local function usage()
  output("Usage: kill PID...")
end

if #process.argv < 2 then
  usage()
  process.exit(0)
end

for _, arg in ipairs(process.argv) do
  if arg == "-h" or arg == "-H" or arg == "--help" then
    usage()
    process.exit(0)
  end
end

for i = 2, #process.argv do
  local pid = tonumber(process.argv[i]) or abort("expected a number, got:", process.argv[i])
  local err = process.kill(pid)
  if err ~= nil then
    error("killing process " .. process.argv[i], errors.as_string(err))
  end
end
