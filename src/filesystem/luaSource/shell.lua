-- Envrionment Variables
local env_table = {
  PATH = "/sys",
  HOME = "/",
  PROMPT = "$ "
}

function set_env_var(key, value)
  env_table[key] = value
end

function get_env_var(key)
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

-- Safely joins two paths
function join_paths(base, add)
  -- Check if ends with a path
  local end_of_base = string.sub(base, -1)
  if end_of_base == "/" then
    base = string.sub(base, 1, -2)
  end
  local start_of_add = string.sub(add, 1)
  if start_of_add == "/" then
    add = string.sub(add, 2, -1)
  end
  return base.."/"..add
end

function split_paths(paths)
  local individual_paths = {}
  for path in string.gmatch(paths, "([^:]+)") do
    table.insert(individual_paths, path)
  end
  return individual_paths
end

-- Searches the PATH for command, returns path | nil
function find_exec_file(cmd)
  local exec_path = get_env_var("PATH")
  if not exec_path then
    output("Error: PATH environment variable not set")
    return
  end
  local paths = split_paths(exec_path)
  for _, path in ipairs(paths) do
    local looking_for = join_paths(path, cmd[1])
    local fd, err = file.open(looking_for, "r")
    if not err then
      file.close(fd)
      return looking_for
    end
  end
  return nil
end

-- Runs a command from PATH if it can find it
function run_command(cmd)
    local exec_path = find_exec_file(cmd)
    if not exec_path then
      output("Command not found: "..cmd[1])
      return
    end
    local pid, create_err = process.create(exec_path, { argv = cmd, pipe_in = false, pipe_out = false })
    if create_err then
      output("Failed to create process (err:"..err..")")
      return
    end
    local start_err = process.start(pid)
    if start_err then
      output("Failed to start process (err:"..err..")")
      return
    end
    local wait_err = process.wait(pid)
    if wait_err then
      output("Failed to wait on process (err:"..err..")")
      return
    end
end

function prompt()
  local PROMPT = get_env_var("PROMPT") or "$ "
  output(PROMPT, { newline = false })
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
  else
    -- Not a built-in, try and find executable on FS and run it
    run_command(cmd)
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
