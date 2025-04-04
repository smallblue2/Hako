local cwd, err = file.cwd()
if err ~= nil then
output(string.format("pwd: Failed to get current working directory (err: %s)", err))
return
end
output(cwd)
