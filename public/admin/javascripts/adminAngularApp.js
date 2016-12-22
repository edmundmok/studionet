var app = angular.module('studionetAdmin', ['ui.router', 'ngResource', 'ngTagsInput']);

app.constant('CONFIG', {
    'APP_NAME' : 'Studionet',
    'APP_VERSION' : '0.0.0'//,
    //'GOOGLE_ANALYTICS_ID' : '',
    //'BASE_URL' : '',
    //'SYSTEM_LANGUAGE' : ''
});

app.config(['$stateProvider', '$urlRouterProvider', 'tagsInputConfigProvider', function($stateProvider, $urlRouterProvider, tagsInputConfigProvider){

	// admin 'routes'
	$stateProvider
		.state('home', {
			url: '/',
			templateUrl: '/admin/templates/home.html',
			controller: 'HomeCtrl',
			resolve: {
				usersPromise: ['users', function(users){
					return users.getAll();
				}],
				// get modules data before page loads
				groupsPromise: ['groups', function(groups){
					return groups.getAll();
				}],
				contributionsPromise: ['contributions', function(contributions){
					return contributions.getAll();
				}],
				tagsPromise: ['tags', function(tags){
					return tags.getAll();
				}]				
			}
		})

		/*
		 *  Should be remove in production; 
		 *  Only for testing purposes to create synthetic data set
		 *  Remove TestCtrl from HomeCtrl file
		 */ 
		.state('testing', {
			url: '/tests',
			templateUrl: '/admin/templates/testing.html',
			controller: 'TestCtrl'
		})

		.state('groups', {
			url: '/groups',
			templateUrl: '/admin/templates/groups.html',
			controller: 'GroupsCtrl',
			resolve: {
				// get groups data before page loads
				groupsPromise: ['groups', function(groups){
					return groups.getAll();
				}]
			}
		})
		.state('contributions', {
			url: '/contributions',
			templateUrl: '/admin/templates/contributions.html',
			controller: 'ContributionsCtrl',
			resolve: {
				// get modules data before page loads
				contributionsPromise: ['contributions', function(contributions){
					return contributions.getAll();
				}]
			}
		})		
		.state('users', {
			url: '/users',
			templateUrl: '/admin/templates/users.html',
			controller: 'UsersCtrl',
			resolve: {
				usersPromise: ['users', function(users){
					return users.getAll();
				}]
			}
		})
		.state('tags', {
			url: '/tags',
			templateUrl: '/admin/templates/tags.html',
			controller: 'TagsCtrl',
			resolve: {
				tagsPromise: ['tags', function(tags){
					return tags.getAll();
				}]
			}
		})

	$urlRouterProvider.otherwise('/');

	tagsInputConfigProvider
		.setDefaults('tagsInput', {
			placeholder: 'Contribution Types'
		});
}]);