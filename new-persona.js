const prompt = require('prompt-sync')()
const fs = require('fs')
const path = require('path')

const param = {
    "save_conversation": true,
    "load_conversation": false,
    "engine": "CHATGPT",
    "show_timediff": false,
    "stream": true,
    "tts": false,
    "memory": 20,
    "input_start": "Bonjour",
    "answer_end": "bye"
}

const persona = prompt("Nom à donner à ce nouveau persona : ")
const content = prompt("Merci de renseigner la description persona ici : ")

const filePath = path.join(__dirname, `personas/${persona}`, `${persona}.txt`)
const jsonPath = path.join(__dirname, `personas/${persona}`, `${persona}.json`)
fs.mkdirSync(`personas/${persona}`)
fs.writeFileSync(filePath, content)
fs.writeFileSync(jsonPath, JSON.stringify(param, null, 2))
fs.mkdirSync(`personas/${persona}/conversations`)

console.log("C'est fait")