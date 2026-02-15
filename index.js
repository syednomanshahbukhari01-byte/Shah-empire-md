import makeWASocket, {
  useMultiFileAuthState,
  makeInMemoryStore
} from "@whiskeysockets/baileys"
import chalk from "chalk"
import loadCommands from "./lib/loader.js"

const store = makeInMemoryStore({})

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const sock = makeWASocket({ auth: state, printQRInTerminal: false })

  store.bind(sock.ev)
  sock.ev.on("creds.update", saveCreds)

  if (!state.creds.registered) {
    const code = await sock.requestPairingCode("923XXXXXXXXX")
    console.log(chalk.green("PAIR CODE:"), code)
  }

  const commands = await loadCommands()

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      ""

    if (!text.startsWith(".")) return

    const cmdName = text.slice(1).split(" ")[0].toLowerCase()
    const cmd = commands.get(cmdName)
    if (cmd) cmd.execute(sock, m)
  })
}

start()