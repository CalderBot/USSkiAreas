var mongoose = require('mongoose');


// Define a language model
module.exports = mongoose.model('SkiArea', {
	"name": String,
    "wikiURL": String,
    "website": String,
    "yearlySnowfall": Number,
    "skiableAcres": Number,
    "runs":Number,
    "beginner": Number,
    "intermediate": Number,
    "advanced": Number,
    "expert": Number,
    "vertical": Number,
    "top": Number,
    "base": Number,
})