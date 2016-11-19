const numberToWords = require('number-to-words')
const Plex = require('./plex')

class Controller {

  constructor(plexUrl) {
    this.plex = new Plex(plexUrl)
    this.defaultClientName = 'cinema'

    this.clients = null
    this.serverInfo = null

    this.plex.getServerInfo((error, info) => {
      if (error) throw error
      this.serverInfo = info
    })

    setInterval(this.updateClients.bind(this), 3600000)
    this.updateClients()
  }

  getOnDeck(cb) {
    this.plex.getOnDeck((error, onDeckItems) => {
      if (error) return cb(error)
      const items = []
      onDeckItems.forEach((i) => {
        items.push(this.formatTitle(i))
      })
      cb(null, items)
    })
  }

  getWhatsLiveOnIplayer(cb) {
    this.plex.getIplayerChannels((error, channels) => {
      if (error) return cb(error)
      const items = []
      channels.forEach((c) => {
        items.push(c.name + ' - ' + c.show)
      })
      cb(null, items)
    })
  }

  updateClients() {
    this.plex.getClients((error, clientData) => {
      if (error) return console.log(error)
      const clients = {}
      clientData.forEach((c) => {
        clients[c.name.toLowerCase()] = c
      })
      this.clients = clients
    })
  }

  controlClient(action, client, cb) {
    if (!action || !client) return cb() // HANDLE BETTER
    this.plex.controlClient(client, action, cb)
  }

  playOnIplayer(channelName, client, cb) {
    const channelNameParts = channelName.split(' ')
    let lastPart = channelNameParts[channelNameParts.length - 1]
    if (!isNaN(Number(lastPart))) {
      channelName = channelName.replace(lastPart, '')
      lastPart = numberToWords.toWords(lastPart)
      channelName = channelName + lastPart
    }
    this.plex.getIplayerChannels((error, channels) => {
      if (error) return cb(error)
      let foundChannel = null
      const regEx = new RegExp('.*' + channelName + '.*', 'i')
      channels.forEach((c) => {
        if (regEx.test(c.name)) {
          foundChannel = c
        }
      })
      if (!foundChannel) return cb() // HANDLE BETTER
      // cb(null, { title: foundChannel.name + ' - ' + foundChannel.show, client: client.name })
      this.plex.playMediaOnClient(client, foundChannel.key, this.serverInfo.machineIdentifier, (error, result) => {
        if (error) return cb(error)
        if (!result) return cb() // HANDLE BETTER
        cb(null, { title: foundChannel.name + ' - ' + foundChannel.show, client: client.name })
      })
    })
  }

  playMovie(movieName, client, cb) {
    if (!movieName || !client) return cb() // HANDLE BETTER
    this.plex.search(movieName, (error, searchResults) => {
      if (error) return cb(error)
      searchResults = searchResults.filter((r) => {
        return r.type === 'movie'
      })
      if (!searchResults.length) return cb() // HANDLE BETTER
      const bestMatch = searchResults[0]
      if (!bestMatch) return cb() // HANDLE BETTER
      // cb(null, { title: this.formatTitle(bestMatch), client: client.name })
      this.plex.playMediaOnClient(client, bestMatch.key, this.serverInfo.machineIdentifier, (error, result) => {
        if (error) return cb(error)
        if (!result) return cb() // HANDLE BETTER
        cb(null, { title: this.formatTitle(bestMatch), client: client.name })
      })
    })
  }

  continueMedia(name, client, cb) {
    if (!name || !client) return cb() // HANDLE BETTER
    this.plex.search(name, (error, searchResults) => {
      if (error) return cb(error)
      searchResults = searchResults.filter((r) => {
        return r.type !== 'episode'
      })
      if (!searchResults.length) return cb() // HANDLE BETTER
      const bestMatch = searchResults[0]
      let matchProperty = 'id'
      if (bestMatch.type === 'show') {
        matchProperty = 'showId'
      }
      this.plex.getOnDeck((error, onDeckItems) => {
        if (error) return cb(error)
        if (!onDeckItems.length) return cb() // HANDLE BETTER
        let foundMedia = null
        onDeckItems.forEach((item) => {
          if (item[matchProperty] === bestMatch.id) {
            foundMedia = item
          }
        })
        if (!foundMedia) return cb() // HANDLE BETTER
        // cb(null, { title: this.formatTitle(foundMedia), client: client.name })
        this.plex.playMediaOnClient(client, foundMedia.key, this.serverInfo.machineIdentifier, (error, result) => {
          if (error) return cb(error)
          if (!result) return cb() // HANDLE BETTER
          cb(null, { title: this.formatTitle(foundMedia), client: client.name })
        })
      })
    })
  }

  formatTitle(i) {
    let title = ''
    if (i.type === 'movie') {
      title = i.title
    } else if (i.type === 'episode') {
      title = i.showTitle + ' - ' + i.title
    }
    return title
  }

}

module.exports = Controller