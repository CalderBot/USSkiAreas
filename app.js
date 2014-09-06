// Locals
var indexController = require('./controllers/index.js');
// Modules
var express = require('express');
var bodyParser = require('body-parser');

// Express setup:
var app = express();
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({extended: false}));

// This takes up to a minute to load the page.  When it does load, it is just a page filled with the list of ski areas.  See README.md
app.get('/', indexController.loadSkiAreas );



var server = app.listen(4068, function() {
	console.log('Express server listening on port ' + server.address().port);
});