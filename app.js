
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 8080);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.locals({
    title: 'Node-Neo4j Template'    // default title
});

// Routes
app.get('/', routes.site.index);
app.get('/getdata', routes.site.getData);
app.get('/dbstat', routes.site.DBstats);
app.get('/about', routes.site.about);

app.get('/users', routes.users.list);
//app.get('/dbstat', routes.users.getStats);
app.post('/addcustomer', routes.users.create);
app.post('/addproduct', routes.products.create);

//app.get('/users/:username', routes.users.show);
//app.post('/users/:username', routes.users.edit);
//app.del('/users/:username', routes.users.del);

//app.get('/customers', routes.customers.list);

//app.post('/users/:username/follow', routes.users.follow);
//app.post('/users/:username/unfollow', routes.users.unfollow);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening at: http://localhost:%d/', app.get('port'));
});
