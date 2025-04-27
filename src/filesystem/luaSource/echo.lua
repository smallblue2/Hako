for i, string in ipairs({ table.unpack(process.argv, 2, #process.argv) }) do
  local msg = i == #process.argv - 1 and string .. "\n" or string .. " "
  output(msg, { newline = false })
end
