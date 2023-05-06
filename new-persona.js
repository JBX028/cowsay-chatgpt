import psp from 'prompt-sync-plus'
const prompt = psp()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import { color, log, green } from 'console-log-colors'

const param = {
    "save_conversation": true,
    "load_conversation": false,
    "model_version": "gpt-3.5-turbo",
    "max_token": 250,
    "show_timediff": false,
    "stream": true,
    "tts": false,
    "stt": false,
    "ui": "cowsay",
    "memory": 20,
    "input_start": ["Bonjour", "Hello"],
    "answer_end": ["au revoir", "merci au revoir", "bye"]
}

const persona = prompt("Give a name to this new persona : ")
const content = prompt("Give a description (initial prompt) : ")

const filePath = path.join(__dirname, `personas/${persona}`, `${persona}.md`)
const jsonPath = path.join(__dirname, `personas/${persona}`, `${persona}.json`)

fs.mkdirSync(`personas/${persona}`)
fs.writeFileSync(filePath, content)
fs.writeFileSync(jsonPath, JSON.stringify(param, null, 2))
fs.mkdirSync(`personas/${persona}/conversations`)

console.log(green('Done!'))