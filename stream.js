const { spawn } = require('child_process')

const tail = spawn('tail', ['-f', 'console.txt'])

console.clear()

tail.stdout.on('data', (data) => {
	console.log(`Received data: ${data}`)
})

tail.stderr.on('data', (data) => {
	console.error(`Error: ${data}`)
})

tail.on('close', (code) => {
	console.log(`tail process closed with code ${code}`)
})
