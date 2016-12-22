var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('./config/logger');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var url = require('url'); // for parsing url to reject image logs, remove if not needed

// require route files
var profile = require('./routes/profile');
var routes = require('./routes/index');
var users = require('./routes/users');
var groups = require('./routes/groups');
var tags = require('./routes/tags');
var moderators = require('./routes/moderators');
var relationships = require('./routes/relationships');
var uploads = require('./routes/uploads');
var graph_all = require('./routes/graph_all');
var graph_med = require('./routes/graph_med');
var contributions = require('./routes/contributions');
var supernode = require('./routes/supernode');

var logs = require('./routes/logs');

var app = express();

// Logger configurations
morgan.token('userDetails', function(req, res){
  return req.isAuthenticated() ? req.user.nusOpenId + ": " + req.user.name : "User not signed in";
});
morgan.token('date', function(req, res){
  return new Date().toString();
});
var morganLogFormat = '[:remote-addr][:userDetails][:date] ":method :url HTTP/:http-version"\\n\
Status Code: :status, Content-Length: :res[content-length], Referrer: ":referrer", :response-time ms';
app.use(require('morgan')(morganLogFormat, { 
  "stream": logger.stream,
  skip: function(req, res) { // for parsing url to reject image logs, remove if not needed
    var urlSource = url.parse(req.url).pathname.split('/')[1];
    return ['assets', 'global'].indexOf(urlSource) > -1;  // don't log images, etc.
  }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//if (process.env.NODE_ENV !== 'test')
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// use express session
app.use(session({ 
  secret: 'keyboard cat',   // some temp. secret
  cookie: {
    maxAge: 30*60*60*1000   // temp: expire in 30 hours
  },
  resave: true,
  saveUninitialized: true
}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Passport config and openid strategy
var initPassport = require('./config/passport');
initPassport(passport);

app.use('/', routes);
app.use('/graph/all', graph_all);
app.use('/graph/med', graph_med);
app.use('/api/profile', profile);
app.use('/api/users', users);
app.use('/api/groups', groups);
app.use('/api/tags', tags);
app.use('/api/moderators', moderators);
app.use('/api/relationships', relationships);
app.use('/api/contributions', contributions);
app.use('/api/supernode', supernode);
app.use('/uploads', uploads);

app.use('/api/logs', logs);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
