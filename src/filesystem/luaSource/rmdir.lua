local function usage()
  output([[Usage: rmdir DIRECTORY...
Remove DIRECTORY if it is empty]])
end

if #process.argv == 1 then
  usage()
  process.exit(0)
end

local dirs = { table.unpack(process.argv, 2) }
for _, dir in ipairs(dirs) do
  local _, err = file.stat(dir)
  if err ~= nil then
    output(string.format("rmdir: error accessing directory '%s': %s", dir, errors.as_string(err)))
    goto continue
  end

  err = file.remove_dir(dir)
  if err ~= nil then
    output(string.format("rmdir: error removing directory '%s': %s", dir, errors.as_string(err)))
  end

  ::continue::
end

process.exit(0)
