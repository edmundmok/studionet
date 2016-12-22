var db = require('seraph')({
  server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});
// This module exports a bunch of auth middleware functions

//   Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
module.exports.ensureAuthenticated = function(req, res, next) {
  
  if (req.isAuthenticated()) { 
    return next(); 
  }
  res.redirect('/denied');
  
}

// Super Admin authentication middleware
module.exports.ensureSuperAdmin = function(req, res, next){
  
  if (req.user.superAdmin){
    return next();
  }
  res.redirect('/denied');

}

module.exports.isGroupAdmin = function(req, res, next){

  var query = [
    'MATCH (g:group)-[r:MEMBER {role: "Admin"}]->(u:user)',
    'WHERE id(u)={userIdParam} AND id(g)={groupIdParam}',
    'RETURN sign(count(r)) as mod'
  ].join('\n');

  var params = {
    userIdParam: parseInt(req.user.id),
    groupIdParam: parseInt(req.params.groupId)
  };

  db.query(query, params, function(error, result){

    if (error){
      console.log('Error checking if user ' + req.user.id +  ' is a moderator of the module ' + req.params.groupId);
      return res.redirect('/denied');
    }

    var isModerator = parseInt(result[0].mod) === 1;

    if (!isModerator){
      console.log('User ' + req.user.id + ' is not a moderator of the module ' + req.params.groupId);
      return res.redirect('/denied');
    }

    return next();

  });

};