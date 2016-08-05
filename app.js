var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var bodyParser = require('body-parser');

// require route files
var profile = require('./routes/profile');
var routes = require('./routes/index');
var users = require('./routes/users');
var modules = require('./routes/modules');
var moderators = require('./routes/moderators');
var uploads = require('./routes/uploads');
var all = require('./routes/all');
var contributions = require('./routes/contributions');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// use express session
app.use(session({ 
  secret: 'keyboard cat',   // some temp. secret
  cookie: {
    maxAge: 30*60*60*1000   // temp: expire in 30 hours
  }
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
app.use('/api/all', all);
app.use('/api/profile', profile);
app.use('/api/users', users);
app.use('/api/modules', modules);
app.use('/api/moderators', moderators);
app.use('/uploads', uploads);
app.use('/api/contributions', contributions);


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
