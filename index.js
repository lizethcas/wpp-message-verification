const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const express = require('express')
const qrcode = require('qrcode')
const { Boom } = require('@hapi/boom')
const { fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')


const app = express()
app.use(express.json())

let sock = null
let isReady = false
let currentQR = null

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

async function connectWhatsApp() {
    const { version } = await fetchLatestBaileysVersion()

    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Chrome', 'Desktop', '120.0.0'],
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            currentQR = await qrcode.toDataURL(qr)
            console.log('📱 QR generado — ve a /qr para escanearlo')
        }

        if (connection === 'close') {
            isReady = false
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true

            console.log('Conexión cerrada, reconectando:', shouldReconnect)
            if (shouldReconnect) {
                setTimeout(connectWhatsApp, 3000)
            }
        }

        if (connection === 'open') {
            isReady = true
            currentQR = null
            console.log('✅ WhatsApp conectado')
        }
    })
}

connectWhatsApp()

// ── Endpoints ────────────────────────────────────────────

app.get('/', (req, res) => {
    res.json({ status: 'ok', whatsapp: isReady ? 'connected' : 'disconnected' })
})

// Ver QR en el navegador
app.get('/qr', (req, res) => {
    if (isReady) return res.send('<h2>✅ WhatsApp ya está conectado</h2>')
    if (!currentQR) return res.send('<h2>⏳ Generando QR, recarga en unos segundos...</h2>')
    res.send(`
    <html>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fdf8f0;font-family:sans-serif">
        <h2 style="color:#a07840">Escanea este QR con WhatsApp</h2>
        <img src="${currentQR}" style="width:300px;height:300px" />
        <p style="color:#999;margin-top:16px">Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
        <script>setTimeout(() => location.reload(), 30000)</script>
      </body>
    </html>
  `)
})

// Enviar código OTP
app.post('/send-code', async (req, res) => {
    const apiKey = req.headers['x-api-key']
    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'No autorizado' })
    }

    const { phone, code, name } = req.body
    if (!phone || !code || !name) {
        return res.status(400).json({ error: 'phone, code y name son requeridos' })
    }

    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp no está conectado' })
    }

    try {
        const phoneFormatted = `${phone.replace(/\D/g, '')}@s.whatsapp.net`
        const saludo = getSaludo(name)
        const mensaje = `${saludo}\n\nTu código para acceder a *Don & Liz Social* es:\n\n*${code}*\n\n_Válido por 10 minutos. No lo compartas con nadie_ 🌿`

        // Simular escritura humana
        await sock.sendPresenceUpdate('composing', phoneFormatted)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
        await sock.sendMessage(phoneFormatted, { text: mensaje })

        console.log(`✅ Código enviado a ${name} (${phone})`)
        res.json({ success: true })
    } catch (error) {
        console.error('Error enviando mensaje:', error)
        res.status(500).json({ error: 'Error enviando mensaje' })
    }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})