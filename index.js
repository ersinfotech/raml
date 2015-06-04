var fs = require('fs');
var path = require('path');

var fse = require('fs-extra');
var express = require('express');
var debug = require('debug')('raml-store');
var cors = require('cors');
var mkdirp = require('mkdirp');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var request = require('superagent');

// prepare file
var editorFile = fs.readFileSync(path.join(__dirname, 'node_modules/api-designer/dist/index.html'), 'utf8');
editorFile = editorFile.replace(/<\/body\>/g, '<script src="angular-persistence.js"></script></body>');
fs.writeFileSync(path.join(__dirname, 'dist-override/editor.html'), editorFile, 'utf8');

var consoleFile = fs.readFileSync(path.join(__dirname, 'node_modules/api-console/dist/index.html'), 'utf8');
consoleFile = consoleFile.replace('<raml-initializer></raml-initializer>', '<raml-console src="files/index.raml" disable-theme-switcher disable-raml-client-generator></raml-console>');
fs.writeFileSync(path.join(__dirname, 'dist-override/console.html'), consoleFile, 'utf8');

function serveEditor (req, res, next) {
  if (req.url === '/') {
    if (!req.originalUrl.match(/\/$/)) {
      return res.redirect(req.originalUrl + '/');
    };
    return res.sendFile('/editor.html', { root: path.join(__dirname, 'dist-override') });
  }
  if (req.url === '/angular-persistence.js') {
    return res.sendFile('/angular-persistence.js', { root: path.join(__dirname, 'dist-override') });
  }
  var requestedFile = req.url.replace(/\?.*/, '');
  debug('requested:', requestedFile);
  res.sendFile(requestedFile, { root: path.join(__dirname, 'node_modules/api-designer/dist') });
}

function serveConsole (req, res, next) {
  if (req.url === '/') {
    if (!req.originalUrl.match(/\/$/)) {
      return res.redirect(req.originalUrl + '/');
    };
    return res.sendFile('/console.html', { root: path.join(__dirname, 'dist-override') });
  }
  var requestedFile = req.url.replace(/\?.*/, '');
  debug('requested:', requestedFile);
  res.sendFile(requestedFile, { root: path.join(__dirname, 'node_modules/api-console/dist') });
}

var ramlServe;
module.exports = ramlServe = function (options) {
  options = options || {};

  var ramlPath = options.path;
  var baseUrl = options.baseUrl;
  var clientId = options.clientId;
  var eadminBaseUrl = options.eadminBaseUrl;
  var sessionSecret = options.sessionSecret || 'secret';

  if (!ramlPath) {
    throw new Error('path required in raml settings');
  };

  mkdirp.sync(ramlPath + '/_config');

  if (!fs.existsSync(ramlPath + '/index.raml')) {
    if (clientId) {
      fse.copySync(__dirname + '/templates/oauth2.raml', ramlPath + '/index.raml');
    } else {
      fse.copySync(__dirname + '/templates/index.raml', ramlPath + '/index.raml');
    }
  }
  if (baseUrl) {
    fs.writeFileSync(ramlPath + '/_config/base_url', baseUrl);
  };
  if (clientId) {
    fs.writeFileSync(ramlPath + '/_config/client_id', clientId);
  };
  if (eadminBaseUrl) {
    fs.writeFileSync(ramlPath + '/_config/authorization_url', eadminBaseUrl + '/oauth/authorize');
    fs.writeFileSync(ramlPath + '/_config/access_token_url', eadminBaseUrl + '/oauth/access_token');
  };

  var router = express.Router();
  var bodyParser = require('body-parser');

  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({extended: false}));
  router.use(cookieParser());
  router.use(cookieSession({secret: sessionSecret}));

  // Auth
  if (clientId) {
    router.get('/login', function (req, res) {
      res.sendFile(__dirname + '/templates/login.html');
    });
    router.post('/login', function (req, res) {
      request.post(eadminBaseUrl + '/oauth/signin')
      .send({
        client_id: clientId,
        email: req.body.email,
        password: req.body.password
      })
      .end(function (err, response) {
        if (err) {
          return res.send(err.response.body);
        };
        req.session.accessToken = response.body.access_token;
        res.redirect(req.baseUrl || '/');
      });
    });
    router.get('/logout', function (req, res) {
      delete req.session.accessToken;
      res.redirect(req.baseUrl + '/login');
    });
    router.use(function (req, res, next) {
      if (req.session.accessToken) {
        next();
      } else {
        res.redirect(req.baseUrl + '/login');
      }
    });
  };

  var api = require('./api')(ramlPath);
  router.get('/files', api.get);
  router.get('/files/*', api.get);
  router.post('/files/*', api.post);
  router.put('/files/*', api.put);
  router.delete('/files/*', api.delete);
  router.use('/editor', serveEditor);
  router.use(serveConsole);
  return router;
};

if (module.parent === null) {
  var config = require('config');
  var app = express();
  app.use('/', ramlServe(config));

  var server = app.listen(config.port, function() {
    console.log('Express server listening on ' + server.address().address + ':' + server.address().port + '/');
  });
}
