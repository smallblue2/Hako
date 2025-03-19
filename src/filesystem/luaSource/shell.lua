output("cathal smells")
output(inspect(process.argv))
local sr, err = file.stat("/persistent/sys/")
if err ~= nil then
  output(errors.as_string(err))
  process.exit(1)
end
output(inspect(sr))
sr, err = file.stat("/persistent/sys/shell.lua")
if err ~= nil then
  output(errors.as_string(err))
  process.exit(1)
end
output(inspect(sr))
-- output(inspect(select(1, file.stat("/persistent/sys/"))))
-- output(inspect(select(1, file.stat("/persistent/sys/shell.lua"))))
