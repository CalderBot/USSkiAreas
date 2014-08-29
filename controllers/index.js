var SkiArea = require('../models/skiArea.js');
var cheerio = require('cheerio');
var request = require("request");
var async = require('async');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/USSkiAreas');



module.exports = {loadSkiAreas:loadSkiAreas};


// This function populates a mongo database of ski areas and also res.send's the entire database to the browser.  

function loadSkiAreas(req,res){
	var listURL = 'https://en.wikipedia.org/wiki/List_of_ski_areas_and_resorts_in_the_United_States';
	// Get the list of Colorado ski Areas and their wikipedia page urls:
	request(listURL,
		function(err, response){
			if(err) return console.log("error getting list of ski area names", err);
			// Load entire page:
			var $ = cheerio.load(response.body);

			// A list whose items are <a href="wikiurl" title="ski area name">
			var USSkiAreaAnchors = $('#mw-content-text > ul').find('li> a:first-child')
			console.log("Number of USSkiAreaAnchors: ", USSkiAreaAnchors.length)

			// Fill a list of the names and wikipedia urls:
			var skiAreas = [];
			var badAnchors = 0;
			for (var i = 0; i < USSkiAreaAnchors.length; i++) {
				// Ensure resort has a wiki page with conditional, then push name and url to skiAreas
				if( ! USSkiAreaAnchors.eq(i).attr('title') ) badAnchors++;
				else if( ! USSkiAreaAnchors.eq(i).attr('title').match("does not exist") ){
					skiAreas.push({'name':USSkiAreaAnchors.eq(i).text(), 
						'wikiURL':'https://en.wikipedia.org'+USSkiAreaAnchors.eq(i).attr('href') } )
				}
				else console.log("no wikipedia page for: ", USSkiAreaAnchors.eq(i).text() );
			};
			console.log('Number of irrelevant anchors:', badAnchors);
		
			console.log("number of skiAreas with wikipedia entries: ", skiAreas.length)
			// Asynchronous mapping to get the wiki page for each ski area:
			async.map(skiAreas, getSkiPage, function(err,results){
					for (var i = 0; i < skiAreas.length; i++) {
						skiAreas[i] = skiScraper(skiAreas[i],results[i]);
					};
					//console.log(skiAreas)
					res.send(skiAreas)
					console.log(skiAreas.length)
					howManyWithKey(skiAreas,"name")
					howManyWithKey(skiAreas,"wikiURL")
					howManyWithKey(skiAreas,"website")
					howManyWithKey(skiAreas,"state")
					howManyWithKey(skiAreas,"yearlySnowfall")
					howManyWithKey(skiAreas,"runs")
					howManyWithKey(skiAreas,"top")
					howManyWithKey(skiAreas,"base")
					howManyWithKey(skiAreas,"vertical")
					howManyWithKey(skiAreas,"beginner")
					howManyWithKey(skiAreas,"intermediate")
					howManyWithKey(skiAreas,"advanced")
					howManyWithKey(skiAreas,"expert")

					// Asyncronous mapping to save ski areas to database
					async.map(skiAreas, storeSkiArea,
						function(err,results){
							if(err) return console.log("Error storing ski areas to database");
							console.log('ski areas successfully stored in database')
						}
					)
				}
			)
		}				
	)
}

// Little callbacks
function getSkiPage(a,callback){
	request(a.wikiURL,callback);
}
function storeSkiArea(a,callback){
	skiArea = new SkiArea(a); 
	skiArea.save(callback)
}

// helper for the main ski area scraper
function scrape(skiArea,key,str,regexp,lowRange,highRange){
	var value = str.match(regexp);
	if(value){
		if( !(lowRange && highRange) || (lowRange <= value && value <= highRange) ) skiArea[key]=value;
		else if( lowRange > value || value > highRange ) console.log("Out or range: ", skiArea.name, key, value);
	}
	else console.log("NO MATCH IN "+ str +" FOR ", key);

}

// Fills in properties of a ski area by scraping its wikipedia page:
function skiScraper(skiArea, wikiPageResponse){
	var wikiPage = cheerio.load(wikiPageResponse.body);
	
	// Ski area web site:
	var url = wikiPage('.infobox a').last().attr('href');
	if( url && url.match(/http/) ) skiArea.website = url;

	// All text of the infobox:
	var s = wikiPage('.infobox').text().replace(/,/g,'').replace(/[^\w]/g,' ').toLowerCase();
	if(!s){ 
		console.log("No infobox found in wikipedia page for", skiArea.name);
		return skiArea;
	}
	// state where ski area is located:
	var states = "Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming".split(', ');
	for (var i = 0; i < states.length; i++) {
		var state = states[i].toLowerCase();
		var reg = new RegExp(state);
		if(s.match(reg)){ 
			skiArea.state = states[i];
			break;
		}
	}
	if(!skiArea.state) console.log("NO STATE LISTED IN "+skiArea.name+" IN "+s )
	
	// Elevation at top of mountain:
	var top = s.match(/top\s*elevation\s*\d*/);
	if(top){ 
		var topFeet = +top[0].replace(/\s*/g,'').slice("topelevation".length);
		if( 100 < topFeet && topFeet < 15000 ) skiArea.top = topFeet;
	} 
	else console.log("NO TOP LISTED IN: ", s);

	// Elevation at base of mountain:
	var base = s.match(/base\s*elevation\s*\d*/);
	if(base){
		var baseFeet = +base[0].replace(/\s*/g,'').slice("baseelevation".length);
		if( 0 < baseFeet && baseFeet < 14000 ) skiArea.base = baseFeet; 
	} 
	else console.log("NO BASE LISTED IN: ", s);
	
	// Vertical feet: 
	var vert = s.match(/vertical\s*\d*/);
	if(vert){ 
		var vertical = +vert[0].replace(/\s*/g,'').slice("vertical".length);
		if( 300 < vertical && vertical < 7000 ) skiArea.vertical= vertical;
	} 
	else console.log("NO VERTICAL LISTED IN: ", s);

	// Fill in if 2/3 of top, base, vert are available:
	if     (!skiArea.top && !!skiArea.base && !!skiArea.vertical) skiArea.top = skiArea.base + skiArea.vertical;
	else if(!!skiArea.top && !skiArea.base && !!skiArea.vertical) skiArea.base = skiArea.top - skiArea.vertical;
	else if(!!skiArea.top && !!skiArea.base && !skiArea.vertical) skiArea.vertical = skiArea.top - skiArea.base;

	// Skiable acres:
	var acres = s.match(/skiable\s*area\s*\d*/);
	if(acres){
		var skiableAcres = +acres[0].replace(/\s*/g,'').slice("skiablearea".length);
		if( 100 < skiableAcres && skiableAcres < 10000) skiArea.skiableAcres = skiableAcres; 
	}
	else console.log("NO SKIABLE ACRES LISTED IN: ", s);

	// Average yearly inches of snowfall:
	var snow = s.match(/snowfall\s*\d*/);
	if(snow){ 
		var yearlySnowfall = +snow[0].replace(/\s*/g,'').slice("snowfall".length);
		if( 0 < yearlySnowfall && yearlySnowfall < 600 ) skiArea.yearlySnowfall = yearlySnowfall;
	}
	else console.log("NO YEARLY SNOWFALL LISTED IN: ", s);

	// Number of runs:
	var snow = s.match(/runs\s*\d*/);
	if(snow){ 
		var runs = +snow[0].replace(/\s*/g,'').slice("runs".length);
		if( 0 < runs && runs < 200 ) skiArea.runs = runs;
	}
	else console.log("NO RUNS LISTED IN: ", s);

	// Percentage of beginner/easiest terrain:
	if(s.match(/\d*\s*beginner/)){
		var beg = s.match(/\d*\s*beginner/);
		var beginner = +beg[0].replace(/\s*/g,'').slice(0,-"beginner".length);
		if( 0 < beginner && beginner < 100 ) skiArea.beginner = beginner;
	}
	else if(s.match(/\d*\s*easiest/)){
		var beg = s.match(/\d*\s*easiest/);
		var beginner = +beg[0].replace(/\s*/g,'').slice(0,-"easiest".length);
		if( 0 < beginner && beginner < 100 ) skiArea.beginner = beginner;
	}
	else if(s.match(/\d*\s*easier/)){
		var beg = s.match(/\d*\s*easier/);
		var beginner = +beg[0].replace(/\s*/g,'').slice(0,-"easier".length);
		if( 0 < beginner && beginner < 100 ) skiArea.beginner = beginner;
	}
	else console.log("NO BEGINNER LISTED IN: ", s);
	
	// Percentage of intermediate/more difficult terrain:
	if(s.match(/\d*\s*intermediate/)){
		var inter = s.match(/\d*\s*intermediate/);
		var intermediate = +inter[0].replace(/\s*/g,'').slice(0,-"intermediate".length);
		if( 0 < intermediate && intermediate < 100 ) skiArea.intermediate = intermediate;
	}
	else if(s.match(/\d*\s*more\s*difficult/)) {
		var inter = s.match(/\d*\s*more\s*difficult/);
		var intermediate = +inter[0].replace(/\s*/g,'').slice(0,-"moredifficult".length);
		if( 0 < intermediate && intermediate < 100 ) skiArea.intermediate = intermediate;
	}
	else console.log("NO INTERMEDIATE LISTED IN: ", s);

	// Percentage of advanced/most difficult terrain:
	if(s.match(/\d*\s*advanced/)){
		var adv = s.match(/\d*\s*advanced/);
		var advanced = +adv[0].replace(/\s*/g,'').slice(0,-"advanced".length);
		if( 0 < advanced && advanced < 100 ) skiArea.advanced = advanced;
	}
	else if(s.match(/\d*\s*most\s*difficult/)){
		var adv = s.match(/\d*\s*most\s*difficult/);
		var advanced = +adv[0].replace(/\s*/g,'').slice(0,-"mostdifficult".length);
		if( 0 < advanced && advanced < 100 ) skiArea.advanced = advanced;
	}
	else console.log("NO ADVANCED LISTED IN: ", s);

	// Percentage of expert terrain:
	if(s.match(/\d*\s*expert/)){
		var exp = s.match(/\d*\s*expert/);
		var expert = +exp[0].replace(/\s*/g,'').slice(0,-"expert".length);
		if( 0 < expert && expert < 100 ) skiArea.expert = expert;
	}
	else if(s.match(/\d*\s*extreme/)){
		var exp = s.match(/\d*\s*extreme/);
		var expert = +exp[0].replace(/\s*/g,'').slice(0,-"extreme".length);
		if( 0 < expert && expert < 100 ) skiArea.expert = expert;
	}
	else console.log("NO EXPERT LISTED IN: ", s);

	return skiArea;
}

// Logging helper functions
function howManyWithKey(skiAreas,key){
	console.log("Number with "+key, skiAreas.filter(function(area){return area[key] !==undefined}).length)
}

function howManyWithKeyAndValue(skiAreas,key, value){
	console.log("Number with "+key+" = "+value, skiAreas.filter(function(area){return area[key]===value}).length)
}
function listByKey(skiAreas,key){
	console.log("Areas with "+key, skiAreas.filter(function(area){return area[key] !==undefined}))
}

function listByKeyAndValue(skiAreas,key,value){
	console.log("Areas with "+key+" = "+value, skiAreas.filter(function(area){return area[key]===value}))
}





	/* Notes on async.map:
	1. Syntax: async.map(myArray,iterator,callback2)
	2. iterator(item, callback1) - A function to apply to each item in arr. The iterator is passed a callback(err, transformed) which must be called once it has completed with an error (which can be null) and a transformed item.
	3. But callback1(err,transformed) is determined by async.  Nonetheless, you must include something in your iterator that triggers it, because async is listening for that.
	4. callback2(err, results) - A callback which is called when all iterator functions have finished, or an error occurs. Results is an array of the transformed items from the arr.
	*/