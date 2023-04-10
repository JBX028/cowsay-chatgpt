const fs = require('fs')

const consoleStream = (text) => {
    fs.writeFileSync('console.txt', text)
}

consoleStream('')

console.log("\x1b[96m\x1b[1m*****OBJECTIVE*****\x1b[0m\x1b[0m")
console.log('\x1b[91m%s\x1b[0m', "*****USING GPT-4. POTENTIALLY EXPENSIVE. MONITOR YOUR COSTS*****")