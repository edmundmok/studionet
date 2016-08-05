var db = require('seraph')({
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
  
};

module.exports.isStudent = function(req, res, next){

  var query = [
    'MATCH (m:module)-[r:MEMBER]->(u:user) WHERE id(u)=' + req.user.id + ' AND id(m)=' + req.params.moduleId +
    ' AND (r.role="Student" OR r.role="Admin" OR r.role="TA")',
    'RETURN sign(count(r)) as mod'
  ].join('\n');

  db.query(query, function(error, result){
    if (error)
      console.log('error!');
    else
      console.log(result);

    if (result[0].mod === 1)
      return next();
    else{
      console.log('Not a moderator of the module: ' + req.params.moduleId);
      res.redirect('/denied');
    }

  })

}


module.exports.isModerator = function(req, res, next){

  var query = [
    'MATCH (m:module)-[r:MEMBER]->(u:user) WHERE id(u)=' + req.user.id + ' AND id(m)=' + req.params.moduleId +
    ' AND (r.role="Admin" OR r.role="TA")',
    'RETURN sign(count(r)) as mod'
  ].join('\n');

  db.query(query, function(error, result){
    if (error)
      console.log('error!');
    else
      console.log(result);

    if (result[0].mod === 1)
      return next();
    else{
      console.log('Not a moderator of the module: ' + req.params.moduleId);
      res.redirect('/denied');
    }

  })

};

// Super Admin authentication middleware
module.exports.ensureSuperAdmin = function(req, res, next){
	
  if (req.user.superAdmin){
    return next();
  }
  res.redirect('/denied');

}