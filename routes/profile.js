var express = require('express');
var router = express.Router();
var auth = require('./auth');
var apiCall = require('./apicall');
var db = require('seraph')({
  server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});

// route: /api/profile (profile summary)
// get information about the current user
router.get('/', auth.ensureAuthenticated, function(req, res){
  var query = [
    'MATCH (u:user) WHERE ID(u)={userIdParam}',
    'WITH u',
    'OPTIONAL MATCH p1=(g:group)-[r:MEMBER]->(u)',
    'WITH collect({id: id(g), name: g.name, role: r.role, joinedOn: r.joinedOn, restricted: g.restricted, description: g.description}) as groups, u',
    'OPTIONAL MATCH p2=(c:contribution)<-[r1:CREATED]-(u)',
    'WITH groups, collect({id: id(c), title: c.title, lastUpdated: c.lastUpdated, contentType: c.contentType, rating: c.rating, rateCount: c.rateCount, views: c.views, tags: c.tags}) as contributions, u',
    'RETURN {\
              nusOpenId: u.nusOpenId,\
              canEdit: u.canEdit,\
              name: u.name,\
              addedOn: u.addedOn,\
              avatar: u.avatar,\
              joinedOn: u.joinedOn,\
              lastLoggedIn: u.lastLoggedIn,\
              filters: u.filters,\
              filterNames: u.filterNames,\
              id: id(u),\
              groups: groups,\
              contributions: contributions\
    }'
  ].join('\n');

  var params = {
    userIdParam: req.user.id
  };

  db.query(query, params, function(error, result){
    if (error){
      res.send(error);
      console.log('Error getting user profile: ' + req.user.nusOpenId + ', ' + error);
    }
    else
      // send back the profile with new login date
      res.send(result[0]);
  });
});

// route: PUT /api/profile
// edit user profile
// only edit name, avatar is under uploads
router.put('/', auth.ensureAuthenticated, function(req, res){

  var query = [
    'MATCH (u:user) WHERE ID(u)={userIdParam}',
    'WITH u',
    'SET u.name={nameParam}',
    'RETURN u'
  ].join('\n');

  var params = {
      nameParam: req.body.name,
      userIdParam: req.user.id
    };

    db.query(query, params, function(error, result){
      if (error){
        console.log('Error modifying user: ', error);
        res.send('Error editing user profile name');
      }
      else{
        res.send(result[0]);
      }
    });
});



// route: /api/profile/user
// get just the user data for this account
router.get('/user', auth.ensureAuthenticated, function(req, res){

  var query = [
    'MATCH (u:user)',
    'WHERE ID(u)={userIdParam}',
    'WITH u',
    'RETURN u'
  ].join('\n');

  var params = {
    userIdParam: req.user.id
  };

  db.query(query, params, function(error, result){
    if (error)
      console.log('Error getting user profile: ' + req.user.nusOpenId + ', ' + error);
    else
      res.send(result[0]);
  });

});


// route: /api/profile/groups
// get just the groups that this user is in
router.get('/groups', auth.ensureAuthenticated, function(req, res){
  
  var query = [
    'MATCH (u:user)<-[r:MEMBER]-(g:group)',
    'WHERE ID(u)={userIdParam}',
    'RETURN {id: id(g), name: g.name, role: r.role}'
  ].join('\n');

  var params = {
     userIdParam: parseInt(req.user.id)
  }

  db.query(query, params, function(error, result){
    if (error)
      console.log('Error getting current user\'s module');
    else
      res.send(result);
  });

})


// route: /api/profile/contributions
// get the contributions that this user created
router.get('/contributions', auth.ensureAuthenticated, function(req, res){
  
  var query = [
    'MATCH (u:user)-[r:CREATED]->(c:contribution)',
    'WHERE ID(u)={userIdParam}',
    'RETURN {id: id(c), title: c.title}'
  ].join('\n');

  var params = {
     userIdParam: parseInt(req.user.id)
  }

  db.query(query, params, function(error, result){
    if (error)
      console.log('Error getting current user\'s contributions');
    else
      res.send(result);
  });

});

// route: /api/profile/tags
// get the tags that this user created
router.get('/tags', auth.ensureAuthenticated, function(req, res){

  var query = [
    'MATCH (u:user)-[r:CREATED]->(t:tag)',
    'WHERE ID(u)={userIdParam}',
    'RETURN {id: id(t), createdOn: r.createdOn, name: t.name}'
  ].join('\n');

  var params = {
    userIdParam: req.user.id
  };

  db.query(query, params, function(error, result){
    if (error){
      console.log('Error getting current user created tags');
      return res.send('Error getting current user created tags');
    }

    else
      res.send(result);
  });

});

// route: /api/profile/filters
router.route('/filters')
  
  .get(auth.ensureAuthenticated, function(req, res){

    var query = [
      'MATCH (u:user) WHERE ID(u)={userIdParam}',
      'RETURN {filters: u.filters, filterNames: u.filterNames}'
    ].join('\n');

    var params = {
      userIdParam: req.user.id
    };

    db.query(query, params, function(error, result){
      if (error){
        console.log('Error getting current user filters');
        return res.send('Error getting current user filters');
      }
      else {
        return res.send(result);
      }
    });

  })

  .post(auth.ensureAuthenticated, function(req, res){

    if (!(req.body.filters instanceof Array) || !(req.body.filterNames instanceof Array)) {
      return res.send('filters or filterNames are not arrays');
    }

    if (req.body.filters.length != req.body.filterNames.length){
      return res.send('filters and filterNames must be same length')
    }

    var query = [
      'MATCH (u:user) WHERE ID(u)={userIdParam}',
      'SET u.filter={filtersParam}, u.filterNames: {filterNamesParam}'
    ].join('\n');

    var params = {
      userIdParam: req.user.id,
      filtersParam: req.body.filters,
      filterNamesParam: req.body.filterNames
    };

    db.query(query, params, function(error, result){
      if (error){
        console.log('Error posting filters for the user');
        return res.send('Error posting users for the user');
      }
      else {
        return res.send('Successfully updated user filters');
      }
    });
    
  });

module.exports = router;