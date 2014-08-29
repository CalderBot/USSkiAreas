This is a Wikipedia scraper that generates a list of stats for all US Ski Areas that have Wikipedia pages.  

To use it to fill your browser window with the list of ski area data:

1. Start node
2. Open localhost:4068
3. Wait up to a minute for the page to load.  It will just dump (res.send) an array of the data onto your browser window.

If you prefer to have the data in Mongo, just have mongod running and when the page load is complete, you will automatically have a database called USSkiAreas with the data in it.

Note: Your node terminal will log metadata for the ski area stats... information such as how of the ski areas had annual snowfall listed etc...

Enjoy!