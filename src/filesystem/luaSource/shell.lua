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
  BG = { "BG" }, -- BG Process
  AND = { "AND" },
  OR = { "OR" },
  SEQ = { "SEQ" } -- Sequence char ';'
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
  ['r'] = '\r',
  [';'] = ';',
  ['|'] = '|',
  ['&'] = '&'
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
  ['<'] = true,
  ['<<'] = true
}

local redirect_out_map = {
  ['>'] = true,
  ['>>'] = true
}

local pipe_map = {
  ['|'] = true
}


local and_map = {
  ['&&'] = true
}

local or_map = {
  ['||'] = true
}

local sequence_map = {
  [';'] = true
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
    elseif redirect_in_map[char] or redirect_out_map[char] or string_map[char] or pipe_map[char] or bg_map[char] or sequence_map[char] or or_map[char] or and_map[char] then
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
      local lookahead = input:sub(position, position + 1)
      if redirect_in_map[lookahead] then
        table.insert(tokens, { type = token_types.RIN, value = lookahead })
        position = position + 1
      else
        table.insert(tokens, { type = token_types.RIN, value = char })
      end
    elseif redirect_out_map[char] then
      local lookahead = input:sub(position, position + 1)
      if redirect_out_map[lookahead] then
        table.insert(tokens, { type = token_types.ROU, value = lookahead })
        position = position + 1
      else
        table.insert(tokens, { type = token_types.ROU, value = char })
      end
    elseif pipe_map[char] then
      local lookahead = input:sub(position, position + 1)
      if or_map[lookahead] then
        table.insert(tokens, { type = token_types.OR, value = lookahead })
        position = position + 1
      else
        table.insert(tokens, { type = token_types.PIP, value = char })
      end
    elseif bg_map[char] then
      local lookahead = input:sub(position, position + 1)
      if and_map[lookahead] then
        table.insert(tokens, { type = token_types.AND, value = lookahead })
        position = position + 1
      else
        table.insert(tokens, { type = token_types.BG, value = char })
      end
    elseif sequence_map[char] then
      table.insert(tokens, { type = token_types.SEQ, value = char })
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

-- EBNF of what we're parsing:
-- 
-- Lines := Line (';' Line)*
-- Line := Pipeline ( (';' | '&&' | '||') Pipeline )* ('&')?
-- Pipeline := Command ( '|' Command )*
-- Command := word ( word )* Redirects?
-- Redirects := RedirectIn RedirectOut
--            | RedirectOut RedirectIn
--            | RedirectIn
--            | RedirectOut
-- RedirectIn := ('<' | '<<') word
-- RedirectOut := ('>' | '>>') word

-- AST definition
-- CommandNode { argv: {}, redirectIn: string, redirectInType: string, redirectOut: string, redirectOutType: string }
-- PipelineNode { background: bool, commands: {} }
-- LineNode { entryPipeline: PipelineNode, subsequent: {(string, PipelineNode), ...}}}

local pipeline_seperators = {
  [token_types.AND] = true, -- '&&'
  [token_types.OR] = true -- '||'
}

---Parses redirection for a provided command_node from a list of lexical tokens starting at position
---@param tokens table A list of lexical tokens
---@param position number The index to begin parsing tokens at
---@param command_node table The AST command_node to fill with redirection information
---@return number | nil The index of where parsing finished, nil if error
---@return string | nil An error message, nil if no error
function parse_redirect(tokens, position, command_node)
  if tokens[position] and tokens[position].type == token_types.RIN then
    local redirect_type = tokens[position].value
    position = position + 1
    if not tokens[position] then
      return nil, string.format("Invalid command. No redirection file despite '%s'", redirect_type)
    end
    if tokens[position].type ~= token_types.STR then
      return nil, string.format("Invalid command. Redirection file isn't a string '%s'", tokens[position].value)
    end
    if command_node.redirect_in then
      return nil, string.format("Invalid command. Multiple redirections of input")
    end
    command_node.redirect_in = tokens[position].value
    command_node.redirect_in_type = redirect_type
    position = position + 1
  end

  if tokens[position] and tokens[position].type == token_types.ROU then
    local redirect_type = tokens[position].value
    position = position + 1
    if not tokens[position] then
      return nil, string.format("Invalid command. No redirection file despite '%s'", redirect_type)
    end
    if tokens[position].type ~= token_types.STR then
      return nil, string.format("Invalid command. Redirection file isn't a string '%s'", tokens[position].value)
    end
    if command_node.redirect_out then
      return nil, string.format("Invalid command. Multiple redirections of output")
    end
    command_node.redirect_out = tokens[position].value
    command_node.redirect_out_type = redirect_type
    position = position + 1
  end

  return position, nil
end

---Parses a command from tokens starting at position
---@param tokens table A list of lexical tokens
---@param position number The index to begin parsing the tokens at
---@return table | nil A command node, nil if error
---@return number | nil The end position of parsing of the command, nil if error
---@return string | nil An error message, nil unless error
function parse_command(tokens, position)
  local command_node = {
    argv = {},
    redirect_in = nil,
    redirect_in_type = nil,
    redirect_out = nil,
    redirect_out_type = nil
  }

  local cur_pos = position
  local argv_atleast_one = false

  -- keep adding words to argv (need at least one to be valid)
  while tokens[cur_pos] and tokens[cur_pos].type == token_types.STR do
    table.insert(command_node.argv, tokens[cur_pos].value)
    cur_pos = cur_pos + 1
    argv_atleast_one = true
  end

  if not argv_atleast_one then
    return nil, nil, string.format("Expected a command, found '%s'", (tokens[cur_pos] and tokens[cur_pos].value) or "nil")
  end

  local err = nil

  -- Run twice to allow for both Stdin and Stdout redirection
  cur_pos, err = parse_redirect(tokens, cur_pos, command_node)
  if err then
    return nil, nil, err
  end
  cur_pos, err = parse_redirect(tokens, cur_pos, command_node)
  if err then
    return nil, nil, err
  end

  return command_node, cur_pos, nil
end

---Parses tokens from a provided position, generating a pipeline AST node
---@param tokens table An array of tokens
---@param position number The starting position to begin parsing from
---@return table | nil The pipeline AST node generated, nil if error
---@return number | nil The position that parsing ended at, nil if error
---@return string | nil An error message, nil unless error
function parse_pipeline(tokens, position)
  local pipeline_node = {
    commands = {},
  }

  -- Pipeline := Command ( '|' Command )*
  local command_seperators = {
    [token_types.PIP] = true
  }

  local command, end_pos, err = parse_command(tokens, position)
  if err then
    return nil, nil, err
  end
  table.insert(pipeline_node.commands, command)
  -- whilst the next token is a PIPE
  local seperator = tokens[end_pos]
  while seperator and command_seperators[seperator.type] do
    end_pos = end_pos + 1
    command, end_pos, err = parse_command(tokens, end_pos)
    if err then
      return nil, nil, err
    end
    table.insert(pipeline_node.commands, command)
    seperator = tokens[end_pos]
  end

  return pipeline_node, end_pos, nil
end

---Parses a line of tokens to generate an AST of Pipelines
---@param tokens table An array of tokens
---@return table | nil An AST describing a line of input, nil if error
---@return number | nil The index parsing of the line finished at, nil if error
---@return string | nil An error message, nil if no error
function parse_line(tokens, position)
  local line_node = {
    background = false,
    entry_pipeline = nil,
    subsequent = {}
  }

  -- get first pipeline
  local pipeline, return_pos, err = parse_pipeline(tokens, position)
  if err then
    return nil, nil, err
  end
  line_node.entry_pipeline = pipeline

  -- Parse forward for more pipelines
  local seperator = tokens[return_pos]
  while seperator and pipeline_seperators[seperator.type] do
    return_pos = return_pos + 1
    pipeline, return_pos, err = parse_pipeline(tokens, return_pos)
    if err then
      return nil, nil, err
    end
    table.insert(line_node.subsequent, {seperator.value, pipeline})
    seperator = tokens[return_pos]
  end

  if seperator and seperator.type == token_types.BG then
    line_node.background = true
    return_pos = return_pos + 1
  end

  -- Check and make sure it's at the end of the line
  if tokens[return_pos] and not (tokens[return_pos].type == token_types.SEQ) then
    return nil, nil, "Invalid line. '&' isn't at the end of the line."
  end

  return line_node, return_pos, nil
end

---Parses multiple lines delimited by ';'
---@param tokens table An array of tokens
---@return table | nil A lines AST node, this is the root of the shell AST, nil on error
---@return string | nil An error message, nil if no error
function parse_lines(tokens)
  local position = 1

  local lines = {}
  local line, return_pos, err = parse_line(tokens, position)
  if err then
    return nil, err
  end
  table.insert(lines, line)

  while tokens[return_pos] and tokens[return_pos].type == token_types.SEQ do
    return_pos = return_pos + 1
    line, return_pos, err = parse_line(tokens, return_pos)
    if err then
      return nil, err
    end
    table.insert(lines, line)
  end

  return lines, nil
end

-- ###########################
-- ####### AST Walking #######
-- ###########################

function exec_pipeline(pipeline_node)
  local pids = {}
  local commands = pipeline_node.commands
  local prev_pid = nil

  -- Create all processes, piping them all together
  local i = 1
  while i <= #commands do
    local cmd = commands[i]
    if not built_in(cmd) then
      local exec_path = find_exec_file(cmd.argv[1])
      if not exec_path then
        return string.format("Command not found: %s", cmd.argv[1])
      end
      local pid, create_err = process.create(exec_path,
      { argv = cmd.argv, redirect_in = cmd.redirect_in, redirect_out = cmd.redirect_out })
      if create_err then
        return create_err
      end
      if prev_pid then
        local pipe_err = process.pipe(prev_pid, pid)
        if pipe_err then
          return nil, string.format("Failed to pipe processes (err: %s)", pipe_err)
        end
      end
      table.insert(pids, pid)
      prev_pid = pid
    end
    i = i + 1
  end

  return pids, nil
end

function exec_line(line_node)

  -- TODO: Implement background processes
  if line_node.background then
    return "Background processes not implemented yet!"
  end

  -- Collect all piped pids + conditional operations '&&', '||' together in a chain
  local chain = {}

  -- Insert first pipeline
  local pids, err = exec_pipeline(line_node.entry_pipeline)
  if err then
    return err
  end
  -- Insert subsequent ones
  table.insert(chain, pids)
  local sub = line_node.subsequent
  local i = 1
  while i <= #sub do
    local op = sub[i][1]
    local pipeline = sub[i][2]
    pids, err = exec_pipeline(pipeline)
    if err then
      return err
    end
    -- Insert operation ('||', '&&') into chain
    table.insert(chain, op)
    -- Insert pids
    table.insert(chain, pids)
  end

  -- Iterate over chain, starting all processes and waiting on them
  i = 1
  while i <= #chain do
    local next_op_and = false
    local next_op_or = false
    if and_map[chain[i + 1]] then
      next_op_and = true
    elseif or_map[chain[i + 1]] then
      next_op_or = true
    end

    -- Start all processes
    local j = 1
    while j <= #chain[i] do
      process.start(chain[i][j])
      j = j + 1
    end

    -- Keep track of the last exit code incase we need it
    local last_exit_code = nil
    -- Wait for all processes to finish
    j = 1
    while j <= #chain[i] do
      if j == #chain[i] then
        last_exit_code = process.wait(chain[i][j])
      else
         process.wait(chain[i][j])
      end
      j = j + 1
    end

    -- TODO: Implement short-circuit logic properly
    if (next_op_and) then
      if last_exit_code ~= 0 then
        break
      end
    end

    -- if (next_op_or) then
    -- end

    i = i + 1
  end

  return nil
end

function exec_lines(lines_node)
  local i = 1
  while i <= #lines_node do
    local err = exec_line(lines_node[i])
    if err then
      return err
    end
    i = i + 1
  end

  return nil
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
  if not err then
    if #tokens ~= 0 then
      local ast, err = parse_lines(tokens)
      if not err then
        output(inspect(ast))
        local err = exec_lines(ast)
        if err then
          output("Error: " .. err)
        end
      else
        output("Error: " .. err)
      end
    end
  else
    output("Error: " .. err)
  end
  line = terminal.prompt("$ ")
end
