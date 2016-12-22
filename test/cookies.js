//During the test the env variable is set to test
process.env.NODE_ENV = 'test';
process.env.SERVER_URL = 'http://localhost:7474/'; // run tests on local db
process.env.DB_USER = 'neo4j';
process.env.DB_PASS = 'password';

var db = require('seraph')({
	server: process.env.SERVER_URL || 'http://localhost:7474/', // 'http://studionetdb.design-automation.net'
	user: process.env.DB_USER,
	pass: process.env.DB_PASS
});

// remember to load a temporary database

//Require the dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var app = require('../app');
var should = chai.should();
var assert = chai.assert;
var expect = chai.expect;
var request = require('supertest');
var agent = request.agent(app);

var inspect = require('eyespect').inspector();

var csvUrl = "https://raw.githubusercontent.com/edmundmok/studionet/master/test/testdata.csv";

var testUser = {
	username: 'USER1',
	password: '123'
}

describe('Cookies test', function() {

	// Before each test we empty the database and add the test user
	
	before(function(done) {

		var deletePromise = new Promise(function(resolve, reject){
			var query = [ 
				'START n=node(*)',
				'OPTIONAL MATCH (n)-[r]-()',
				'DELETE n,r'
			].join('\n');

			db.query(query, function(error, result) {
				if (error){
					console.log(error);
					reject(error);
				}
				else {
					resolve();
				}
			});
		});

		deletePromise
		.then(function(){

			return new Promise(function(resolve, reject){
				var query = [ 
					'LOAD CSV WITH HEADERS FROM "' + csvUrl + '" AS row',
					'CREATE (u:user {nusOpenId: row.nusOpenId, canEdit: (case row.canEdit when "1" then true else false end)',
					', name: row.name, isAdmin: (case row.isAdmin when "1" then true else false end), addedBy: toInt(row.addedBy)',
					', addedOn: toInt(row.addedOn), avatar: row.avatar, joinedOn: toInt(row.joinedOn)',
					', lastLoggedIn: toInt(row.lastLoggedIn)})',
					'RETURN u'
				].join('\n');

				db.query(query, function(error, result) {
					if (error){
						console.log(error);
						reject(error);
					}
					else{
						resolve();
					}
				});
			});

		})
		.then(function(){

			return done();

		});

	});

	/**
	 * GET /api/profile
	 */
	describe('Should be able to login and persist cookies between requests', function() {
		
		it('It should allow me to login', function(done){
			agent
				.get('/auth/basic')
				.auth(testUser.username, testUser.password)	// openid of test acc, any pw
				.end(function(err, res){
					expect(res).to.have.status(302);
					expect(res).to.redirectTo('/');
					var loginCookie = res.headers['set-cookie'];
					console.log(loginCookie);
					return done();
				});
		});

		
		it('It should allow me to get all users in the db', function(done) {
			agent
				.get('/api/users')
				.end(function(err, res){
					expect(res).to.have.status(200);
					return done();
				});
		});
		
	});


});