var express = require('express');
var router = express.Router();
var auth = require('./auth');
var apiCall = require('./apicall');
var db = require('seraph')({
  server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});


/*
 * Get all legal relationships
 */
var constants = require('../datastructure/constants.js');
var relationships = constants.relationships;


// route: /api/relationships
router.route('/')
	
	/*
	 * Returns a list of all legal relationships
	 */
	.get(auth.ensureAuthenticated, function(req, res){
		res.send(relationships);
	})

	.post(auth.ensureAuthenticated, function(req, res){

		// LIKE, VIEW: 					relationship between user and contribution, check if node user is you
		// REPLYTO, INSPIREDBY: relationship between contribution and contribution, check if the source
		// 											contribution belongs to you

		// caller should send: 	req.body.source, req.body.target, req.body.relationshipName
/*
		switch(relationshipName){
			case "LIKED":
			case "VIEWED":
				if(!checkUserAndSourceNode(req.body.source, req.user.id)){
					console.log("you are not the user source node");
					return;
				}
				break;

			case "REPLYTO":
			case "INSPIREDBY":
				if (!checkSourceNode(req.body.source)){
					console.log("you do not own the contribution source node");
					return;
				}
				break;
		}*/

		// If VIEWED relationship already exists, just increment view count


		// Create the relationship
		var query = [
			'MATCH (u) WHERE ID(u)=' + parseInt(req.body.source),
			'MATCH (c) WHERE ID(c)=' + parseInt(req.body.target),
			'MERGE (u)-[r:' + req.body.relationshipName + ']->(c)',
			'ON CREATE SET r.count = 1',
			//'r.createdBy = {createdByParam}',
			'ON MATCH SET r.count = coalesce(r.count, 0) + 1,',
			'r.lastUpdated = ' + Date.now()
		].join('\n');

		// console.log(req.body);

		var params = {
			relationshipParam : req.body.relationshipName,
			createdByParam: req.user.id
		}

		/*
		 * 	Overrides - only for testing; remove later
		 */
		params.createdByParam = req.body.createdBy || req.user.id;

		db.query(query, params, function(error, result){
			if (error)
				console.log(error);
			else
				res.send("success creating the new relationship");
		})

	});

function checkUserAndSourceNode(source, id){
	return source == id;
};

function checkSourceNode(source){

	var query = [
		'MATCH (u:user) WHERE ID(u)=' + req.user.id,
		'MATCH (u)-[r:CREATED]->(c:contribution)',
		'RETURN collect(ID(c))'
	].join('\n');

	db.query(query, function(error, result){
		if (error)
			console.log('error checking contribution ownership');
		else{
			if (result.find(source))
				return true;
			else return false;
		}
	})


}

module.exports = router;