var express = require('express');
var router = express.Router();
var storage = require('./storage');
var multer = require('multer');
var db = require('seraph')({
	server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
	user: process.env.DB_USER,
	pass: process.env.DB_PASS
});
var auth = require('./auth');

// POST: /uploads/avatar
// Upload a new profile picture
router.post('/avatar', auth.ensureAuthenticated, multer({
	storage: storage.avatarStorage
}).single('avatar'), function(req, res, next){
	// update avatar for user

	var query = [
		'MATCH (u:user) WHERE ID(u)=' + req.user.id,
		'WITH u',
		'SET u.avatar={avatarParam}',
		'RETURN u'
	].join('\n');

	var params = {
		avatarParam: '/uploads/users/' + req.user.nusOpenId + '/avatar'
	};
	
	db.query(query, params, function(error ,result){
		if (error)
			console.log(error);
		else
			res.send(result[0]);
	})

});

// GET: /uploads/:nusOpenId/avatar
// GET user's avatar by nusOpenId param
router.get('/:nusOpenId/avatar', auth.ensureAuthenticated, function(req, res){
	var avatar = glob.sync('./uploads/users/' + req.params.nusOpenId + '/avatar/'  + 'avatar.*');
	if (avatar.length === 0) {
		return res.send('no custom avatar for this user');
	}
	return res.sendFile(path.resolve(__dirname + '/../') +'/' + avatar[0]);	// sendFile does not like /../  ...
});


module.exports = router;
