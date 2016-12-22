var express = require('express');
var router = express.Router();
var multer = require('multer');
var mkdirp = require('mkdirp');
var glob = require('glob');
var path = require('path');
var fs = require('fs-extra');
var gm = require('gm');
var auth = require('./auth');
var storage = require('./storage');
var apiCall = require('./apicall');
var db = require('seraph')({
	server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
	user: process.env.DB_USER,
	pass: process.env.DB_PASS
});
var _ = require('underscore');
var mmm = require('mmmagic'),
      Magic = mmm.Magic;
var contributionUtil = require('./contributionutil');


// route: /api/contributions
router.route('/')
	/*
	 * Returns all contributions, including the name, created by, created on and id of the contribution.
	 */
	.get(auth.ensureAuthenticated, function(req, res){

		var numKeys = Object.keys(req.query).length;
		var hasParams = numKeys > 0;
		var NUM_QUERY_KEYS_CONTRIBUTION = 6;

		var QUERY_PARAM_DEPTH_KEYWORD = 'd';
		var QUERY_PARAM_GROUPS_KEYWORD = 'g';
		var QUERY_PARAM_RATING_KEYWORD = 'r';
		var QUERY_PARAM_USERS_KEYWORD = 'u';
		var QUERY_PARAM_TIME_KEYWORD = 't';
		var QUERY_PARAM_TAGS_KEYWORD = 'tg';

		if (!hasParams) {
			var query = [
				'MATCH (c:contribution)',
				'WITH c',
				'RETURN ({title: c.title, createdBy: c.createdBy, dateCreated: c.dateCreated, id: id(c)})'		
			].join('\n');

			db.query(query, function(error, result) {
				if (error){
					console.log('[ERROR] Attempt to fetch all contributions by /api/contributions failed.');
					res.send('error getting all contributions');
				}
				else{
					res.send(result);
				}		
			});

			return;
		}

		if (numKeys !== NUM_QUERY_KEYS_CONTRIBUTION) {
			console.log('[ERROR] Attempt to fetch filtered contributions by /api/contributions failed.\nReason: Expected 6 query parameters but only received ' + numKeys + '.');
			return res.send('must send all 6 query params');
		}

		// has exactly 6 query params
		// check if the 6 query params are the ones that i need

		// 1 Number query param (depth)
		if (!(QUERY_PARAM_DEPTH_KEYWORD in req.query)){
			console.log('[ERROR] Attempt to fetch filtered contributions by /api/contributions failed.\nReason: Expected a depth param but did not receive any.');
			return res.send('No depth query provided');
		}

		var QUERY_PARAM_DEPTH_STRING = req.query[QUERY_PARAM_DEPTH_KEYWORD];
		var isDepthParamEmpty = QUERY_PARAM_DEPTH_STRING.length <= 0;
		var isDepthParamNumber = !isNaN(parseInt(QUERY_PARAM_DEPTH_STRING));

		if (isDepthParamEmpty || !isDepthParamNumber) {
			console.log('[ERROR] Attempt to fetch filtered contributions by /api/contributions failed.\nReason: Expected depth param to be a Number but did not receive a Number.');
			return res.send('Depth query provided is not a number');
		}

		// 5 array query params
		var requiredKeysWithoutDepth = [
																		QUERY_PARAM_GROUPS_KEYWORD,
																		QUERY_PARAM_USERS_KEYWORD,
																		QUERY_PARAM_RATING_KEYWORD,
																		QUERY_PARAM_TIME_KEYWORD,
																		QUERY_PARAM_TAGS_KEYWORD
																	 ].sort();

		var sortedQueryKeys = Object.keys(req.query).sort();
		sortedQueryKeys.splice(sortedQueryKeys.indexOf(QUERY_PARAM_DEPTH_KEYWORD), 1); // remove the depth param

		var correctParams = requiredKeysWithoutDepth.reduce(function(acc, val, idx){
			return acc 
				&& (val == sortedQueryKeys[idx]) 
				&& (req.query[val].length > 0) // must not be blank queries for JSON.parse()
		}, true);

		if (!correctParams) {
			console.log('[ERROR] Attempt to fetch filtered contributions by /api/contributions failed.\nReason: Did not receive the exact expected params.');
			return res.send('Please send the correct 6 params');
		}

		// First get all the users matching the specified group, if present
		var groupIds = JSON.parse(req.query[QUERY_PARAM_GROUPS_KEYWORD]);
		var specifiedUserIds = JSON.parse(req.query[QUERY_PARAM_USERS_KEYWORD]);

		if (groupIds instanceof Array){
			groupIds = groupIds.map(x => parseInt(x));
		} else {
			groupIds = parseInt(groupIds);
		}

		if (specifiedUserIds instanceof Array) {
			specifiedUserIds = specifiedUserIds.map(x => parseInt(x));
		} else {
			specifiedUserIds = parseInt(specifiedUserIds);
		}

		var matchAllGroups = false;
		var matchAllUsers = false;
		if (typeof groupIds === 'number' && groupIds === -1) {
			// match all groups
			matchAllGroups = true;
		} else if (typeof specifiedUserIds === 'number' && specifiedUserIds === -1){
			matchAllUsers = true;
		} else {
			var query = [ 
				'MATCH (g:group) WHERE ID(g) IN {groupIdParam}',
				'MATCH (u:user)<-[r:MEMBER]-(g)',
				'RETURN collect(distinct id(u))'
			].join('\n');

			var groupQueryParam = {
				groupIdParam: groupIds
			};
		}

		var usersInGroups = [];
		var usersInGroupsPromise = new Promise(function(resolve, reject){
			if (matchAllGroups || matchAllUsers) {
				return resolve([]);
			}

			db.query(query, groupQueryParam, function(error, result){
				if (error) {
					console.log('[ERROR] Attempt to fetch filtered contributions by /api/contributions failed.\nReason: Failed match for group ids: ' + groupIds);
					reject('[ERROR] Attempt to fetch filtered contributions by /api/contributions failed.\nReason: Failed match for group ids: ' + groupIds);
				} else {
					console.log('[SUCCESS] Success in getting users for the group ids: ' + groupIds);
					resolve(result[0]);
				}
			});
		});

		usersInGroupsPromise
		.then(function(result){
			var dateArray = JSON.parse(req.query[QUERY_PARAM_TIME_KEYWORD]);
			var rateArray = JSON.parse(req.query[QUERY_PARAM_RATING_KEYWORD]);
			var tagsArray = JSON.parse(req.query[QUERY_PARAM_TAGS_KEYWORD]);

			if (dateArray instanceof Array) {
				dateArray = dateArray.map(x => parseInt(x));
			} else {
				dateArray = parseInt(dateArray);
			}

			if (rateArray instanceof Array) {
				rateArray = rateArray.map(x => parseInt(x));
			} else {
				rateArray = parseInt(rateArray);
			}

			if (tagsArray instanceof Array) {
				tagsArray = tagsArray.map(x => parseInt(x));
			} else {
				tagsArray = parseInt(tagsArray);
			}

			var matchAllDates = false;
			var matchAllRatings = false;
			var matchAllTags = false;

			// check type of user filter
			if (specifiedUserIds instanceof Array) {
				// match those in the array only
				var userIdsParam = _.union(specifiedUserIds, result);
			} else {
				// match all users
				var userIdsParam = [];
			}

			// check type of date filter
			if (dateArray instanceof Array) {
				// match according to the array
				var dateLowerParam = dateArray[0];
				var dateUpperParam = dateArray[1];
			} else {
				// match all dates
				matchAllDates = true;
				var dateLowerParam = -1;
				var dateUpperParam = -1;
			}

			// check type of rating
			if (rateArray instanceof Array) {
				// match according to the array
				var rateLowerParam = rateArray[0];
				var rateUpperParam = rateArray[1];
			} else {
				// match all ratings
				matchAllRatings = true;
				var rateLowerParam = 0;
				var rateUpperParam = 5;
			}

			if (tagsArray instanceof Array) {
				// match according to the array
				var tagIdsParam = tagsArray;
			} else {
				// match all tags
				matchAllTags = true;
				var tagIdsParam = [];
			}

			var params = {
				userIdsParam: userIdsParam,
				dateLowerParam: dateLowerParam,
				dateUpperParam: dateUpperParam,
				ratingLowerParam: rateLowerParam,
				ratingUpperParam: rateUpperParam,
				tagIdsParam: tagIdsParam,
				depthParam: parseInt(req.query[QUERY_PARAM_DEPTH_KEYWORD])
			};

			var queryUserGroupTag = 'MATCH ' + (matchAllTags ? '' : '(t:tag)<-[:TAGGED]-') + '(c:contribution)'
															+ (matchAllGroups || matchAllUsers ? '' : '<-[:CREATED]-(u:user)')
															+ ' WHERE true '
															+ (matchAllGroups || matchAllUsers ? '' : ' AND ID(u) IN [' + params.userIdsParam + ']')
															+  (matchAllTags ? '' : (' AND ID(t) IN [' + params.tagIdsParam + ']'));

			var queryLowerRate = params.ratingLowerParam === -1 ? '' : ' AND toInt(c.rating) >= toInt(' + params.ratingLowerParam + ')';
			var queryUpperRate = params.ratingUpperParam === -1 ? '' : ' AND toInt(c.rating) <= toInt(' + params.ratingUpperParam + ')';
			var queryRating = matchAllRatings ? '' : queryLowerRate + queryUpperRate;

			var queryLowerDate = params.dateLowerParam === -1 ? '' : (' AND toInt(c.dateCreated) >= toInt(' + params.dateLowerParam + ')');
			var queryUpperDate = params.dateUpperParam === -1 ? '' : (' AND toInt(c.dateCreated) <= toInt(' + params.dateUpperParam + ')');
			var queryDate = matchAllDates ? '' : (queryLowerDate + queryUpperDate);

			var query = [
				queryUserGroupTag,
				queryRating,
				queryDate,
				'WITH c',
				'MATCH (c)-[*]->(c2:contribution) WITH c, c2',
				'MATCH (c)<-[*0..' + params.depthParam + ']-(c3:contribution)',
				'WITH distinct (collect(c) + collect(c2) + collect(c3)) as combinedContributionsCollection',
				'UNWIND combinedContributionsCollection AS combinedContribution',
				'UNWIND combinedContributionsCollection AS combinedContribution2',
				'MATCH p=(combinedContribution)-[*1]->(combinedContribution2)',
				'RETURN distinct (p)'
			].join('\n');

			console.log(query);

			apiCall(query, function(data) {
				console.log('[SUCCESS] Sucess in fetching filtered contributions in /api/contributions.')
	      return res.send(data);
			});

		})
		.catch(function(reason){
			console.log(reason);
			return res.send(reason);
		});

	})

	/*
	 * Creates a new contribution linked to the current user.
	 *
	 * req.author : profile.user.id;
	 * req.title : Contribution's Title
	 * req.body : Contribution's Content
	 * req.tags : Array - Contribution's tags
	 * To-do: Once a new tag is specified for the created contribution, this new tag should be sent to DB as well
	 * 
	 * req.ref : the being created contribution's parent (reply to ... )  
	 * 
	 * Links created:
	 * Reference link - Reference to another contribution (may be normal contribution or root node)
	 * Tag link - Links itself to the tags specified in the req body, creating them if necessary. 
	 *           If tags are created, contribution creator will be set to this tags as the creator of these tags.
	 *
	 */
	.post(auth.ensureAuthenticated, contributionUtil.initTempFileDest, multer({storage: storage.attachmentStorage}).array('attachments'), function(req, res, next){

		// Creating the contribution node, then link it to the creator (user)
		var query = [
			'CREATE (c:contribution {createdBy: {createdByParam}, title: {contributionTitleParam},'
			+ ' body: {contributionBodyParam}, ref: {contributionRefParam}, lastUpdated:{lastUpdatedParam},'
			+ ' dateCreated: {dateCreatedParam}, edited: {editedParam}, contentType: {contentTypeParam},'
			+ ' rating: {ratingParam}, totalRating: {totalRatingParam}, rateCount: {rateCountParam}, tags: {tagsParam}, views: {viewsParam}}) WITH c',
			'MATCH (u:user) WHERE id(u)={createdByParam}',
			'CREATE (u)-[r:CREATED]->(c) WITH c',
			'MATCH (c1:contribution) where id(c1)={contributionRefParam}',
			'CREATE (c)-[r1:' + (req.body.refType || "RELATED_TO") +']->(c1) WITH c',
			'UNWIND {tagsParam} as tagName '
						+ 'MERGE (t:tag {name: tagName}) '
						+ 'ON CREATE SET t.createdBy = {createdByParam}'
						+ 'CREATE UNIQUE (c)-[r2:TAGGED]->(t) ',
			'RETURN id(c) as id'
		].join('\n');

		var currentDate = Date.now();
		var params = {
			createdByParam: parseInt(req.user.id),
			tagsParam: req.body.tags,
			contributionTitleParam: req.body.title,
			contributionBodyParam: req.body.body,
			contributionRefParam: parseInt(req.body.ref), 
			lastUpdatedParam: currentDate,
			dateCreatedParam: currentDate,
			refTypeParam: req.body.refType || "RELATED_TO", 
			editedParam: false,
			contentTypeParam: req.body.contentType,
			ratingParam: 0,
			totalRatingParam: 0,
			rateCountParam: 0,
			viewsParam: 0
		};

		/*
		 *	Only to allow creationg of synthetic data; 
		 *	Changes creating user from actual user to user specified;
		 *	!! Remove in production
		 * 
		 */
		if(auth.ensureSuperAdmin && req.body.author && req.body.createdAt){

			params.createdByParam = parseInt(req.body.author);		// remove in production
			params.dateCreatedParam = new Date(req.body.createdAt).getTime();
			params.lastUpdatedParam = new Date(req.body.createdAt).getTime();
		}

		
		db.query(query, params, function(error, result){
			if (error){
				console.log('[ERROR] Error creating new contribution for user : ', error);
				res.status(500);
				return res.send('error');
			}
			else{
				console.log('[SUCCESS] Success in creating a new contribution for user id: ' + req.user.id);
				req.contributionId = result[0].id;
				next();
			}
		}); 

	}, contributionUtil.updateDatabaseWithAttachmentsAndGenerateThumbnails);

// route: /api/contributions/:contributionId
router.route('/:contributionId')
	// Get a specific contribution details by its id: contribution content, contribution statistics & author information
	.get(auth.ensureAuthenticated, function(req, res){

		var query = [
			'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
			'RETURN c'
		].join('\n');

		var params = {
			contributionIdParam: parseInt(req.params.contributionId)
		};

		db.query(query, params, function(error, result){
			if (error)
				console.log('[ERROR] Error fetching contribution of id: ' + req.params.contributionId);
			else{
				console.log('[SUCCESS] Success in getting the contribution details for contribution id: ' + req.params.contributionId);
				res.send(result[0]);
			}
		});

	})

	.put(auth.ensureAuthenticated, function(req, res){

		var query = [
			'MATCH (c:contribution) WHERE ID(c)=' + req.params.contributionId,
			'RETURN c'
		].join('\n');

		var params;
		var oldRef; // previous ref of the contribution

		// Check the current contribution ref
		var contributionPromise =  new Promise(function(resolve, reject){
			db.query(query, function(error, result){
				if (error){
					return reject();
				}
				else {
					return resolve(result[0]);
				}
			});
		});

		contributionPromise
		.then(function(result){
			var oldRef = result.ref;
			var newRef = req.body.ref;

			var oldTags = result.tags;
			var newTags = req.body.tags || [];

			var createdBy = result.createdBy;
			var changeRelationQuery = [];
			var changeTagsQuery = [];
			var tagsAddQuery = [];
			var tagsRemoveQuery = [];

			if (createdBy !== parseInt(req.user.id)) {
				return res.send('Cannot edit contribution that was not created by you');
			}

			// Changing contribution reference.
			if (oldRef !== newRef) {
				// query to delete old reference relation and create a new ref relation
				changeRelationQuery = [
					'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
					'MATCH (c1:contribution) WHERE ID(c1)=c.ref',
					'MATCH (c)-[r]->(c1)',
					'DELETE r',
					'WITH c',
					'MATCH (c2:contribution) WHERE ID(c2)={contributionRefParam}',
					'CREATE (c)-[r:' + req.body.refType +']->(c2)',
					'WITH c'
				];
			}

			editContributionDetailsQuery = [
				'MATCH (c3:contribution) WHERE ID(c3)={contributionIdParam}',
				'SET c3.title = {contributionTitleParam}',
				'SET c3.body = {contributionBodyParam}',
				'SET c3.tags = {tagsParam}',
				'SET c3.ref = {contributionRefParam}',
				'SET c3.lastUpdated = {lastUpdatedParam}',
				'SET c3.edited = {editedParam}',
				'SET c3.contentType = {contentTypeParam}',
			];

			if (!(oldTags instanceof Array)) {
				oldTags = [oldTags];
			}

			if (!(newTags instanceof Array)) {
				newTags = [newTags];
			}


			var tagsToRemove = _.difference(oldTags, newTags);
			var tagsToAdd = _.difference(newTags, oldTags);

			// remove old tags
			if (tagsToRemove.length > 0) {
				tagsRemoveQuery = [
					'WITH c3',
					'UNWIND {tagsToRemoveParam} as tagToRemove',
					'OPTIONAL MATCH (c3)-[r1:TAGGED]->(t1:tag {name: tagToRemove})',
					'DELETE r1',
					'WITH c3,t1',
					'OPTIONAL MATCH (t1)<-[r2:TAGGED]-()',
					'WITH c3, t1, CASE WHEN count(r2)>0 THEN [] ELSE [1] END as array',
					'FOREACH (x in array | DELETE t1)',
				];
			}

			// add new tags
			if (tagsToAdd.length > 0) {
				tagsAddQuery = [
					'WITH c3',
					'UNWIND {tagsToAddParam} as tagToAdd',
					'MERGE (t2:tag {name: tagToAdd})',
					'ON CREATE SET t2.createdBy = {createdByParam}',
					'CREATE UNIQUE (c3)-[:TAGGED]->(t2)'
				];
			}

			var query = changeRelationQuery.concat(editContributionDetailsQuery, tagsRemoveQuery, tagsAddQuery).join('\n');

			var params = {
				tagsToRemoveParam: tagsToRemove,
				tagsToAddParam: tagsToAdd,
				contributionIdParam: parseInt(req.params.contributionId),
				tagsParam: newTags,
				contributionTitleParam: req.body.title,
				contributionBodyParam: req.body.body,
				contributionRefParam: parseInt(req.body.ref), 
				lastUpdatedParam: Date.now(),
				refTypeParam: req.body.refType,
				editedParam: true,
				createdByParam: req.user.id,
				contentTypeParam: req.body.contentType,
			};

			db.query(query, params, function(error, result){
				if (error){
					console.log(error);
					res.send('[ERROR] Cannot edit the given contribution with id: ' + req.params.contributionId);
				}
				else{
					console.log('[SUCCESS] Success in editing the contribution with id: ' + req.params.contributionId);
					res.send('Success in editing the contribution');
				}
			});

		});
	}) 

	.delete(auth.ensureAuthenticated, function(req, res){

		var incomingRelsCount = 0;

		var params = {
			contributionIdParam: parseInt(req.params.contributionId),
		};

		// First count incoming relationships 
		var countQuery = [
			'MATCH (c:contribution)<-[r]-(:contribution)',
			'WHERE ID(c)={contributionIdParam}',
			'RETURN {count: count(r), createdBy: c.createdBy}'
		].join('\n');

		var countPromise = new Promise(function(resolve, reject){
			db.query(countQuery, params, function(error, result){

				if (error){
					console.log('[ERROR] Error in counting the number of incoming relationships of contribution ' + contributionIdParam);
					res.send('Error counting number of incoming relationships of contribution ' + contributionIdParam);
					reject(error);
				}
				else {
					resolve(result);
				}

			});
		});

		countPromise
		.then(function(result){

			var incomingRelsCount = result.count;
			var isCreator = result.createdBy === parseInt(req.user.id);

			if (!isCreator){
				return res.send('Cannot delete contribution that was not created by you');
			}

			if (incomingRelsCount > 0) {
				return res.send('Cannot delete contribution that is not a leaf node');
			}

			var query = [
				'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
				'OPTIONAL MATCH (c)-[r:TAGGED]->(t:tag)',
				'DETACH DELETE c',
				'WITH t',
				'OPTIONAL MATCH (t)<-[r1:TAGGED]-()',
				'WITH t, CASE WHEN count(r1)>0 THEN [] ELSE [1] END as array',
				'FOREACH (x in array | DETACH DELETE t)'
			].join('\n');

			db.query(query, params, function(error, result){
				if (error) {
					console.log('[ERROR] Error deleting leaf with contribution id ' + req.params.contributionId + ' for this user.');
					res.send('Cannot delete this leaf');
				}
				else {
					res.send('Successfully deleted contribution with id: ' + req.params.contributionid);
				}
			})

		});

	});

// route: /api/contributions/:contributionId/view
router.route('/:contributionId/view')
	.post(auth.ensureAuthenticated, function(req, res){
		var query = [
			'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
			'MATCH (u:user) WHERE ID(u)={userIdParam}',
			'MERGE p=(u)-[r:VIEWED]->(c)',
			'ON CREATE SET r.views = 1',
			'ON MATCH SET r.views = r.views + 1',
			'SET c.views = c.views + 1, r.lastViewed={lastViewedParam}',
			'RETURN p'
		].join('\n');

		var params = {
			contributionIdParam: parseInt(req.params.contributionId),
			userIdParam: req.user.id,
			lastViewedParam: Date.now()
		};

		db.query(query, params, function(error, result){
			if (error){
				console.log(error);
			}
			else{
				res.send('Successfully viewed contribution id: ' + req.params.contributionId);
			}
		});
	});

// route: /api/contributions/:contributionId/rate
router.route('/:contributionId/rate')
	.post(auth.ensureAuthenticated, function(req, res) {
		// might want to add a check for the rating between a range here..
		var givenRating = parseInt(req.body.rating);

		if (givenRating < 0 || givenRating > 5) {
			return res.send('Please give a rating between 0 and 5 inclusive');
		}

		var query = [
			'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
			'MATCH (u:user) WHERE ID(u)={userIdParam}',
			'MERGE p=(u)-[r:RATED]->(c)',
			'ON CREATE SET c.rating = (c.totalRating + {ratingParam})/toFloat(c.rateCount+1), c.rateCount = c.rateCount+1, c.totalRating = c.totalRating + {ratingParam}',
			'ON MATCH SET c.rating = (c.totalRating - r.rating + {ratingParam})/toFloat(c.rateCount), c.totalRating = c.totalRating - r.rating + {ratingParam}',
			'SET r.rating={ratingParam}, r.lastRated={lastRatedParam}',
			'RETURN p'
		].join('\n');

		var params = {
			userIdParam: req.user.id,
			contributionIdParam: parseInt(req.params.contributionId),
			ratingParam: givenRating,
			lastRatedParam: Date.now()
		};

		db.query(query, params, function(error,result){
			if (error) {
				console.log(error);
			}
			else {
				console.log('[SUCCESS] Successfully rated contribution id ' + req.params.contributionId + ' with the rating ' + req.body.rating);
				res.send('Successfully rated contribution id ' + req.params.contributionId + ' with the rating ' + req.body.rating);
			}
		})
	});


//route: /api/contributions/:contributionId/attachments
router.route('/:contributionId/attachments')
	.post(auth.ensureAuthenticated, contributionUtil.ensureUserOwnsContribution, contributionUtil.initTempFileDest, 
	multer({storage: storage.attachmentStorage}).array('attachments'), 
	contributionUtil.updateDatabaseWithAttachmentsAndGenerateThumbnails);

//route: /api/contributions/:contributionId/attachments/:attachmentId
router.route('/:contributionId/attachments/:attachmentId')
	.get(auth.ensureAuthenticated, function(req, res, next){
		
		var query = [
			'OPTIONAL MATCH (c:contribution)-[:ATTACHMENT]-(a:attachment)',
			'WHERE ID(c)={contributionIdParam} AND ID(a)={attachmentIdParam}',
			'RETURN {count: count(a), name: a.name}'
		].join('\n');

		var params = {
			contributionIdParam: parseInt(req.params.contributionId),
			attachmentIdParam: parseInt(req.params.attachmentId)
		};

		var namePromise = new Promise(function(resolve, reject){
			db.query(query, params, function(error, result){
				if (error) {
					return reject('error');
				}

				if (result[0].count === 0) {
					return reject('error');
				}
				return resolve(result[0]);

			});
		});

		namePromise
		.then(function(result){
			var fileName = result.name;
			var filePath = glob.sync('./uploads/contributions/' + req.params.contributionId + '/attachments/'  + fileName);
			res.sendFile(path.resolve(__dirname + '/../') + '/' + filePath[0]);	// sendFile does not like /../  ...
		})
		.catch(function(reason){
			console.log(reason);
			return res.send(reason);
		});

	})

	.delete(auth.ensureAuthenticated, function(req, res, next){
		// factor this out
		// ensure user owns the contribution id first
		// also check the attachment id
		var query = [
			'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
			'WITH c',
			'MATCH (c)-[:ATTACHMENT]->(a:attachment) WHERE ID(a)={attachmentIdParam}',
			'RETURN {contributionCreatorId: c.createdBy, isValidAttachment: count(a), fileName: a.name}'
		].join('\n');

		var params = {
			contributionIdParam: parseInt(req.params.contributionId),
			attachmentIdParam: parseInt(req.params.attachmentId)
		};

		db.query(query, params, function(error, result){
			if (error){
				console.log(error);
				return res.send('error');
			}
			if (result.length === 0) {
				return res.send('error');
			}

			var contributionCreatorId = result[0].contributionCreatorId;
			var isValidAttachment = result[0].isValidAttachment === 1;
			var userId = parseInt(req.user.id);

			if (userId === contributionCreatorId && isValidAttachment) {
				req.fileNameToDelete = result[0].fileName;
				next();
			} else {
				res.send('not the owner');
			}
		});
	}, function(req, res){
		// delete the attachment file and node in db
		var attachmentPath = './uploads/contributions/' + req.params.contributionId + '/attachments/' + req.fileNameToDelete;

		fs.remove(attachmentPath, function(err){
			if (err) {
				console.error(err);
			}
		});

		var query = [
			'MATCH (a:attachment) WHERE ID(a)={attachmentIdParam}',
			'DETACH DELETE a'
		].join('\n');

		var params = {
			attachmentIdParam: parseInt(req.params.attachmentId)
		};

		db.query(query, params, function(error, result){
			if (error) {
				console.log(error);
				res.status(500);
				res.send('error');
			} else {
				res.status(200);
				res.send('success');
			}
		})

	});

//route: /api/contributions/:contributionId/attachments/:attachmentId
router.route('/:contributionId/attachments/:attachmentId/thumbnail')
	.get(auth.ensureAuthenticated, function(req, res, next){
		
		var query = [
			'OPTIONAL MATCH (c:contribution)-[:ATTACHMENT]-(a:attachment)',
			'WHERE ID(c)={contributionIdParam} AND ID(a)={attachmentIdParam}',
			'RETURN {count: count(a), name: a.name}'
		].join('\n');

		var params = {
			contributionIdParam: parseInt(req.params.contributionId),
			attachmentIdParam: parseInt(req.params.attachmentId)
		};

		var namePromise = new Promise(function(resolve, reject){
			db.query(query, params, function(error, result){
				if (error) {
					return reject('error');
				}

				if (result[0].count === 0) {
					return reject('error');
				}
				return resolve(result[0]);

			});
		});

		namePromise
		.then(function(result){
			var fileName = result.name;
			var filePath = glob.sync('./uploads/contributions/' + req.params.contributionId + '/attachments/thumbnails/'  + fileName);
			res.sendFile(path.resolve(__dirname + '/../') + '/' + filePath[0]);	// sendFile does not like /../  ...
		})
		.catch(function(reason){
			console.log(reason);
			return res.send(reason);
		});

	})

module.exports = router;