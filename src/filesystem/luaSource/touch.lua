local errors = false

local function error(ctx, msg)
  errors = true
  output(string.format("%s: %s: %s", process.argv[1], ctx, msg))
end

local function usage()
  output([[
Usage: touch FILE...

Create or access files.]])
end

if #process.argv < 2 then
  usage()
  process.exit(0)
end

table.remove(process.argv, 1)

for _, path in ipairs(process.argv) do
  local stat, _ = file.stat(path)
  if stat ~= nil then
    local fd, err = file.open(path, "r")
    if err ~= nil then
      error("opening file " .. path, errors.as_string(err))
    else
      file.close(fd)
    end
  else
    local fd, err = file.open(path, "c")
    if err ~= nil then
      error("creating file " .. path, errors.as_string(err))
    else
      file.close(fd)
    end
  end
end

if not errors then
  process.exit(0)
else
  process.exit(1)
end
