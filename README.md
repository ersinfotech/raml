# raml

fork of [mrgamer/express-raml-store](https://github.com/mrgamer/express-raml-store).

Is a raml system combined raml-console and raml-designer togehter.

It can use as a npm module that work as a express router.

It also can work as standalone.

It has a login function for ers internal use.

## Usage

npm module

```js
var raml = require('raml');
var app = express();
app.use('/raml', raml({
  path: __dirname + '/raml'
}));
```

standalone

```shell
$ cp config/default.js config/development.js
$ vi config/development.js
$ npm start
```

## License

MIT
