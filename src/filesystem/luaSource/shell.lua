local pid, err = process.create("/persistent/sys/hello.lua", { argv = {"--help"} })
if err ~= nil then
  output(errors.as_string())
  return
end
process.start(pid)
output("Process started, now waiting ...")
process.wait(pid)
output("Child process finished")
output("Waiting for some input...")
input_all()
terminal.clear()
