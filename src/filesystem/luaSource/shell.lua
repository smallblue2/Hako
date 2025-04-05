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
    output(k .. "=" .. v)
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
  return base .. "/" .. add
end

function split_paths(paths)
  local individual_paths = {}
  for path in string.gmatch(paths, "([^:]+)") do
    table.insert(individual_paths, path)
  end
  return individual_paths
end

-- ######################
-- ####### Lexing #######
-- ######################

local token_types = {
  STR = { "STRING" }, -- String
  RIN = { "IN" }, -- Redirect in
  ROU = { "OUT" }, -- Redirect out
  PIP = { "PIPE" }, -- Pipe
  BGP = { "BG" } -- BG Process
}

local escape_map = {
  ['\\'] = '\\',
  [' '] = ' ',
  ['"'] = '"',
  ["'"] = "'",
  ['>'] = '>',
  ['<'] = '<',
  ['n'] = '\n',
  ['t'] = '\t',
  ['r'] = '\r'
}

local white_space_map = {
  [' '] = true,
  ['\n'] = true,
  ['\t'] = true,
  ['\r'] = true
}

local string_map = {
  ["'"] = true,
  ['"'] = true
}

local redirect_in_map = {
  ['<'] = true
}

local redirect_out_map = {
  ['>'] = true
}

local pipe_map = {
  ['|'] = true
}

local bg_map = {
  ['&'] = true
}

---Handles an escaped character
---Assumes character at `position` to be the escape character
---@param input string line of input
---@param position number index within input which contains the escape character
---@return string | nil The resolved escaped character, nil on error
---@return number | nil The position of the end of the escaped character, nil on error
---@return string | nil Error message, nil if no error
function handle_escape(input, position)
  local escape_pos = position + 1
  local escape_char = input:sub(escape_pos, escape_pos)
  local resolved = escape_map[escape_char] or nil
  if not resolved then
    return nil, nil, string.format("Unrecognised escape character '%s'", input:sub(position, escape_pos))
  end
  return resolved, escape_pos, nil
end

---Tokenises a character chain
---@param input string line of input
---@param position number index within input to start tokenising
---@return string | nil Character chain as a string, nil on error
---@return number | nil Position of the end of tokenised character chain, nil on error
---@return string | nil Error message, nil if no error
function lex_char_chain(input, position)
  local buffer = {}

  -- Keep going until whitespace
  while position <= #input do
    local char = input:sub(position, position)

    -- If
    if white_space_map[char] then
      return table.concat(buffer), position, nil
    elseif char == '\\' then
      local escaped_char, new_pos, err = handle_escape(input, position)
      if err ~= nil then
        return nil, nil, err
      end
      table.insert(buffer, escaped_char)
      position = new_pos
    -- If it's a special character, end
    elseif redirect_in_map[char] or redirect_out_map[char] or string_map[char] or pipe_map[char] or bg_map[char] then
      return table.concat(buffer), position - 1, nil
    else
      table.insert(buffer, char)
    end
    position = position + 1
  end

  -- At the end of line of input, return what we have as this is not delimited
  return table.concat(buffer), position, nil
end

---Tokenises a string
---Assumes character at position to be the character to break on (', ")
---@param input string line of input
---@param position number index within input to start tokenising
---@return string | nil Tokenised string as a string, nil on error
---@return number | nil Position of the end of tokenised string, nil on error
---@return string | nil Error message, nil if no error
function lex_string(input, position)
  local string_marker = input:sub(position, position)
  local string_pos = position + 1

  local buffer = {}

  while string_pos <= #input do
    local char = input:sub(string_pos, string_pos)

    if char == string_marker then
      return table.concat(buffer), string_pos, nil
    elseif char == '\\' then
      -- Handle escapes
      local escaped_char, new_pos, err = handle_escape(input, string_pos)
      if err ~= nil then
        return nil, nil, err
      end
      table.insert(buffer, escaped_char)
      string_pos = new_pos
    else
      table.insert(buffer, char)
    end

    string_pos = string_pos + 1
  end

  return nil, nil, "String has no end quote"
end

-- returns tokens, err
---Returns a list of tokens from a string
---@param input string String to tokenise
---@return table | nil A table of tokens, nil on error
---@return string | nil Error message, nil when no error
function tokenise(input)
  local tokens = {}

  local position = 1

  while position <= #input do
    local char = input:sub(position, position)
    -- If whitespace, just continue
    if white_space_map[char] then
      -- If character is the start of a string
    elseif string_map[char] then
      local string, end_of_string_pos, err = lex_string(input, position)
      if err then
        return nil, err
      end
      table.insert(tokens, { type = token_types.STR, value = string })
      position = end_of_string_pos
    elseif redirect_in_map[char] then
      table.insert(tokens, { type = token_types.RIN, value = char })
    elseif redirect_out_map[char] then
      table.insert(tokens, { type = token_types.ROU, value = char })
    elseif pipe_map[char] then
      table.insert(tokens, { type = token_types.PIP, value = char })
    elseif bg_map[char] then
      table.insert(tokens, { type = token_types.BGP, value = char })
    else
      local chain, end_of_chain, err = lex_char_chain(input, position)
      if err then
        return nil, err
      end
      table.insert(tokens, { type = token_types.STR, value = chain })
      position = end_of_chain
    end
    position = position + 1
  end

  return tokens, nil
end

-- #######################
-- ####### Parsing #######
-- #######################

---Parses an array of tokens
---@param tokens table An array of tokens
---@return table | nil A command table describing a command, nil if error
---@return string | nil An error message, nil if no error
function parse(tokens)
  local cmd = {
    argv = {},               -- Positional arguments
    redirect_in_file = nil,  -- string or nil
    redirect_out_file = nil, -- string or nil
    process_pipe_in = nil,
    process_pipe_out = nil,
    background = false -- bool
  }

  local i = 1
  while tokens[i] do
    -- If it's a string, add to argv
    if tokens[i].type == token_types.STR then
      table.insert(cmd.argv, tokens[i].value)
      -- If it's a redirect in, validate and set it
    elseif tokens[i].type == token_types.RIN then
      i = i + 1
      local file = tokens[i]
      if not file then
        return nil, "No file for input redirection '<'"
      end
      if file.type ~= token_types.STR then
        return nil, string.format("Trying to redirect input into invalid file '%s'", file.value)
      end
      if file.value == "" then
        return nil, 'Cannot redirect input to an empty file ""'
      end
      if cmd.redirect_in_file then
        return nil, string.format("Multiple input redirections '%s' and '%s'", cmd.redirect_in_file, file.value)
      end
      if tokens[1].type ~= token_types.STR then
        return nil, "First argument has to be an string, not '<'"
      end
      cmd.redirect_in_file = file.value
      -- If it's a redirect out, validate and set it
    elseif tokens[i].type == token_types.ROU then
      i = i + 1
      local file = tokens[i]
      if not file then
        return nil, "No file for output redirection '>'"
      end
      if file.type ~= token_types.STR then
        return nil, string.format("Trying to redirect output into invalid file '%s'", file.value)
      end
      if file.value == "" then
        return nil, 'Cannot redirect output to an empty file ""'
      end
      if cmd.redirect_out_file then
        return nil, string.format("Multiple output redirections '%s' and '%s'", cmd.redirect_out_file, file.value)
      end
      if tokens[1].type ~= token_types.STR then
        return nil, "First argument has to be a string, not '>'"
      end
      cmd.redirect_out_file = file.value
    elseif tokens[i].type == token_types.PIP then
      i = i + 1
      local proc = tokens[i]
      if not proc then
        return nil, "No process for pipe redirection"
      end
      if proc.type ~= token_types.STR then
        return nil, string.format("Trying to pipe into an invalid process '%s'", proc.value)
      end
      if tokens[1].type ~= token_types.STR then
        return nil, "First argument has to be a string, not '|'"
      end
      -- TODO: Pipes not yet implemented!
      return nil, "Pipes not yet implemented!"
    elseif tokens[i].type == token_types.BGP then
      if cmd.background then
        return nil, "Multiple background declarations '&'"
      end
      if tokens[1].type ~= token_types.STR then
        return nil, "First argument has to be a string, not '&'"
      end
      cmd.background = true
      -- TODO: Implement background processes
      return nil, "Background processes not yet implemented"
    else
      return nil, string.format("Unfamiliar token %s", tokens[i].value)
    end
    i = i + 1
  end

  return cmd, nil
end

-- #################################
-- ####### Command Execution #######
-- #################################

-- Runs a command from PATH if it can find it
function run_command(cmd)
  -- Check if it's a built-in first
  if (built_in(cmd)) then
    return
  end
  -- Proceed to command execution
  local exec_path = find_exec_file(cmd.argv[1])
  if not exec_path then
    output("Command not found: " .. cmd.argv[1])
    return
  end
  local pid, create_err = process.create(exec_path,
    { argv = cmd.argv, pipe_in = false, pipe_out = false, redirect_in = cmd.redirect_in_file, redirect_out = cmd
    .redirect_out_file })
  if create_err then
    output("Failed to create process (err:" .. create_err .. ")")
    return
  end
  local start_err = process.start(pid)
  if start_err then
    output("Failed to start process (err:" .. start_err .. ")")
    return
  end
  -- If it's a background, don't wait
  if not cmd.background then
    local wait_err = process.wait(pid)
    if wait_err then
      output("Failed to wait on process (err:" .. wait_err .. ")")
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
  local tokens, err = tokenise(line)
  if err == nil then
    if #tokens ~= 0 then
      local cmd, err = parse(tokens)
      if err == nil then
        output(inspect(cmd))
        run_command(cmd)
      else
        output("Error: " .. err)
      end
    end
  else
    output("Error: " .. err)
  end
  line = terminal.prompt("$ ")
end
