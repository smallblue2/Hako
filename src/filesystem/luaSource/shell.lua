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
  ["env"] = env
}

function is_built_in(cmd)
  return built_in_table[cmd.argv[1]] ~= nil
end

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
  SEQ = { "SEQ" }, -- Sequence char ';'
  BRK = { "BRACKET "} -- Grouping char '{', '}'
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
  ['&'] = '&',
  ['{'] = '{',
  ['}'] = '}'
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

local group_map = {
  ['{'] = true,
  ['}'] = true
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
    elseif redirect_in_map[char] or redirect_out_map[char] or string_map[char] or pipe_map[char] or bg_map[char] or sequence_map[char] or or_map[char] or and_map[char] or group_map[char] then
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
    elseif group_map[char] then
      table.insert(tokens, { type = token_types.BRK, value = char })
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
-- 
-- Line := Pipeline ( ('&&' | '||') Pipeline )* ('&')?
-- 
-- Pipeline := Command ( '|' Command )*
-- 
-- Command := SimpleCommand
--          | GroupedCommand
-- 
-- GroupedCommand := '{' Lines '}'
-- 
-- SimpleCommand := word ( word )* Redirects?
-- 
-- Redirects := RedirectIn RedirectOut
--            | RedirectOut RedirectIn
--            | RedirectIn
--            | RedirectOut
-- 
-- RedirectIn := ('<' | '<<') word
-- RedirectOut := ('>' | '>>') word

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

---Parses a simple command from tokens starting at position
---@param tokens table A list of lexical tokens
---@param position number The index to begin parsing the tokens at
---@return table | nil A simple command node, nil if error
---@return number | nil The end position of parsing of the command, nil if error
---@return string | nil An error message, nil unless error
function parse_simple_command(tokens, position)
  -- SimpleCommand := word ( word )* Redirects?

  -- Store command info
  local command = {
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
    table.insert(command.argv, tokens[cur_pos].value)
    cur_pos = cur_pos + 1
    argv_atleast_one = true
  end

  -- If there is not a single word in the command, error
  if not argv_atleast_one then
    return nil, nil, string.format("Expected a command, found '%s'", (tokens[cur_pos] and tokens[cur_pos].value) or "nil")
  end

  local err = nil

  -- Run twice to allow for both Stdin and Stdout redirection
  cur_pos, err = parse_redirect(tokens, cur_pos, command)
  if err then
    return nil, nil, err
  end
  cur_pos, err = parse_redirect(tokens, cur_pos, command)
  if err then
    return nil, nil, err
  end

  local simple_command_node = {
    kind = "SIMPLE",
    block = command
  }

  return simple_command_node, cur_pos, nil
end

---Parses a grouped command from tokens starting at position
---@param tokens table A list of lexical tokens
---@param position number The index to begin parsing the tokens at
---@return table | nil A line node, nil if error
---@return number | nil The end position of parsing of the command, nil if error
---@return string | nil An error message, nil unless error
function parse_grouped_command(tokens, position)
  -- GroupedCommand := '{' Lines '}'

  -- Consume the opening bracket
  position = position + 1

  -- Parse lines until closing bracket
  local lines, return_pos, err = parse_lines(tokens, position, true)
  if err then
    return nil, nil, err
  end
  -- Ensure it's not empty
  if #lines == 0 then
    return nil, nil, "Invalid command group. Empty brackets."
  end

  -- Confirm the closing bracket
  local token = tokens[return_pos]
  if not token or token.type ~= token_types.BRK or token.value ~= '}' then
    return nil, nil, "Invalid command group. Expected '}'."
  end
  -- Consume the closing bracket '}'
  return_pos = return_pos + 1

  local grouped_node = {
    kind = "GROUP",
    block = lines
  }

  return grouped_node, return_pos, nil
end

---Parses a command from tokens starting at position
---@param tokens table A list of lexical tokens
---@param position number The index to begin parsing the tokens at
---@return table | nil A command node, nil if error
---@return number | nil The end position of parsing of the command, nil if error
---@return string | nil An error message, nil unless error
function parse_command(tokens, position)
  -- Command := SimpleCommand
  --          | GroupedCommand

  local tok = tokens[position]
  if not tok then
    return nil, nil, "Expected a command, but found end of input."
  end

  if tok.type == token_types.STR then
    return parse_simple_command(tokens, position)
  elseif tok.type == token_types.BRK and tok.value == '{' then
    return parse_grouped_command(tokens, position)
  else
    return nil, nil, string.format("Expected a command, found '%s'.", tok.value)
  end
  
end

---Parses tokens from a provided position, generating a pipeline AST node
---@param tokens table An array of tokens
---@param position number The starting position to begin parsing from
---@return table | nil The pipeline AST node generated, nil if error
---@return number | nil The position that parsing ended at, nil if error
---@return string | nil An error message, nil unless error
function parse_pipeline(tokens, position)
  -- Pipeline := Command ( '|' Command )*

  -- Parse the first command
  local cmd, pos, err = parse_command(tokens, position)
  if err then
    return nil, nil, err
  end

  local pipeline_node = {
    commands = { cmd }
  }

  -- whilst the next token is a PIPE, parse another command
  while true do
    local next_tok = tokens[pos]
    if not next_tok then break end
    if next_tok.type ~= token_types.PIP then break end

    -- Consume the '|'
    pos = pos + 1

    -- Parse the command
    local next_cmd, new_pos, err2 = parse_command(tokens, pos)
    if err2 then
      return nil, nil, err2
    end
    pos = new_pos

    table.insert(pipeline_node.commands, next_cmd)
  end

  return pipeline_node, pos, nil
end

---Parses a line of tokens to generate an AST of Pipelines
---@param tokens table An array of tokens
---@return table | nil An AST describing a line of input, nil if error
---@return number | nil The index parsing of the line finished at, nil if error
---@return string | nil An error message, nil if no error
function parse_line(tokens, position)
  -- Line := Pipeline ( ('&&' | '||') Pipeline )* ('&')?

  -- get first pipeline
  local pipeline, pos, err = parse_pipeline(tokens, position)
  if err then
    return nil, nil, err
  end

  -- Keep parsing pipelines as long as they're seperated with the correct token
  -- until there are no more
  local subsequent = {}
  while true do
    local next_tok = tokens[pos]
    if not next_tok then break end
    if not (next_tok.type == token_types.AND or next_tok.type == token_types.OR) then
      break
    end

    -- consume the '&&' or '||' operator
    local op = next_tok.value
    pos = pos + 1

    -- parse the next pipeline
    local next_pipe, new_pos, err2 = parse_pipeline(tokens, pos)
    if err2 then
      return nil, nil, err2
    end
    pos = new_pos

    table.insert(subsequent, { op = op, pipeline = next_pipe})
  end

  -- Check to see if it ends with a BG token '&'
  local background = false
  if tokens[pos] and tokens[pos].type == token_types.BG then
    background = true
    -- consume
    pos = pos + 1
  end

  -- Store parsed line information
  local line_node = {
    background = background,
    entry_pipeline = pipeline,
    subsequent = subsequent
  }

  return line_node, pos, nil
end

---Parses multiple lines delimited by ';'
---@param tokens table An array of tokens
---@param position number The index to begin parsing on
---@param stop_on_brace boolean Whether it should stop on a closing brace or not
---@return table | nil A lines AST node, this is the root of the shell AST, nil on error
---@return number | nil The index of which parsing finished
---@return string | nil An error message, nil if no error
function parse_lines(tokens, position, stop_on_brace)
  -- Lines := Line (';' Line)*

  -- Save parsed lines
  local lines = {}
  local pos = position

  while true do
    local next_tok = tokens[pos]
    -- If we're told to stop on '}', and the next token is '}', break
    if stop_on_brace and next_tok and next_tok.type == token_types.BRK and next_tok.value == '}' then
      break
    end

    -- If no tokens left, error, expecting a line
    if not next_tok then
      return nil, nil, "Invalid parse. Expected a line, got nothing."
    end

    -- Parse a line
    local line_node, new_pos, err = parse_line(tokens, pos)
    if err then
      return nil, nil, err
    end
    table.insert(lines, line_node)
    pos = new_pos

    -- If there is another token
    if tokens[pos] then
      -- If it's ';', consume and break
      if tokens[pos].type == token_types.SEQ then
        pos = pos + 1
      -- If it's '}', and we're told to stop on it, break without consuming
      elseif stop_on_brace and tokens[pos].type == token_types.BRK and tokens[pos].value == '}' then
        break;
      -- Else, unrecognised token, error
      else
        return nil, nil, string.format("Invalid parse. Expected ';' or nothing, got '%s'.", tokens[pos].value)
      end
    else
      -- end of input, break
      break
    end
  end

  return lines, pos, nil
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
    -- if it's a builtin, add the builtin closure to the `pids`
    if is_built_in(cmd) then
      table.insert(pids,
        function()
          built_in_table[cmd.argv[1]](cmd)
        end
      )
      prev_pid = nil
    -- otherwise add the pid to be started
    else
      local exec_path = find_exec_file(cmd.argv[1])
      if not exec_path then
        return string.format("Command not found: %s", cmd.argv[1])
      end
      -- TODO: Implement redirect_in_type and redirect_out_type on process.create
      local pipe_in = i > 1
      local pipe_out = i < #commands
      local pid, create_err = process.create(exec_path,
      { argv = cmd.argv, pipe_in = pipe_in, pipe_out = pipe_out, redirect_in = cmd.redirect_in, redirect_out = cmd.redirect_out })
      if create_err then
        return create_err
      end
      -- Pipe them all together
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
  table.insert(chain, {pids = pids, op = nil})
  local sub = line_node.subsequent
  local i = 1
  while i <= #sub do
    local op = sub[i][1]
    local pipeline = sub[i][2]
    pids, err = exec_pipeline(pipeline)
    if err then
      return err
    end
    table.insert(chain, { pids = pids, op = op })
    i = i + 1
  end

  local last_chain_exit_code = nil

  -- Iterate over chain, starting all processes and waiting on them
  i = 1
  while i <= #chain do
    local prev_and = and_map[chain[i].op]
    local prev_or = or_map[chain[i].op]

    -- Non-nested short-circuit evaluation supported currently only
    if last_chain_exit_code == nil or (prev_and and last_chain_exit_code == 0) or (prev_or and last_chain_exit_code ~= 0) then
      -- In order to support built-ins within pipelines, we need to
      -- implement `sub-shelling`. Until this is done, built-ins are
      -- considered an edge-case
      if type(chain[i].pids[1]) == "function" then
        if #chain[i].pids > 1 then
          return "Built-ins can only be ran in isolation, not within pipelines"
        end
        chain[i].pids[1]()
        last_chain_exit_code = 0
      else
        -- Start all processes
        local j = 1
        while j <= #(chain[i].pids) do
          -- If it's a builtin, execute it
          if type(chain[i].pids[j]) == "function" then
            chain[i].pids[j]()
          else
          -- If it's a pid, start it
            process.start(chain[i].pids[j])
          end
          j = j + 1
        end

        -- Wait for all processes to finish
        j = 1
        while j <= #(chain[i].pids) do
          if j == #chain[i].pids then
            last_chain_exit_code = process.wait(chain[i].pids[j])
          else
             process.wait(chain[i].pids[j])
          end
          j = j + 1
        end

      end
    end

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
      local ast, position, err = parse_lines(tokens, 1, false)
      if not err then
        -- local err = exec_lines(ast)
        -- if err then
        --   output("Error: " .. err)
        -- end
        output(inspect(ast))
      else
        output("Error: " .. err)
      end
    end
  else
    output("Error: " .. err)
  end
  line = terminal.prompt("$ ")
end
