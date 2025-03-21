local pid, err = process.create("/persistent/sys/hello.lua", { argv = {"--help"} })
if err ~= nil then
  output(errors.as_string(err))
  return
end
assert(pid ~= nil)
process.start(pid)
output("Process started, now waiting ...")
process.wait(pid)
output("Child process finished")
