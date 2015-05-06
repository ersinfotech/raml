var express = require('express');
var debug = require('debug')('raml-store');

var path = require('path');
var config = require('config');
var cors = require('cors');
var mkdirp = require('mkdirp');

mkdirp.sync(config.ramlPath);

// creates dist-override/editor.html
var fs = require('fs');
var editorFile = fs.readFileSync(path.join(__dirname, 'node_modules/api-designer/dist/index.html'), 'utf8');
var consoleFile = fs.readFileSync(path.join(__dirname, 'node_modules/api-console/dist/index.html'), 'utf8');

editorFile = editorFile.replace(/<\/body\>/g, '<script src="angular-persistence.js"></script></body>');
fs.writeFileSync(path.join(__dirname, 'dist-override/editor.html'), editorFile, 'utf8');

consoleFile = consoleFile.replace('<raml-initializer></raml-initializer>', '<raml-console src="/files/index.raml" disable-theme-switcher disable-raml-client-generator></raml-console>');
fs.writeFileSync(path.join(__dirname, 'dist-override/console.html'), consoleFile, 'utf8');

function serveEditor (req, res, next) {
  if (req.url === '/') {
    return res.redirect('/editor/index.html');
  };
  if (req.url === '/index.html') {
    return res.sendFile('/editor.html', { root: path.join(__dirname, 'dist-override') });
  }
  if (req.url === '/angular-persistence.js') {
    return res.sendFile('/angular-persistence.js', { root: path.join(__dirname, 'dist-override') });
  }
  var requestedFile = req.url.replace(/\?.*/, '');
  debug('requested:', requestedFile);
  res.sendFile(requestedFile, { root: path.join(__dirname, 'node_modules/api-designer/dist') }, function (err) {
    if (!!err && err.code === 'ENOENT') return res.sendStatus(404);
    if (!!err) return next(err);
  });
}

function serveConsole (req, res, next) {
  if (req.url === '/index.html' || req.url === '/') {
    return res.sendFile('/console.html', { root: path.join(__dirname, 'dist-override') });
  }
  var requestedFile = req.url.replace(/\?.*/, '');
  debug('requested:', requestedFile);
  res.sendFile(requestedFile, { root: path.join(__dirname, 'node_modules/api-console/dist') }, function (err) {
    if (!!err && err.code === 'ENOENT') return res.sendStatus(404);
    if (!!err) return next(err);
  });
}

var ramlServe;
module.exports = ramlServe = function (ramlPath) {
  var router = express.Router();
  var bodyParser = require('body-parser');

  var api = require('./api')(ramlPath);
  router.use(cors());
  router.use(bodyParser.json());
  router.get('/files', api.get);
  router.get('/files/*', api.get);
  router.post('/files/*', api.post);
  router.put('/files/*', api.put);
  router.delete('/files/*', api.delete);
  router.use('/editor', serveEditor);
  router.use('/', serveConsole);
  return router;
};

if (module.parent === null) {
  var app = express();
  app.use('/', ramlServe(config.ramlPath));

  var server = app.listen(config.port, function() {
    console.log('Express server listening on ' + server.address().address + ':' + server.address().port + '/');
  });
}
