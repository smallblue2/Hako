function help()
  output([[Usage: ps [OPTION]
List current processes.
    
Options:
  -h        display this help and exit
  --help    display this help and exit]])
  process.exit(0)
end

function parse_args()
  local opts = { help = false }

  for i = 2, #process.argv do
    local arg = process.argv[i]
    if arg == "-h" or arg == "--help" then
      opts.help = true
    else
      output("ps: invalid option '" .. arg .. "'")
      process.exit(1)
    end
  end

  return opts
end

local opts = parse_args()
if opts.help then
  help()
end

-- Fetch process list
local procs, err = process.list()
if err then
  output("ps: error listing processes: " .. errors.as_string(err))
  process.exit(1)
end

-- Header
output(string.format("%5s %-10s %6s %s", "PID", "STATE", "UP(s)", "COMMAND"))

for _, p in ipairs(procs) do
  output(string.format(
      "%5d %-10s %6.1f %s",
      p.pid,
      p.state,
      p.alive,
      p.path
    ))
end
