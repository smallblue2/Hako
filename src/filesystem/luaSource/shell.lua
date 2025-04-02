-- #####################################
-- ####### Envrionment Variables #######
-- #####################################

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

-- ###############################
-- ####### Shell Built-ins #######
-- ###############################

-- export command, for setting env vars
function export(cmd)
    local usage = "Usage: export <key>=<value>"
    if #cmd.argv < 2 then
      -- error
      output(usage)
      return
    end
    local k, v = separate_key_value(cmd.argv[2])
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

function cd(cmd)
  local err = file.change_dir(cmd.argv[2])
  if err ~= nil then
    output(string.format("cd: %s", errors.as_string(err)))
  end
end

function ls(cmd)
  -- TODO: take into account possible arguments
  local entries = file.read_dir(".")
  for _, entry in ipairs(entries) do
    output(entry)
  end
end

function pwd(cmd)
  local cwd, err = file.cwd()
  if err ~= nil then
    output(string.format("pwd: %s", errors.as_string(err)))
    return
  end
  output(cwd)
end

local built_in_table = {
  ["ls"] = ls,
  ["cd"] = cd,
  ["export"] = export,
  ["env"] = env,
  ["pwd"] = pwd
}

-- Checks for and executes a built-in
-- returns `true` if a built-in was executed, `false` otherwise
function built_in(cmd)
  local builtin = built_in_table[cmd.argv[1]]
  if builtin then
    builtin(cmd)
    return true
  end
  return false
end

-- #####################
-- ####### Utils #######
-- #####################

-- Searches the PATH for command, returns path | nil
function find_exec_file(name)
  local exec_path = get_env_var("PATH")
  if not exec_path then
    output("Error: PATH environment variable not set")
    return
  end
  local paths = split_paths(exec_path)
  for _, path in ipairs(paths) do
    local looking_for = join_paths(path, name)
    local fd, err = file.open(looking_for, "r")
    if not err then
      file.close(fd)
      return looking_for
    end
  end
  return nil
end

-- seperates `<key>=<value>` into k, v
function separate_key_value(kv_combined)
  local key, value = string.match(kv_combined, "([^=]+)=([^=]+)")
  return key, value
end

-- Safely joins two paths
function join_paths(base, add)
  -- Check if ends with `/`
  local end_of_base = base:sub(-1, -1)
  if end_of_base == "/" then
    base = base:sub(1, -2)
  end
  -- Check if starts with `/`
  local start_of_add = add:sub(1, 1)
  if start_of_add == "/" then
    add = add:sub(2, -1)
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

-- #######################
-- ####### Parsing #######
-- #######################

function smelly_hacks(line)
  if line == "\n" or line == "" then
    return nil
  end
  return line
end

-- Parses line of input, returns a `cmd` table
function parse_cmd(line)
  line = smelly_hacks(line)
  if not line then return nil end

  local tokens = {}
  for token in string.gmatch(line, "[^%s]+") do
    table.insert(tokens, token)
  end

  local cmd = {
    argv = {}, -- Positional arguments
    redirect_in_file = nil, -- string or nil
    redirect_out_file = nil, -- string or nil
    process_pipe_in = nil,
    process_pipe_out = nil,
    background = false -- bool
  }

  local i = 1
  while i <= #tokens do
    local t = tokens[i]
    if t == ">" then
      -- next token should be filename
      i = i + 1
      cmd.redirect_out_file = join_paths(file.cwd(), tokens[i])
    elseif t == "<" then
      -- next token should be filename
      i = i + 1
      cmd.redirect_in_file = join_paths(file.cwd(), tokens[i])
    elseif t == "&" then
      cmd.background = true
    else
      -- treat as an argument
      table.insert(cmd.argv, t)
    end
    i = i + 1
  end
  
  return cmd
end

-- #################################
-- ####### Command Execution #######
-- #################################

-- Runs a command from PATH if it can find it
function run_command(cmd)
    output(inspect(cmd))
    local exec_path = find_exec_file(cmd.argv[1])
    if not exec_path then
      output("Command not found: "..cmd.argv[1])
      return
    end
    local pid, create_err = process.create(exec_path, { argv = cmd, pipe_in = false, pipe_out = false, redirect_in = cmd.redirect_in_file, redirect_out = cmd.redirect_out_file })
    if create_err then
      output("Failed to create process (err:"..create_err..")")
      return
    end
    local start_err = process.start(pid)
    if start_err then
      output("Failed to start process (err:"..start_err..")")
      return
    end
    -- If it's a background, don't wait
    if not cmd.background then
      local wait_err = process.wait(pid)
      if wait_err then
        output("Failed to wait on process (err:"..wait_err..")")
        return
      end
    end
end

-- #########################
-- ####### Main Loop #######
-- #########################

function prompt()
  local PROMPT = get_env_var("PROMPT") or "$ "
  output(PROMPT, { newline = false })
end

local line = terminal.prompt("$ ")
while true do
  if line == nil then
    output("\nEOF: exiting")
    break
  end;
  local cmd = parse_cmd(line)
  if cmd and not built_in(cmd) then
    run_command(cmd)
  end
  line = terminal.prompt("$ ")
end
