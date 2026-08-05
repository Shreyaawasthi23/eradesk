// One-time script to obtain a Gmail API refresh token for the support mailbox.
//
// Usage:
//   node scripts/gmail-auth.mjs
//
// Requires GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.local.
// Opens a local server on http://localhost:53682 to receive the OAuth redirect.

import { createServer } from 'http'
import { google } from 'googleapis'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '..', '.env.local') })

const REDIRECT_PORT = 53682
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`

const clientId = process.env.GMAIL_CLIENT_ID
const clientSecret = process.env.GMAIL_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error('Missing GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET in .env.local')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
]

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
})

console.log('\nOpen this URL in your browser and sign in as yshreyaawasthi23@gmail.com:\n')
console.log(authUrl)
console.log('\nWaiting for authorization...\n')

const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404)
    res.end()
    return
  }

  const url = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get('code')

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('No authorization code received.')
    return
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Authorization complete — you can close this tab and return to the terminal.')

    console.log('Success! Add this to your .env.local:\n')
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('')

    if (!tokens.refresh_token) {
      console.log(
        'WARNING: no refresh_token returned. This usually means the app already had a prior ' +
          'grant for this account. Revoke access at https://myaccount.google.com/permissions ' +
          '(find the app and remove it), then re-run this script.',
      )
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Failed to exchange authorization code. Check the terminal for details.')
    console.error('Token exchange failed:', error.message)
  } finally {
    server.close()
  }
})

server.listen(REDIRECT_PORT)
