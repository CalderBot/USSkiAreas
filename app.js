// Locals
var indexController = require('./controllers/index.js');
//var SkiArea = require('./models/skiArea.js');


// Modules
//var cheerio = require('cheerio');
//var request = require("request");
//var async = require('async');
//var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost/USSkiAreas');
var express = require('express');
var bodyParser = require('body-parser');


// Express setup:
var app = express();
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: false}));

// This takes up to a minute to load the page.  When it does load, it is just a page filled with the list of ski areas.
app.get('/', indexController.loadSkiAreas );



var server = app.listen(4068, function() {
	console.log('Express server listening on port ' + server.address().port);
});