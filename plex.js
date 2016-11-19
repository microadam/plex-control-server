const request = require('request')
const parseXml = require('xml2js').parseString
const qs = require('querystring')

class Plex {

  constructor(baseUrl, token) {
    this.baseUrl = baseUrl
    this.token = token
  }

  getServerInfo(cb) {
    this.makeRequest(this.baseUrl, null, (error, result) => {
      if (error) return cb(error)
      cb(null, result.MediaContainer.$)
    })
  }

  search(query, cb) {
    const url = this.baseUrl + '/search'
    this.makeRequest(url, { query }, (error, result) => {
      if (error) return cb(error)
      const results = []
      function getData(item) {
        item = item.$
        results.push({ id: item.ratingKey, key: item.key, title: item.title, type: item.type })
      }
      if (result.MediaContainer.Video) {
        result.MediaContainer.Video.forEach(getData)
      }
      if (result.MediaContainer.Directory) {
        result.MediaContainer.Directory.forEach(getData)
      }
      cb(null, results)
    })
  }

  getOnDeck(cb) {
    const url = this.baseUrl + '/library/onDeck'
    this.makeRequest(url, null, (error, result) => {
      if (error) return cb(error)
      const onDeckItems = []
      result.MediaContainer.Video.forEach((item) => {
        item = item.$
        const data = {
          type: item.type,
          title: item.title,
          key: item.key,
          id: item.ratingKey
        }
        if (data.type === 'episode') {
          data.showTitle = item.grandparentTitle
          data.seasonId = item.parentRatingKey
          data.showId = item.grandparentRatingKey
        }
        onDeckItems.push(data)
      })
      cb(null, onDeckItems)
    })
  }

  getClients(cb) {
    const url = this.baseUrl + '/clients'
    this.makeRequest(url, null, (error, result) => {
      if (error) return cb(error)
      const clients = []
      result.MediaContainer.Server.forEach((item) => {
        item = item.$
        clients.push({ name: item.name, address: item.address, port: item.port })
      })
      cb(null, clients)
    })
  }

  getIplayerChannels(cb) {
    const url = this.baseUrl + '/video/iplayer/live'
    this.makeRequest(url, { title: 'Live TV' }, (error, result) => {
      if (error) return cb(error)
      const channels = []
      result.MediaContainer.Video.forEach((item) => {
        item = item.$
        const parts = item.title.split(' - Live: ')
        channels.push({ name: parts[0], show: parts[1], key: item.key })
      })
      cb(null, channels)
    })
  }

  controlClient(client, action, cb) {
    const clientUrl = 'http://' + client.address + ':' + client.port
    const url = clientUrl + '/player/playback/' + action
    this.makeRequest(url, null, (error, result) => {
      if (error) return cb(error)
      if (result.Response.$.code !== '200') return cb(null, false)
      return cb(null, true)
    })
  }

  playMediaOnClient(client, mediaKey, machineId, cb) {
    const clientUrl = 'http://' + client.address + ':' + client.port
    const query = { key: mediaKey, machineIdentifier: machineId, containerKey: mediaKey, commandID: '1' }
    const url = clientUrl + '/player/playback/playMedia'

    this.makeRequest(url, query, (error, result) => {
      if (error) return cb(error)
      if (result.Response.$.code !== '200') return cb(null, false)
      return cb(null, true)
    })
  }

  makeRequest(url, qsData, cb) {
    if (qsData || this.token) {
      if (this.token) {
        qsData = qsData || {}
        qsData['X-Plex-Token'] = this.token
      }
      const query = qs.stringify(qsData)
      url = url + '?' + query
    }
    console.log(url)
    request(url, function (error, res, body) {
      if (error) return cb(error)
      parseXml(body, cb)
    })
  }

}

module.exports = Plex