var multer = require('multer');
var mkdirp = require('mkdirp');
var glob = require('glob');
var path = require('path');
var fs = require('fs');

var storage = {};

storage.avatarStorage = multer.diskStorage({
	destination: function(req, file, cb) {
		var dest = './uploads/users/' + req.user.nusOpenId + '/avatar/';
		var toDelete = glob.sync(dest + 'avatar.*');

		// remove any old avatar if the user uploads a new one
		// probably don't need to delete existing avatar manually since will overwrite
		toDelete.forEach(function(item, index, array){
			fs.unlink(item, function(err){
				if (err) throw err;
			})
		});
		// if folder does not exist, create it
		mkdirp(dest, function(err){
			if (err)
				console.log(err);
			else{
				console.log('created', dest);
				cb(null, dest);
			}
		});
	},
	filename: function(req, file, cb){
		// keep the extension of the avatar
		cb(null, 'avatar' + file.originalname.slice(file.originalname.lastIndexOf('.')));
	}
});

storage.attachmentStorage = multer.diskStorage({
	destination: function(req, file, cb) {
		var dest = req.tempFileDest;

		mkdirp(dest, function(err){
			if (err)
				console.log(err);
			else {
				console.log('created', dest);
				cb(null, dest);
			}
		})
	},
	filename: function(req, file, cb) {
		cb(null, file.originalname);
	}
}); 

module.exports = storage;