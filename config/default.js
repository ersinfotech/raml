var path = require('path');

module.exports = {

  port: process.env.PORT || 3000,

  ramlPath: path.resolve(__dirname + '/../docs'),

  session: {
    secret: 'thisissecret'
  },

  eadmin: {
    baseUrl: 'http://eadmin-api.ers.local',
    clientId: 1
  }
}

