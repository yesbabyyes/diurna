{spawn, exec} = require 'child_process'

option '-p', '--prefix [DIR]', 'set the installation prefix for `cake install`'

task 'build', 'continually build the diurna library with --watch', ->
  coffee = spawn 'coffee', ['-cw', '-o', 'lib', 'src']
  coffee.stdout.on 'data', (data) -> console.log data.toString().trim()

task 'install', 'install the `diurna` command into /usr/local (or --prefix)', (options) ->
  base = options.prefix or '/usr/local'
  lib  = base + '/lib/diurna'
  exec([
    'mkdir -p ' + lib
    'cp -rf bin README resources vendor lib ' + lib
    'ln -sf ' + lib + '/bin/diurna ' + base + '/bin/diurna'
  ].join(' && '), (err, stdout, stderr) ->
   if err then console.error stderr
  )
