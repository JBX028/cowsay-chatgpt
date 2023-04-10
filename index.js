const cowsay = require('cowsay')
const prompt = require('prompt-sync')()
const fs = require('fs')
const path = require('path')
const wrapText = require('wrap-text')
const { Configuration, OpenAIApi } = require('openai')

const util = require('util');
const exec = util.promisify(require('child_process').exec);

require('dotenv').config()

const openai_configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
openai = new OpenAIApi(openai_configuration)

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
    if (messages.length >= memory) messages.splice(1, 1)
    messages.push({ role: role, content: content })
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

const printcowthink = (text) => {

    console.clear()

    text = wrapText(text, 50)

    const properties = ['b', 'd', 'g', 'p', 's', 't', 'w', 'y']
    const selectedProperty = properties[Math.floor(Math.random() * properties.length)]

    const options = { text: text }
    properties.forEach(property => options[property] = (property === selectedProperty))

    console.log(cowsay.think(options) + '\n\n')

}

const printcowsay = (text, selectedEyes, selectedTongue) => {

    console.clear()

    text = wrapText(text, 50)

    if (selectedEyes == undefined) {
        const eyes = ['OO', 'OO', 'OO', '--', 'OO', 'OO', 'OO', 'Oo', 'OO', 'OO', '--', 'OO', 'OO', 'OO', 'OO']
        selectedEyes = eyes[Math.floor(Math.random() * eyes.length)]
    }

    if (selectedTongue == undefined) {
        const tongues = ['', '', '', '', '', '', 'U ', '', ' U', '', '', '', '', '', '', '', '', '', '']
        selectedTongue = tongues[Math.floor(Math.random() * tongues.length)]
    }

    console.log(cowsay.say({ text: text, e: selectedEyes, T: selectedTongue }) + '\n\n')

}

const consoleStream = (text) => {
    fs.writeFileSync('console.txt', text)
}

(async () => {

    const persona = process.env.PERSONA

    const filePathTXT = path.join(__dirname, `personas/${persona}`, `${persona}.txt`)
    const personaContent = fs.readFileSync(filePathTXT, 'utf-8')

    const filePathJSON = path.join(__dirname, `personas/${persona}`, `${persona}.json`)
    const personaJSON = JSON.parse(fs.readFileSync(filePathJSON, 'utf-8'))

    pushMessage('system', personaContent, personaJSON.memory)

    if (!fs.existsSync(`personas/${persona}/conversations`)) fs.mkdirSync(`personas/${persona}/conversations`) 

    if (personaJSON.load_conversation) {
        const mostRecentConversation = getMostRecentConversation(persona)
        if (mostRecentConversation.length > 0) mostRecentConversation.forEach(elem => (messages.push(elem)))
    }

    let firstLoop = true
    let userinput

    consoleStream('')

    while (userinput != personaJSON.answer_end) {

        if (firstLoop) {
            userinput = personaJSON.input_start
            firstLoop = false
        } else {
            userinput = prompt(`Message (persona ==> "${persona})": `)
        }

        //consoleStream(userinput)
        if (userinput == '') continue

        pushMessage('user', userinput, personaJSON.memory)
    
        printcowthink('...')
        
        let timestamp1 = Date.now()

        let output = ''
        if (personaJSON.model_type == 'CHATGPT') {
            if (personaJSON.stream) {
                for await (const token of streamChatCompletion(personaJSON.model_version, personaJSON.max_tokens)) {
                    output += token
                    printcowsay(output)
                }
            } else {
                output = await getAnswerFromChatGPT(personaJSON.model_version, personaJSON.max_tokens)
            }
        } else if (personaJSON.model_type == 'INSTRUCTGPT') {
            output = await getAnswerFromInstructGPT(personaJSON.model_version, personaJSON.max_tokens)
        } else {
            output = 'Erreur'
        }

        pushMessage('assistant', output, personaJSON.memory)

        let timestamp2 = Date.now()
        let timeDiff = (timestamp2 - timestamp1) / 1000

        printcowsay(output + ((personaJSON.show_timediff == true) ? ' ' + timeDiff : ''), 'OO')
        consoleStream(output)

    }

    if (personaJSON.save_conversation) {
        const timestamp = Date.now()
        const filePathJSON = path.join(__dirname, `personas/${persona}/conversations/`, `${timestamp}.json`)
        messages.shift()
        fs.writeFileSync(filePathJSON, JSON.stringify(messages, null, 2))
    }

})()