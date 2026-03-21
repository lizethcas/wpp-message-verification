const { Client, LocalAuth } = require('whatsapp-web.js')
const express = require('express')
const qrcode = require('qrcode-terminal')

const app = express()
app.use(express.json())

// ── Cliente WhatsApp ─────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
  }
})

let isReady = false

client.on('qr', (qr) => {
  console.log('📱 Escanea este QR con tu WhatsApp:')
  qrcode.generate(qr, { small: true })
})

client.on('ready', () => {
  isReady = true
  console.log('✅ WhatsApp conectado y listo')
})

client.on('disconnected', (reason) => {
  isReady = false
  console.log('❌ WhatsApp desconectado:', reason)
})

client.initialize()

// ── Mensajes personalizados ──────────────────────────────
const saludos = [
  (name) => `¡Hola ${name}! 💛 Qué emoción tenerte en nuestra boda.`,
  (name) => `${name}, ¡ya casi es el gran día! 🌿 Nos alegra tanto que estés.`,
  (name) => `¡Hola ${name}! 🌸 Estamos felices de compartir este momento contigo.`,
  (name) => `${name}, ¡gracias por ser parte de nuestra historia! 💍`,
]

const getSaludo = (name) => {
  const idx = Math.floor(Math.random() * saludos.length)
  return saludos[idx](name)
}

// ── Endpoints ────────────────────────────────────────────

// Health check para cronjob.org
app.get('/', (req, res) => {
  res.json({ status: 'ok', whatsapp: isReady ? 'connected' : 'disconnected' })
})

// Enviar código OTP
app.post('/send-code', async (req, res) => {
  const { phone, code, name } = req.body

  if (!phone || !code || !name) {
    return res.status(400).json({ error: 'phone, code y name son requeridos' })
  }

  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp no está conectado' })
  }

  // Validar API key
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const phoneFormatted = `${phone.replace(/\D/g, '')}@c.us`

    // Simular comportamiento humano
    const saludo = getSaludo(name)
    const mensaje = `${saludo}\n\nTu código para acceder a *Don & Liz Social* es:\n\n*${code}*\n\n_Válido por 10 minutos. No lo compartas con nadie_ 🌿`

    // Marcar como escribiendo
    const chat = await client.getChatById(phoneFormatted)
    await chat.sendStateTyping()

    // Esperar 2-3 segundos simulando escritura
    const delay = 2000 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))

    // Enviar mensaje
    await client.sendMessage(phoneFormatted, mensaje)

    console.log(`✅ Código enviado a ${name} (${phone})`)
    res.json({ success: true })

  } catch (error) {
    console.error('Error enviando mensaje:', error)
    res.status(500).json({ error: 'Error enviando mensaje' })
  }
})

// ── Servidor ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})