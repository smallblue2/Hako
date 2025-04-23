-- If we have less than 2 arguments (e.g. {"cat"}),
-- they haven't given us any files to read!
if #process.argv < 2 then
  output("Usage: cat <file1> [file2 ...]")
  return
end

-- For each file in the args, starting from the second arg (first file)
for i = 2, #process.argv do

  local filename = process.argv[i]
  -- Make sure it's a file and not a directory
  local stat, err0 = file.stat(filename)
  if err0 then
    output(string.format("Error: Cannot stat '%s' (err: %s)", filename, err0))
    return
  end
  if stat.type == DIRECTORY then
    output(string.format("Error: '%s' is a directory", filename))
    return
  end

  -- Open it
  local fd, err1 = file.open(filename, "r")
  -- Make sure it opened OK
  if err1 then
    output(string.format("Error: Cannot open '%s' (err: %s)", filename, err1))
  else
    -- Keep reading until we break the loop!
    while true do
      -- Try and read 1024 bytes
      local chunk, err2 = file.read(fd, 1024)
      if err2 then
        -- We couldn't read it, lets move onto the next file, something is wrong
        -- with this one
        output(string.format("Error: Failed a read on '%s' (err: %s)", filename, err2))
        break
      else
        -- If we got nothing back, we're at the end of the file, break the loop!
        if  chunk == "" then break end
        -- Output what we read
        output(chunk)
      end
    end
    -- Make sure to close the file when we're finished with it
    file.close(fd)
  end
end
