const options = {
  plexUrl: process.env.PLEX_URL,
  apiKey: process.env.API_KEY
}
const Server = require('./server')
const server = new Server(options)
server.listen(3000, (error) => {
  if (error) throw error
  console.log('Listening on port 3000')
})