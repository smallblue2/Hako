-- Envrionment Variables
local env_table = {
  PATH = "/sys",
  HOME = "/"
}

function set_env_var(key, value)
  env_table[key] = value
end

function get_env_var(key, value)
  return env_table[key]
end

-- seperates `<key>=<value>` into k, v
function separate_key_value(kv_combined)
  local key, value = string.match(kv_combined, "([^=]+)=([^=]+)")
  return key, value
end

-- export command, for setting env vars
function export(cmd)
    local usage = "Usage: export <key>=<value>"
    if #cmd ~= 2 then
      -- error
      output(usage)
      return
    end
    local k, v = separate_key_value(cmd[2])
    if not (k and v) then
      -- error
      output(usage)
      return
    end
    set_env_var(k, v)
end

-- env command, lists all shell's instance environment vars
function env()
  for k, v in pairs(env_table) do
    output(k.."="..v)
  end
end

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
  elseif cmd[1] == "export" then
    export(cmd)
  elseif cmd[1] == "env" then
    env()
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
