var OpenIDStrategy = require('passport-openid').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var LocalStrategy = require('passport-local').Strategy;


var db = require('seraph')({
  server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});

module.exports = function(passport){

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the OpenID identifier is serialized and
  //   deserialized.
  passport.serializeUser(function(user, done) {
    // serialize with user's openid which should be unique.
    //console.log('serializing user: ', user.nusOpenId);
    done(null, user.nusOpenId);

  });

  passport.deserializeUser(function(nusOpenId, done) {
    // deserialize using the user's openid to retrieve user info from neo4j db.
    //console.log('deserializing user: ', nusOpenId);

    // cypher query to find user node by openid
    var query = [
      'MATCH (u:user {nusOpenId: {nusOpenIdParam}})',
      'RETURN u'
    ].join('\n');

    var params = {
      nusOpenIdParam: nusOpenId
    };

    db.query(query, params, function(err, res){
      // queries return an array, so return the first object in the array
      done(err, res[0]);
    });
  });

  // Use the OpenIDStrategy within Passport.
  //   Strategies in passport require a `validate` function, which accept
  //   credentials (in this case, an OpenID identifier), and invoke a callback
  //   with a user object.
  passport.use(new OpenIDStrategy({
      returnURL: (process.env.SITE_URL || 'http://localhost:3000/') + 'auth/openid/return',
      realm:  (process.env.SITE_URL || 'http://localhost:3000/')
    },
    function(identifier, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
        
        // To keep the example simple, the user's OpenID identifier is returned to
        // represent the logged-in user.  In a typical application, you would want
        // to associate the OpenID identifier with a user record in your database,
        // and return that user instead.
        // return done(null, { identifier: identifier })

        var query = [
          'MATCH (u:user {nusOpenId: {nusOpenIdParam}})',
          'RETURN u'
        ].join('\n');

        var params = {
          // do some string manipulation to extract the end of the string 
          // identifier is of form: https://openid.nus.edu.sg/{openId}
          nusOpenIdParam: (identifier.slice(identifier.lastIndexOf('/')+1)).toUpperCase()
        };

        db.query(query, params, function(err, res){
          // error with query
          if (err) {
            return done(err);
          }

          // no result
          if (!res) {
            return done(null, false);
          }

          // return the user object
          return done(null, res[0]);
        });
      });
    }
  ));

  passport.use(new BasicStrategy(
    function(userid, password, done) {
      process.nextTick(function () {
        var query = [
          'MATCH (u:user {nusOpenId: {nusOpenIdParam}})',
          'RETURN u'
        ].join('\n');

        var params = {
          nusOpenIdParam: userid
        };

        db.query(query, params, function(err, res){
          // error with query
          if (err) {
            return done(err);
          }

          // no result
          if (!res) {
            return done(null, false);
          }

          // return the user object
          return done(null, res[0]);
        });
      });
    }
  ));

  passport.use(new LocalStrategy(
    function(username, password, done) {
      process.nextTick(function () {
        var query = [
          'MATCH (u:user {nusOpenId: {nusOpenIdParam}})',
          'RETURN u'
        ].join('\n');

        var params = {
          nusOpenIdParam: username
        };

        db.query(query, params, function(err, res){
          // error with query
          if (err) {
            return done(err);
          }

          // no result
          if (!res) {
            return done(null, false);
          }

          // return the user object
          return done(null, res[0]);
        });
      });
    }
  ));
}