var path = require('path');

module.exports = {

  port: process.env.PORT || 3000,

  path: path.resolve(__dirname + '/../raml'),

  sessionSecret: 'thisissecret',

  clientId: null,

  eadminBaseUrl: null

}
