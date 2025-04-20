-- #############################
-- ####### Flag Handling #######
-- #############################

local debug = false
local subshell = nil

function handle_flags()
  local i = 2
  while i <= #process.argv do
    local cur_arg = process.argv[i]
    if cur_arg == "--subshell" then
      i = i + 1
      if i > #process.argv[i] then
        output("Usage: shell.lua --subshell [command1] [command2]...")
        process.exit(2)
      end
      subshell = table.concat(process.argv, " ", i)
      break
    end

    if cur_arg == "--debug" then debug = true end

    i = i + 1

  end
end

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
  -- Home is '/', default to it with no second argument
  local path = "/"
  if (cmd.argv[2]) then path = cmd.argv[2] end
  local err = file.change_dir(path)
  if err ~= nil then
    output(string.format("cd: %s", errors.as_string(err)))
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
    return
  end


  local look_custom = false
  if name:sub(1, 1) == "/" then look_custom = true
  elseif name:sub(1, 2) == "./" then look_custom = true end

  if look_custom then
    local fd, err = file.open(name, "r")
    if not err then
      file.close(fd)
      return name
    else
      return nil
    end
  end

  local paths = split_paths(exec_path)
  -- If there is no `.lua` at the end, add it
  if name:sub(-4) ~= ".lua" then
    local luaName = name .. ".lua"
    for _, path in ipairs(paths) do
      local looking_for = join_paths(path, luaName)
      local fd, err = file.open(looking_for, "r")
      if not err then
        file.close(fd)
        return looking_for
      end
    end
  end

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


-- Grammar of what we're parsing:
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
---@param position number The index to begin parsing the line from
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

---Executes and waits on processes gathered within the context of traversing the AST.
---@param ctx table A context table with information from traversing the AST.
---@return string | nil An error message, nil by default
function exec_pids(ctx)
  if #ctx.pids == 0 then
    return nil
  end

  local last_exit = nil
  local err = nil

  for _, pid in ipairs(ctx.pids) do

    err = process.start(pid)
    if err then
      return string.format("Internal Error. Failed to start process (err: %s)", err)
    end

    last_exit = process.wait(pid)

    if debug then
      output(string.format("Last exitcode: %s", last_exit))
    end
  end

  -- Reset pids
  ctx.pids = {}
  -- Keep the last_exit info
  ctx.last_exit = last_exit

  return nil
end

---Gathers `pids` within a pipeline. Creates processes, traverses grouped commands, and handles pipe setup between processes.
---@param pipeline_ast table A pipeline_ast object from parsing input
---@param ctx table Contextual information from travelling the overall AST
---@return string | nil An error message, nil by default
function exec_pipeline(pipeline_ast, ctx)

  if not pipeline_ast then
    return "Internal error. Pipeline_ast is nil"
  end

  -- Keep track of the previous pid for piping
  local prev_pid = nil

  -- Iterate over commands
  local i = 1
  while i <= #pipeline_ast.commands do
    local cmd = pipeline_ast.commands[i]

    -- Grouped command
    if cmd.kind == 'GROUP' then

      -- EDGECASE: We shouldn't create a group_out_pipe closure if this
      --           group command is the last command at the top-level
      local last_command = i == #pipeline_ast.commands
      local at_top_level = ctx.group_depth == 0
      if at_top_level and last_command then ctx.dont_pipe_out = true end

      -- Increase our depth
      ctx.group_depth = ctx.group_depth + 1

      -- Create a closure for the inner group to pipe if there is a prev_pid
      if prev_pid then
        if debug then
          output("Going into Group - Creating GROUP_IN_PIPE")
        end
        ctx.group_in_pipe = function(first_group_pip)
            return process.pipe(prev_pid, first_group_pip)
          end
      end

      -- Traverse the group
      local err = nil
      err = exec_lines(cmd.block, ctx)
      if err then return err end

      -- Reset dont_pipe_out as we're finished with the group
      ctx.dont_pipe_out = false

      -- prev_pid shouldn't be used as `ctx.group_out_pipe` closure
      -- should be used instead as we've just left a group
      prev_pid = nil

      ctx.group_depth = ctx.group_depth - 1
    -- Simple command
    else

      local simple_cmd = cmd.block

      -- EDGECASE: Built-ins are not allowed to be in groups or a part of pipelines
      -- (They don't have stdin or stdout due to lack of proper subshelling)
      -- (They also don't have exit codes due to lack of subshelling)
      if is_built_in(simple_cmd) then
        local err = false
        if i ~= 1 then
          err = true
        end
        if #pipeline_ast.commands > 1 then
          err = true
        end
        if ctx.group_depth > 0 then
          err = true
        end
        if err then
          return "Built-ins are not allowed to be within pipelines or groups"
        end

        built_in(simple_cmd)

        return nil
      end

      -- Get the execution path
      output("GETTING EXEC_PATH")
      local exec_path = find_exec_file(simple_cmd.argv[1])
      if not exec_path then
        output("Couldn't find :(")
        return string.format("Command not found: %s", simple_cmd.argv[1])
      end

      -- Decide if we're piping in/out

      -- Do we have pipe closures to use from groups?
      local has_group_pipe_in = ctx.group_in_pipe ~= nil
      local has_group_pipe_out = ctx.group_out_pipe ~= nil

      if debug then
        output(string.format("end_of_group = (%s and %s and %s)", ctx.group_depth > 0, i == #pipeline_ast.commands, ctx.is_last_pipeline))
      end

      -- We're at the end of a group IFF the depth is above 0 AND we're the final command AND we're the final pipeline
      local end_of_group = (ctx.group_depth > 0 and i == #pipeline_ast.commands and ctx.is_last_pipeline)

      -- Pipe in IFF there's a pipe_in closure from entering a group
      -- OR
      -- Pipe in IFF there's a pipe_out closure from exiting a group
      -- OR
      -- Pipe in IFF we're the in the middle of the pipeline
      local pipe_in = has_group_pipe_in or has_group_pipe_out or (i > 1)
      -- Pipe out IFF we're at the end of a group
      -- OR
      -- Pipe out IFF we're in the middle of a pipeline
      local pipe_out = (end_of_group and not ctx.dont_pipe_out) or (i < #pipeline_ast.commands)

      -- Create the process
      -- TODO: Add redirect_type for both in and out ('<<', '>>')
      local pid, err = process.create(exec_path, {
        argv = simple_cmd.argv,
        pipe_in = pipe_in,
        pipe_out = pipe_out,
        redirect_in = simple_cmd.redirect_in,
        redirect_out = simple_cmd.redirect_out
      })

      if err then
        return string.format("Failed to start process (err: %s)", err)
      end

      if debug then
        output(string.format("CMD: %s | i: %s | pipe_in: %s | pipe_out: %s | pid %s | prev_pid %s", simple_cmd.argv[1], i, pipe_in, pipe_out, pid, prev_pid))
      end

      -- Handle piping processes in
      if pipe_in then
        local pipe_err = nil

        -- If we've just entered a group, use the group_in_pipe closure
        if has_group_pipe_in then
          if debug then
            output("In a group WITH group_pipe_in - using it")
          end
          if not ctx.group_in_pipe then
            return "Internal Error. Expected a group_in_pipe closure."
          end
          pipe_err = ctx.group_in_pipe(pid)
          ctx.group_in_pipe = nil

        -- If we're just out of a group, use the group_out_pipe closure
        elseif has_group_pipe_out then
          if debug then
            output("Just after a group with group_pipe_out - using it")
          end
          if not ctx.group_out_pipe then
            return "Internal Error. Expected a group_out_pipe closure."
          end
          pipe_err = ctx.group_out_pipe(pid)
          ctx.group_out_pipe = nil

        -- Otherwise, pipe to the prev_pid as normal
        else
          pipe_err = process.pipe(prev_pid, pid)
        end

        if pipe_err then
          return string.format("Failed to create pipe (err: %s)", pipe_err)
        end
      end

      -- Create a group_out_pipe closure
      -- IFF we're at the end of a group
      -- AND
      -- IFF we're not told to not pipe out
      if end_of_group and not ctx.dont_pipe_out then
        -- Assumption - confirm it
        if not pipe_out then
          return "Internal Error. Expected pipe_out to be true"
        end

        -- EDGECASE: Could be exiting multiple groups at once, don't override if one exists
        if not ctx.group_out_pipe then
          if debug then output("End of Group - Creating GROUP_OUT_PIPE") end
          ctx.group_out_pipe = function(new_pid)
              return process.pipe(pid, new_pid)
            end
        end
      end

      -- Gather pids in the ctx
      table.insert(ctx.pids, pid)

      -- Keep track of our pid as the previous for potential future piping
      prev_pid = pid
    end
    i = i + 1
  end

  return nil
end

---Executes a line node from the AST.
---@param line_ast table A line ast node from parsing input.
---@param ctx table Contextual information from travelling the overall AST.
---@return string | nil An error message, nil by default
function exec_line(line_ast, ctx)

  if not line_ast then
    return "Internal error. Line_ast is nil"
  end

  -- EDGECASE: The grammar I created supports background processes,
  --           but our system does not yet - report lack of support for now
  if line_ast.background then
    return "Background operation not yet supported."
  end

  -- Check if we're the last pipeline for contextual information
  if #line_ast.subsequent == 0 then
    ctx.is_last_pipeline = true
  else
    ctx.is_last_pipeline = false
  end

  -- Execute first pipeline
  local err = exec_pipeline(line_ast.entry_pipeline, ctx)
  if err then
    return err
  end

  -- For any subsequent pipelines
  for i, pair in ipairs(line_ast.subsequent) do
    -- Check if we're the last pipeline for contextual information
    if i == #line_ast.subsequent then
      ctx.is_last_pipeline = true
    else
      ctx.is_last_pipeline = false
    end

    -- Exec pids only as we need them for short-circuit evaluation
    local exec_pid_err = exec_pids(ctx)
    if exec_pid_err then
      return exec_pid_err
    end

    -- Check if we should execute the next pipeline based on last exit code
    if pair.op == '&&' then
      if ctx.last_exit == 0 then
        err = exec_pipeline(pair.pipeline, ctx)
        if err then
          return err
        end
      end
    elseif pair.op == '||' then
      if ctx.last_exit ~= 0 then
        err = exec_pipeline(pair.pipeline, ctx)
        if err then
          return err
        end
      end
    else
      -- 
      return nil
    end
  end

  -- Got through the entire pipeline!
  return nil
end

---Executes a lines node from the AST.
---@param lines_ast table A lines ast node from parsing input.
---@param ctx table Contextual information from travelling the overall AST.
---@return string | nil An error message, nil by default
function exec_lines(lines_ast, ctx)

  local top_level = false

  if not lines_ast then
    return "Internal error. Lines_ast is nil"
  end

  if not ctx then
    ctx = {
      pids = {},
      group_depth = 0, -- If we're in a group
      is_last_pipeline = false, -- If we're the last pipeline
      group_in_pipe = nil, -- For pipe input into a group
      group_out_pipe = nil, -- For pipe output from a group
      last_exit = nil
    }
    top_level = true
  end

  local err = nil

  for i, line in ipairs(lines_ast) do
    err = exec_line(line, ctx)
    if err then
      return err
    end

    -- If we're at the end of a line, execute all pids
    -- except if we're the last one ( could be at the end of a group )
    if i ~= #lines_ast then
      local exec_pid_err = exec_pids(ctx)
      if exec_pid_err then
        return exec_pid_err
      end
    end
  end

  -- EDGECASE: If we're at the end of the top-level, execute all remaining pids
  if top_level then
    local exec_pid_err = exec_pids(ctx)
    if exec_pid_err then
      return exec_pid_err
    end
  end

  return nil
end

-- #########################
-- ####### Main Loop #######
-- #########################

-- Handle flags
handle_flags()

-- handle subshelling
if subshell then
  local tokens, err = tokenise(subshell)
  if err then
    process.exit(1)
  end
  local ast, _, err2 = parse_lines(tokens, 1, false)
  if err2 then
    process.exit(1)
  end
  local err3 = exec_lines(ast)
  if err3 then
    process.exit(1)
  end
else
-- Not a subshell, execute interatively
  local line = terminal.prompt("$ ")
  while true do
    if line == nil then
      output("\nEOF: exiting")
      break
    end;
    local tokens, token_err = tokenise(line)
    if not token_err then
      if #tokens ~= 0 then
        local ast, _, parse_err = parse_lines(tokens, 1, false)
        if not parse_err then
          local exec_err = exec_lines(ast)
          if exec_err then
            output("Error: " .. exec_err)
          end
        else
          output("Error: " .. parse_err)
        end
      end
    else
      output("Error: " .. token_err)
    end
    line = terminal.prompt("$ ")
  end
end

