var mkdirp = require('mkdirp');
var glob = require('glob');
var path = require('path');
var fs = require('fs-extra');
var gm = require('gm');
var _ = require('underscore');
var mmm = require('mmmagic'),
      Magic = mmm.Magic;
var db = require('seraph')({
	server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
	user: process.env.DB_USER,
	pass: process.env.DB_PASS
});

module.exports.initTempFileDest = function(req, res, next) {
	req.tempFileDest = './uploads/users/' + req.user.id + '/temp/' + Date.now();
	next();
}

module.exports.ensureUserOwnsContribution = function(req, res, next){
	// ensure user owns the contribution id first
	var query = [
	'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
	'RETURN c.createdBy as id'
	].join('\n');

	var params = {
		contributionIdParam: parseInt(req.params.contributionId)
	};

	db.query(query, params, function(error, result){
		if (error){
			console.log(error);
			res.send('error');
		} else {
			var contributionCreatorId = result[0].id;
			var userId = parseInt(req.user.id);

			if (userId === contributionCreatorId) {
				next();
			} else {
				res.status(500);
				res.send('not the owner');
			}
		}
	});
}

module.exports.updateDatabaseWithAttachmentsAndGenerateThumbnails = function(req, res, next){
	// add attachments (can have multiple..)

	var contributionId = parseInt(req.contributionId || req.params.contributionId);

	if (req.files.length === 0) {
		res.status(200);
		return res.send('success');
	}

	// move the files
	var tempFileDest = req.tempFileDest;
	var attachmentsDest = './uploads/contributions/' + contributionId + '/attachments/';

	var transferPromise = new Promise(function(resolve, reject){
		// can factor this out also..
		fs.copy(tempFileDest, attachmentsDest, function(err){
			if (err) {
				console.error(err);
			} else {
				fs.remove(tempFileDest, function(err){
					resolve();
				})
			}
		});
	})
	.then(function(){

		return new Promise(function(resolve, reject){
			var createQueries = req.files.map((f, idx) =>
				' CREATE (a' + idx + ':attachment {dateUploaded: ' + Date.now() + ', size: ' + f.size + ', name: "' + f.filename + '", thumb:false })' +
				' WITH u, c, a' + idx + 
				' CREATE (u)-[:UPLOADED]->(a' + idx + ')' +
				' WITH a' + idx + ',c,u' +
				' CREATE (a' + idx + ')<-[:ATTACHMENT]-(c)'
				);

			var query = [
			'MATCH (u:user) WHERE ID(u)={userIdParam}',
			'WITH u',
			'MATCH (c:contribution) WHERE ID(c)={contributionIdParam}',
			'WITH u, c'
			];

			var returnQuery = req.files.reduce(function(acc, f, idx){
				return acc + (idx === 0 ? ' ' : '+') + 'collect(id(a' + idx + '))';
			}, 'RETURN ');

			returnQuery += ' as id';

			query = query.concat(createQueries, returnQuery);
			query = query.join('\n');

			var params = {
				userIdParam: req.user.id,
				contributionIdParam: contributionId
			};

			db.query(query, params, function(error, result){
				if (error){
					console.log(error);
					res.status(500);
					res.send('error in uploading file as attachment');
				} else {
					res.status(200);
					res.send('success');
					resolve(result[0]);
				}
			});
		});

	})
	.then(function(idArray){
		// handle the thumbnail generation here
		var magic = new Magic(mmm.MAGIC_MIME_TYPE);
		req.files.map((f, idx) => {
			magic.detectFile(attachmentsDest + f.filename, function(err, result) {
				if (err) {
					console.log(err);
					return;
				}

				var isImage = result.split("/")[0] === "image";
				if (!isImage) {
					return;
				}

	      // create the /thumbnails folder if not exist yet
	      mkdirp(attachmentsDest + '/thumbnails/', function(err){
	      	if (err)
	      		console.log(err);
	      });

	      gm(attachmentsDest + f.filename)
	      .resize(300, 300, '^')
	      .gravity('Center')
	      .crop(200, 200)
	      .quality(100)
	      .write(attachmentsDest + '/thumbnails/' + f.filename, function(error){
	      	if (error) 
	      		console.log('error!!! for : ' + f.filename);
	      	else{
	      		var query = [
	      		'MATCH (a:attachment) WHERE ID(a)={attachmentIdParam}',
	      		'SET a.thumb = true'
	      		].join('\n');

	      		var params = {
	      			attachmentIdParam: idArray[idx],
	      		}

	      		db.query(query, params, function(error, result){
	      			if (error)
	      				console.log(error);
	      		});
	      	}
	      });
	    });
		})

	});
}