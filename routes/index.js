var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('./auth');
var db = require('seraph')({
  server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});

/* GET home page. */
router.get('/', function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.render('index', { title: 'Express' });
  }

  return res.redirect('/user');

  /*
  if (req.user.superAdmin) {
    res.redirect('/admin');
  }
  else {
    res.redirect('/user');
  }
  */
});

router.get('/upload', function(req, res, next){
  res.render('upload');
});

// GET login page
router.get('/login', function(req, res, next){
	res.render('');
});

// GET admin page
router.get('/admin', auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
	res.render('admin');
});

// GET user page
router.get('/user', auth.ensureAuthenticated, function(req, res){
	res.render('user');
});

// for testing - remove for deployment
//if (process.env.NODE_ENV === 'test'){
  router.post('/auth/local', passport.authenticate('local', {failureRedirect: '/'}),
    function(req, res){
      res.redirect('/');
    });

  router.get('/auth/basic', passport.authenticate('basic', {failureRedirect: '/'}),
    function(req, res) {
      res.redirect('/');
    });
//}

//   POST /auth/openid
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in OpenID authentication will involve redirecting
//   the user to their OpenID provider.  After authenticating, the OpenID
//   provider will redirect the user back to this application at
//   /auth/openid/return
router.post('/auth/openid', 
  passport.authenticate('openid', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  });

//   GET /auth/openid/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
router.get('/auth/openid/return', 
  passport.authenticate('openid', { failureRedirect: '/' }),
  function(req, res) {
    // res.redirect('/');
    //if (req.user.superAdmin)
    	// redirect to admin dashboard (super admin)
      //res.redirect('/admin');
    //else
    	// redirect to user dashboard

      // update the last logged in for this user
      var query = [
        'MATCH (u:user) WHERE ID(u)={userIdParam}',
        'SET u.lastLoggedIn={lastLoggedInParam}'
      ].join('\n');

      var params = {
        userIdParam: req.user.id,
        lastLoggedInParam: Date.now()
      };

      db.query(query, params, function(error, result){
        if (error){
          console.log('Error updating user\'s last logged in date');
        }
        return;
      });
       
      // Always redirect to user-page async
      res.redirect('/user'); 
  });

// GET logout
// ends the express session
router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// GET denied
// To show this page if user is not authenticated and tries to access user page, or is not an admin but tries to 
// enter admin page
router.get('/denied', function(req, res){
  res.render('access_denied');
});

module.exports = router;
