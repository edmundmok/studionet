var express = require('express');
var router = express.Router();
var auth = require('./auth');
var apiCall = require('./apicall');
var db = require('seraph')({
  server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});


// route: /api/users
router.route('/')

  // return all users
  .get(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
    var query = [
      'MATCH (u:user)',
      'RETURN {id: id(u), name: u.name, avatar: u.avatar}'
    ].join('\n');

    db.query(query, function(error, result){
      if (error) {
        console.log('Error retrieving all users: ', error);
      }
      else {
        res.send(result);
      }
    });
  })

  // add a new user
  .post(auth.ensureAuthenticated, function(req, res){
    
    // TODO: Create constraint on nusOpenId
    var query = [
      'CREATE (u:user {\
                        nusOpenId: {nusOpenIdParam},\
                        canEdit: {canEditParam},\
                        name: {nameParam},\
                        isAdmin: {isAdminParam},\
                        addedBy: {addedByParam},\
                        addedOn: {addedOnParam},\
                        avatar: {avatarParam},\
                        joinedOn: {joinedOnParam},\
                        lastLoggedIn: {lastLoggedInParam},\
                        filters: {filtersParam},\
                        filterNames: {filterNamesParam}\
                       })',
      'RETURN u'
    ].join('\n');

    var params = {
      nusOpenIdParam: req.body.nusOpenId,
      canEditParam: true, //req.body.canEdit,
      nameParam: req.body.name,
      isAdminParam: req.body.isAdmin, 
      addedByParam: req.user.id,
      addedOnParam: Date.now(),
      avatarParam: "/assets/images/avatar.png",
      joinedOnParam: -1,  // -1 as default
      lastLoggedInParam: -1, // -1 as default
      filtersParam: [],
      filterNamesParam: []
    };

    /*
     *
     *  Only for testing and creating synthetic data; 
     *  Remove in production
     *
     * 
     */
    if(auth.ensureSuperAdmin && req.body.addedBy && req.body.addedOn){

      params.addedByParam = parseInt(req.body.addedBy);
      params.addedOnParam = new Date(req.body.addedOn).getTime();

    }

    db.query(query, params, function(error, result){
      if (error)
        console.log('Error creating new user: ', error);
      else
        res.send(result[0]);
    });

  });

// route: /api/users/:userId
router.route('/:userId')

  // return a user
  .get(auth.ensureAuthenticated, function(req, res){
    res.send('Placeholder');
  })

  // update a user
  .put(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
    var query = [
      'MATCH (u:user) WHERE ID(u)={userIdToEditParam}',
      'SET u.nusOpenId={nusOpenIdParam}, u.canEdit={canEditParam},',
      'u.name={nameParam}, u.isAdmin={isAdminParam}',
      'RETURN u'
    ].join('\n');

    var params = {
      userIdToEditParam: parseInt(req.params.userId),
      nusOpenIdParam: req.body.nusOpenId,
      canEditParam: req.body.canEdit,
      nameParam: req.body.name,
      isAdminParam: req.body.isAdmin, 
    };

    db.query(query, params, function(error, result){
      if (error){
        console.log('Error creating new user: ', error);
      }
      else{
        console.log('[SUCCESS] User id ' + req.params.userId + ' edited.');
        res.send(result[0]);
      }
    });
  })

  // delete a user
  .delete(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
    var query = [
      'MATCH (u:user) WHERE ID(u)={userIdToDeleteParam}',
      'OPTIONAL MATCH (u)-[r]-()',
      'DELETE u,r'
    ].join('\n');

    var params = {
      userIdToDeleteParam: parseInt(req.params.userId)
    };

    db.query(query, params, function(error,result){
      if (error){
        console.log(error);
      }
      else{
        console.log('[SUCCESS] User id ' + req.params.userId + ' deleted.');
        res.send('User id ' + req.params.userId + ' deleted.');
      }
    })
  });

module.exports = router;