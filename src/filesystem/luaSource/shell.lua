function prompt()
  output("$ ", { newline = false })
end

function parse_cmd(line)
  local parsed = {}
  for token in string.gmatch(line, "[^%s]+") do
    table.insert(parsed, token)
  end
  return parsed
end

prompt()
local line = input_line()
while #line ~= 0 do
  local cmd = parse_cmd(line)
  if cmd[1] == "ls" then
    local entries = file.read_dir(".")
    for _, entry in ipairs(entries) do
      output(entry)
    end
  elseif cmd[1] == "cd" then
    local err = file.change_dir(cmd[2])
    if err ~= nil then
      output(string.format("cd: %s", errors.as_string(err)))
    end
  end
  prompt()
  line = input_line()
end
process.start(pid)
output("Process started, now waiting ...")
process.wait(pid)
output("Child process finished")
output("Waiting for some input...")
input_all()
terminal.clear()
