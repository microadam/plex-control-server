const EventEmitter = require('events').EventEmitter
const express = require('express')
const expressRequestSign = require('express-request-sign')
const bodyParser = require('body-parser')
const Controller = require('./controller')

class Server extends EventEmitter {

  constructor(options) {
    super()

    this.app = express()
    this.app.use(bodyParser.json())
    this.app.use(expressRequestSign({ key: options.apiKey, maxDifference: 60000 }))

    this.controller = new Controller(options.plexUrl)

    this.setupRoutes()
  }

  setupRoutes() {
    const routes =
      [ { action: 'pause' }
      , { action: 'play', path: 'resume' }
      , { action: 'stop' }
      ]

    routes.forEach((route) => {
      const path = route.path ? route.path : route.action
      this.app.get('/' + path, (req, res) => {
        const client = this.clientOrError(req.query.client, res)
        if (!client) return
        this.controller.controlClient(route.action, client, (error, success) => {
          if (error) return res.status(500).json({ success: false, error: error.message })
          if (!success) return  res.status(500).json({ success: false })
          console.log(route.action + ' called')
          res.json({ success: true })
        })
      })
    })

    this.app.get('/ondeck', (req, res) => {
      this.controller.getOnDeck((error, onDeckItems) => {
        if (error) return res.status(500).json({ success: false, error: error.message })
        res.json({ success: true, onDeckItems })
      })
    })

    this.app.get('/channels', (req, res) => {
      this.controller.getWhatsLiveOnIplayer((error, channels) => {
        if (error) return res.status(500).json({ success: false, error: error.message })
        res.json({ success: true, channels })
      })
    })

    this.app.post('/play', (req, res) => {
      const type = req.body.type
      const name = req.body.name
      if (!type) return res.status(400).json({ success: false, error: 'Must specify a type' })
      if (!name) return res.status(400).json({ success: false, error: 'Must specify a name' })

      const client = this.clientOrError(req.body.client, res)
      if (!client) return

      const fnMapping = { 'movie': 'playMovie', 'continue': 'continueMedia', 'iPlayer': 'playOnIplayer' }
      const fnName = fnMapping[type]
      if (!fnName) {
        return res.status(400).json({ success: false, error: 'Invalid type specified' })
      }

      this.controller[fnName](name, client, (error, result) => {
        if (error) return res.status(500).json({ success: false, error: error.message })
        if (!result) return res.status(400).json({ success: false, error: 'Not Found', name: name })
        res.json({ success: true, result })
      })
    })
  }

  listen(port, cb) {
    this.app.listen(port, cb)
  }

  clientOrError(clientName, res) {
    if (clientName) clientName = clientName.toLowerCase()
    if (!clientName) clientName = this.controller.defaultClientName
    const client = this.controller.clients[clientName]
    if (!client) {
      res.status(400).json({ success: false, error: 'Client not found', client: clientName })
      return
    }
    return client
  }

}

module.exports = Server