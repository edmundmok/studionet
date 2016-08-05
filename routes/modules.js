var express = require('express');
var router = express.Router();
var auth = require('./auth');
var apiCall = require('./apiCall');
var db = require('seraph')({
	user: process.env.DB_USER,
	pass: process.env.DB_PASS
});


// might change routes to use a better middleware

// route: /api/modules/
router.route('/')

	// return all modules
	.get(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
		
		var query = [
			'MATCH (m:module) WITH m',
			'MATCH (m)-[r:MEMBER]->(u:user)',
			'RETURN {' +
								'code: m.code, name: m.name, contributionTypes: m.contributionTypes, id: id(m),' + 
								'users: collect({id: id(u), role: r.role })}'
		].join('\n');

		db.query(query, function(error, result){
			if (error)
				console.log('Error retrieving all modules: ', error);
			else
				res.send(result);
		});

	})

	// add a new module
	.post(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){

		var query = [
			'CREATE (m:module {name: {nameParam}, code: {codeParam}, contributionTypes: {typesParam}})',
			'RETURN m'
		].join('\n');

		var params = {
			nameParam: req.body.name,
			codeParam: req.body.code,
			typesParam: req.body.contributionTypes
		};

		db.query(query, params, function(error, result){
			if (error)
				console.log('Error adding module to the database: ', error);
			else
				// return the first item because query always returns an array but REST API expects a single object
				res.send(result[0]);
		});

	});

// route: /api/modules/:moduleId
router.route('/:moduleId')

	// returns a particular module
	.get(auth.ensureAuthenticated, auth.isStudent, function(req, res){

		var query = "match p=(m:module)-[*0..2]->() where id(m)=" + req.params.moduleId +" return p";

		apiCall(query, function(data){
			res.send(data);
		});


		/*		
		var query = [
			'MATCH (m:module) WHERE ID(m)=' + req.params.moduleId,
			'WITH m',
			'MATCH (m)-[r:MEMBER]->(u:user)',
			'RETURN {' +
								'code: m.code, name: m.name, contributionTypes: m.contributionTypes, id: id(m),' + 
								'users: collect({id: id(u), role: r.role })}'
		].join('\n');

		db.query(query, function(error, result){
			if (error)
				console.log('Error retreiving module of id ' + req.params.moduleId + ' : ', error);
			else
				// return the first item because query always returns an array but REST API expects a single object
				res.send(result[0]);
		});
		*/

	})

	// updates an existing module
	.put(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
		var query = [
			'MATCH (m:module)',
			'WHERE ID(m)=' + req.params.moduleId,
			'WITH m',
			'SET m.name={nameParam}, m.code={codeParam}, m.contributionTypes={typesParam}',
			'RETURN m'
		].join('\n');

		/*
		if (req.body.name)
			query.push('SET m.name={nameParam}');
		if (req.body.code)
			query.push('SET m.code={codeParam}');
		if (req.body.contributionTypes)
			query.push('SET m.contributionTypes={typesParam}');

		query.push('RETURN m');
		query.join('\n');
		*/

		var params = {
			nameParam: req.body.name,
			codeParam: req.body.code,
			typesParam: req.body.contributionTypes
		};

		db.query(query, params, function(error, result){
			if (error)
				console.log('Error updating module of id ' + req.params.moduleId + ' : ', error);
			else
				// return the first item because query always returns an array but REST API expects a single object
 				res.send(result[0]);
		});

	})

	// deletes an existing module
	.delete(auth.ensureAuthenticated, auth.ensureSuperAdmin, function(req, res){
		var query = [
			'MATCH (m:module)',
			'WHERE ID(m)=' + req.params.moduleId,
			'DELETE m'
		].join('\n');

		db.query(query, function(error, result){
			if (error)
				console.log('Error deleting module of id ' + req.params.moduleId + ' : ', error);
			else
				// return the first item because query always returns an array but REST API expects a single object
				res.send(result[0]);
		})
	});

router.route('/:moduleId/posts')
	// get all posts linked to the moduleId
	.get(auth.ensureAuthenticated, auth.isStudent, function(req, res){
		var query = 'match p=(m:module)-[r:POST]->() where id(m)='+ req.params.moduleId+' return p';

		apiCall(query, function(data){
			res.send(data);
		})
	})

	// add a post linked to the moduleId
	.post(auth.ensureAuthenticated, auth.isModerator, function(req, res){

		var query = [
			'MATCH (m:module) WHERE ID(m)=' + req.params.moduleId,
			'CREATE (p:post {title: {titleParam}, body: {bodyParam}, postedBy: {authorParam}, lastUpdated:{lastUpdatedParam}, editted: {edittedParam}})',
			'WITH m, p',
			'CREATE (m)-[r:POST]->(p)',
			'RETURN p'
		].join('\n');

		var params = {
			titleParam: req.body.title,
			bodyParam: req.body.body,
			authorParam: req.user.nusOpenId,
			lastUpdatedParam: Date.now(),
			edittedParam: false
		};

		db.query(query, params, function(error, result){
			if (error)
				console.log('Error creating post for module: ' + req.params.moduleId);
			else
				res.send(result[0]);
		});
	});



// route: /api/modules/:moduleId/users
router.route('/:moduleId/users')
	
	// get all users for this module (all roles)
	.get(auth.ensureAuthenticated, auth.isStudent, function(req, res){

		var query = "MATCH path=(m:module)-[:MEMBER]->(u:user) where id(m)="+ req.params.moduleId +"\nRETURN path";

		apiCall(query, function(data){
			res.send(data);
		});

		/*
		var query = [
			'MATCH (m:module)',
			'WHERE ID(m)=' + req.params.moduleId,
			'WITH m',
			'MATCH (m)-[r:MEMBER]->(u)',
			'RETURN u'
		].join('\n');

		db.query(query, function(error, result){
			if (error)
				console.log('Error getting all users of module id: ' + req.params.moduleId + ',' + error);
			else
				res.send(result);
		});
		*/
	})

	// link the user with this module
	.post(auth.ensureAuthenticated, auth.isModerator, function(req, res){
		var query = [
			'MATCH (u:user) WHERE ID(u)=' + req.body.userId + ' WITH u',
			'MATCH (m:module) WHERE ID(m)=' + req.params.moduleId,
			'CREATE UNIQUE (m)-[r:MEMBER{role: {roleParam}}]->(u)'
		].join('\n');

		var params = {
			roleParam: req.body.moduleRole
		};

		db.query(query, params, function(error, result){
			if (error)
				console.log('Error linking the user to the module');
			else
				res.send('success');
		});
	})

module.exports = router;
