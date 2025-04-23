local had_errors = false

local function error(ctx, msg)
  had_errors = true
  output(string.format("%s: %s: %s", process.argv[1], ctx, msg))
end

local function usage()
  output([[
Usage: lua [LUA CODE]...

Run lua code directly.
  ]])
end

if #process.argv < 2 then
  usage()
  process.exit(0)
end

table.remove(process.argv, 1)

local fd, err = file.open("/tmplua", "cw")
errors.ok(err)

for i, code in ipairs(process.argv) do
  file.truncate(fd, 0)
  file.write(fd, code)
  file.close(fd)
  fd, _ = file.open("/tmplua", "w")
  local pid, err = process.create("/tmplua", { argv = {"/tmplua"} })
  process.start(pid)
  local status = process.wait(pid)
  if status ~= 0 then
    error("lua code " .. i .. " exited abnormally", status)
  end
end

file.close(fd)
file.remove("/tmplua")

if not had_errors then
  process.exit(0)
else
  process.exit(1)
end
