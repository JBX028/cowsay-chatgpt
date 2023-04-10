const { spawn } = require('child_process')
const { color, log, white, red, green } = require('console-log-colors')

const tail = spawn('tail', ['-f', 'console.txt'])

console.clear()

tail.stdout.on('data', (data) => {
	console.log(white(`Received data: ${green(data)}`))
})

tail.stderr.on('data', (data) => {
	console.log(white(`Error: ${red(data)}`))
})

tail.on('close', (code) => {
	console.log(`tail process closed with code ${code}`)
})