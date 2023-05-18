import cowsay from 'cowsay'
import psp from 'prompt-sync-plus'
const prompt = psp()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import wrapText from 'wrap-text'
import { Configuration, OpenAIApi } from 'openai' 

import { exec } from 'child_process'

import { color, log, white, green } from 'console-log-colors'

import say from 'say'

import * as dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'

const applescriptCmd = `osascript -e 'delay 0.1' -e 'tell application "System Events" to key down control' -e 'delay 0.2' -e 'tell application "System Events" to key up control' -e 'delay 0.2' -e 'tell application "System Events" to key down control' -e 'delay 0.2' -e 'tell application "System Events" to key up control'`

//const applescriptCmd = `osascript -e 'delay 0.1' -e 'tell application "System Events" to key down control' -e 'delay 0.2' -e 'tell application "System Events" to key up control' -e 'delay 0.2' -e 'tell application "System Events" to key down control' -e 'delay 0.2' -e 'tell application "System Events" to key up control'`

const openai_configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
const openai = new OpenAIApi(openai_configuration)

let messages = []

const getMostRecentConversation = (persona) => {

    try {

        const directoryPath = path.join(__dirname, `personas/${persona}/conversations/`)
        let mostRecentFile = null
        let mostRecentTimestamp = 0

        const files = fs.readdirSync(directoryPath)

        for (const file of files) {

            if (file.endsWith('.json')) {

                const timestamp = parseInt(file.slice(8, -5))

                if (!isNaN(timestamp)) {

                    const filePath = path.join(directoryPath, file)

                    if (timestamp > mostRecentTimestamp) {
                        mostRecentFile = filePath
                        mostRecentTimestamp = timestamp
                    }
                }
            }
        }

        const content = fs.readFileSync(mostRecentFile, 'utf-8')
        return JSON.parse(content)

    } catch (error) {
        consoleStream(error)
        return []
    }

}

const pushMessage = (role, content, memory) => {
    if (role === 'system' && messages.length > 0) {
        messages[0].role = role
        messages[0].content = content
    } else {
        if (messages.length >= memory) messages.splice(1, 1)
        messages.push({ role: role, content: content })
    }
}

const getInstructPromptFromMessages = () => {

    let prompt = ''

    messages.forEach(elem => {
        if (elem.role == 'system') {
            prompt = elem.content + "\n\n"
        } else {
            prompt = prompt + `${elem.role}: ${elem.content}\n`
        }
    })

    prompt = prompt + 'assistant: '

    return prompt

}

const getAnswerFromInstructGPT = async (model_version, max_tokens) => {

    const prompt = getInstructPromptFromMessages()

    try {

        const response = await openai.createCompletion({
            model: model_version,
            prompt: prompt,
            max_tokens: max_tokens,
            stop: ['user:', 'assistant:'],
        })

        return response.data.choices[0].text

    } catch (error) {
        consoleStream(error)
        return 'Oups...'
    }

}

const getAnswerFromChatGPT = async (model_version, max_tokens) => {

    try {

        const response = await openai.createChatCompletion({
            model: model_version,
            max_tokens: max_tokens,
            messages: messages
        })

        return response.data.choices[0].message.content

    } catch (error) {
        consoleStream(error)
        return 'Oups...'
    }

}

async function* streamChatCompletion(model_version, max_tokens) {

    const response = await openai.createChatCompletion(
        {
            model: model_version,
            max_tokens: max_tokens,
            messages,
            stream: true,
        },
        {
            responseType: 'stream',
        },
    )

    for await (const chunk of response.data) {
        const lines = chunk
            .toString('utf8')
            .split('\n')
            .filter((line) => line.trim().startsWith('data: '))

        for (const line of lines) {
            const message = line.replace(/^data: /, '')
            if (message === '[DONE]') return
            const json = JSON.parse(message)
            const token = json.choices[0].delta.content
            if (token) yield token
        }
    }

}

const printThink = async (text, UI, selectedEyes, selectedTongue) => {

    console.clear()

    if (UI === 'cowsay') {

        text = wrapText(text, 50)

        let options

        if (selectedEyes == undefined && selectedTongue == undefined) {

            const properties = ['b', 'd', 'g', 'p', 's', 't', 'w', 'y']
            const selectedProperty = properties[Math.floor(Math.random() * properties.length)]
        
            options = { text: text }
            properties.forEach(property => options[property] = (property === selectedProperty))
        
        } else {
            options = { text: text, e: selectedEyes, T: selectedTongue }
        }

        console.log(cowsay.think(options) + '\n\n')

    }

    if (UI === 'console') {
        console.log(white(text + '\n\n'))
    }

    if (UI === 'alexa') {
        await axios.get(`${process.env.ALEXA_URI}/blink`)
    }

}

const printSay = async (text, UI, selectedEyes, selectedTongue) => {

    console.clear()

    if (UI === 'cowsay') {

        text = wrapText(text, 50)

        if (selectedEyes == undefined) {
            const eyes = ['OO', 'OO', 'OO', '--', 'OO', 'OO', 'OO', 'Oo', 'OO', 'OO', '--', 'OO', 'OO', 'OO', 'Oo']
            selectedEyes = eyes[Math.floor(Math.random() * eyes.length)]
        }
    
        if (selectedTongue == undefined) {
            const tongues = ['', '', '', '', '', '', 'U ', '', ' U', '', '', '', '', '', '', '', '', '', '']
            selectedTongue = tongues[Math.floor(Math.random() * tongues.length)]
        }
    
        console.log(cowsay.say({ text: text, e: selectedEyes, T: selectedTongue }) + '\n\n')

    }

    if (UI === 'console') {
        console.log(green(text + '\n\n'))
    }

    if (UI === 'alexa') {
        await axios.get(`${process.env.ALEXA_URI}/hometts/${text}`)
    }

}

const consoleStream = (text) => {
    fs.writeFileSync('console.txt', text)
}

const parseAndEvalJS = (markdown) => {

    const codeBlockRegExp = /```js\n(?<code>[\s\S]+?)\n```(?<result>[\s\S]*?)(?=```|$)/g

    const newOutput = markdown.replace(codeBlockRegExp, (match, code, result) => {
        const output = eval(code)
        return result ? `${output}\n${result}` : output
    })

    return newOutput

}

;(async () => {

    const persona = process.env.PERSONA

    const filePathMD = path.join(__dirname, `personas/${persona}`, `${persona}.md`)
    let personaContent = fs.readFileSync(filePathMD, 'utf-8')
    personaContent = parseAndEvalJS(personaContent)

    consoleStream(personaContent)

    const filePathJSON = path.join(__dirname, `personas/${persona}`, `${persona}.json`)
    let personaJSON = JSON.parse(fs.readFileSync(filePathJSON, 'utf-8'))

    pushMessage('system', personaContent, personaJSON.memory)

    if (!fs.existsSync(`personas/${persona}/conversations`)) fs.mkdirSync(`personas/${persona}/conversations`) 

    if (personaJSON.load_conversation) {
        const mostRecentConversation = getMostRecentConversation(persona)
        if (mostRecentConversation.length > 0) mostRecentConversation.forEach(elem => (messages.push(elem)))
    }

    let firstLoop = true
    let userinput = ''

    consoleStream('')

    while (!personaJSON.answer_end.includes(userinput.toLowerCase())) {

        if (firstLoop) {
            const input_start_length = personaJSON.input_start.length
            if (input_start_length === 0) {
                if (personaJSON.ui === 'cowsay') printThink('zZz', personaJSON.ui, '--', '')
            } else {
                userinput = personaJSON.input_start[Math.floor(Math.random() * input_start_length)]
            }
        } else {
            userinput = prompt(`Message ("${persona}"): `)
            if (userinput === '') {
                if (personaJSON.ui === 'cowsay') printSay('???', personaJSON.ui, 'Oo')
                continue
            }
        }
        
        firstLoop = false

        if (userinput === '') continue

        if (userinput === '/zzz') {
            if (personaJSON.ui === 'cowsay') printThink('zZz', personaJSON.ui, '--', '')
            continue
        }

        pushMessage('user', userinput, personaJSON.memory)
    
        await printThink('...', personaJSON.ui)
        
        const timestamp1 = Date.now()

        let output = ''
        if (personaJSON.model_version.startsWith('gpt-')) {
            if (personaJSON.stream) {
                for await (const token of streamChatCompletion(personaJSON.model_version, personaJSON.max_tokens)) {
                    output += token
                    printSay(output, personaJSON.ui)
                }
            } else {
                output = await getAnswerFromChatGPT(personaJSON.model_version, personaJSON.max_tokens)
            }
        } else if (personaJSON.model_version.startsWith('text-davinci-')) {
            output = await getAnswerFromInstructGPT(personaJSON.model_version, personaJSON.max_tokens)
        } else {
            output = 'Oups...'
        }

        pushMessage('assistant', output, personaJSON.memory)

        const timestamp2 = Date.now()
        const timeDiff = (timestamp2 - timestamp1) / 1000

        await printSay(output + ((personaJSON.show_timediff == true) ? ' ' + timeDiff : ''), personaJSON.ui, 'OO')
        consoleStream(output)

        if (personaJSON.tts) {
            //exec(`say "${output}"`)
            say.speak(output, 'Amélie', 1, (err) => {
                if (personaJSON.stt && !personaJSON.answer_end.includes(userinput.toLowerCase())) exec(applescriptCmd)
            })
        } else {
            if (personaJSON.stt && !personaJSON.answer_end.includes(userinput.toLowerCase())) exec(applescriptCmd)
        }

        personaJSON = JSON.parse(fs.readFileSync(filePathJSON, 'utf-8')) // live reloading
        personaContent = parseAndEvalJS(personaContent) // live reloading
        pushMessage('system', personaContent, personaJSON.memory) // live reloading
        
    }

    if (personaJSON.save_conversation) {
        const timestamp = Date.now()
        const filePathConvJSON = path.join(__dirname, `personas/${persona}/conversations/`, `${timestamp}.json`)
        messages.shift()
        fs.writeFileSync(filePathConvJSON, JSON.stringify(messages, null, 2))
    }

})()