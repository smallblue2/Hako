---@param cond boolean The condition to check.
---@param msg? any The error message.
local function check(cond, msg)
  if not cond then
    if type(msg) == "function" then
      return error(msg())
    else
      return error(msg)
    end
  end
end

local tests = 0
local failed = 0

---@param fallible function The test code.
local function test(name, fallible)
  local ok, err = pcall(fallible)
  if not ok then
    output(string.format("TEST:%d: %s : message(%s) :FAIL", tests, name, err))
    failed = failed + 1
    tests = tests + 1
    return
  end
  output(string.format("TEST:%d: %s :PASS", tests, name))
  tests = tests + 1
end

local function nvals(...)
  return { n = select("#", ...), vals = {...} }
end

local function unwrap(fn_name, ...)
  local ids = {}
  for match in string.gmatch(fn_name, "[%a_]*") do
    table.insert(ids, match)
  end

  local fn = _G
  for _, id in ipairs(ids) do
    fn = fn[id]
  end

  local meta = nvals(fn(...))
  local n = meta.n
  local rvalues = meta.vals

  if n == 1 then
    local err = rvalues[1]
    check(err == nil, function() return string.format("%s returned an error: %s", fn_name, errors.as_string(err)) end)
    return nil
  elseif n == 2 then
    local err = rvalues[2]
    check(err == nil, function() return string.format("%s returned an error: %s", fn_name, errors.as_string(err)) end)
    return rvalues[1]
  end
end

local function ensure_file(path, contents)
  local fd = unwrap("file.open", path, "wc")
  unwrap("file.write", fd, contents)
  unwrap("file.close", fd)
end

local function filedata(path)
  local fd = unwrap("file.open", path, "r")
  local data = unwrap("file.read_all", fd)
  unwrap("file.close", fd)
  return data
end

test("Pipes", function ()
  local data = "xhR2KIyEUBQZLD7laHT7nouF0jY7byCSKhBcXHddit3bo8Tmq+kuhfvq7E9R3TRphWRzcjsVemh2"
  local writer_src = string.format([[
    output("%s", { newline = false })
    process.close_output()
  ]], data)

  local reader_src = [[
    local inp, err = input_all()
    if err ~= nil then
      output(err)
      error("reader failed")
    end
    assert(inp ~= nil)
    local fd, err = file.open("/persistent/return", "wc")
    if err ~= nil then
      output(err)
      error("reader failed")
    end
    file.write(fd, inp)
    file.close(fd)
  ]]

  ensure_file("/persistent/pipe-writer.lua", writer_src)
  ensure_file("/persistent/pipe-reader.lua", reader_src)

  local wtr = unwrap("process.create", "/persistent/pipe-writer.lua", { pipe_in = true, pipe_out = true })
  local rdr = unwrap("process.create", "/persistent/pipe-reader.lua", { pipe_in = true, pipe_out = false })

  unwrap("process.pipe", wtr, rdr)
  unwrap("process.start", rdr)
  unwrap("process.start", wtr)
  unwrap("process.wait", rdr)

  check(data == filedata("/persistent/return"), "Reader outputted unexpected text")
  unwrap("file.remove", "/persistent/return")
end)

test("File does not exist", function()
  local _, err = file.open("/persistent/thisdoesnotexist", "")
  check(err ~= nil, "expected file.open to error")
  local strerr = errors.as_string(err)
  local experr = "No such file or directory"
  check(err ~= nil and strerr == experr, string.format("Got '%s' expected '%s'", strerr, experr))
end)

test("File needs open write", function()
  local fd = unwrap("file.open", "/persistent/newfile", "c")
  assert(fd ~= nil)
  local err = file.write(fd, "xxx")
  check(err ~= nil, "expected file.write to error")
  local strerr = errors.as_string(err)
  local experr = "I/O error"
  check(err ~= nil and strerr == experr, string.format("Got '%s' expected '%s'", strerr, experr))
  unwrap("file.close", fd)
end)

test("File read all", function()
  local testdata =  "InUtdrrM60vv52rA+bBM3XvwAnXLh2hsPk1RDMd4PK"
  local fd = unwrap("file.open", "/persistent/datatoberead", "wc")
  unwrap("file.write", fd, testdata)
  unwrap("file.close", fd)

  fd = unwrap("file.open", "/persistent/datatoberead", "r")
  assert(fd ~= nil)
  local data = unwrap("file.read_all", fd)
  check(data == testdata, "data returned from read_all did not match the testdata")
  unwrap("file.close", fd)
end)

output(string.format("%d Tests %d Failures", tests, failed))
if failed ~= 0 then
  error("Aborting due to test failures")
end
