
/*
 *	Remove in production
 * 	To create synthetic data and check APIs
 *
 * 
 */
angular.module('studionetAdmin').controller('TestCtrl', ['$scope', '$http', function($scope, $http){

	$scope.users = [];
	$scope.tags = [];
	$scope.contributions = [];
	$scope.relationships = [];


	
	var refresh = function(){
		$http.get('/api/users/').success(function(data){
			$scope.users = data;
		});		

		$http.get('/api/tags/').success(function(data){
			$scope.tags = data;
		});		


		$http.get('/api/contributions/').success(function(data){
			$scope.contributions = data;
		});	

		$http.get('/api/relationships/').success(function(data){
			$scope.relationships = data;
		});	


		$scope.groupData = { 
		    name: "",
			description: "",
			restricted: false,
			groupParentId: "-1",
			author:  null,
			createdAt: null
		};
	}



	/*
	 *	To create simulated contributions
	 * 
	 */
	//$scope.contributionData = { 'tags' : [], 'title': 'New Contribution', 'body': 'Lorem ipsum Laborum mollit elit tempor eu irure aliqua cillum nisi quis ex dolor aliquip anim exercitation eu aliquip et adipisicing esse ullamco pariatur esse exercitation consequat minim laborum officia voluptate ad elit deserunt ad amet et esse sunt nulla est enim consequat non consectetur Ut Ut dolore laborum id dolore commodo officia deserunt fugiat dolor proident esse occaecat sed labore dolor minim adipisicing ex dolore pariatur nostrud anim consequat esse incididunt nulla officia velit commodo ea velit cillum ea deserunt dolor magna reprehenderit laboris dolor cupidatat velit nulla dolore ut in minim Ut et esse nisi dolor non ex in dolor minim amet nisi cupidatat magna incididunt adipisicing qui dolore dolore et laboris in amet proident mollit sint sit aute qui fugiat nulla voluptate mollit veniam voluptate in in incididunt id sint id veniam est id veniam qui labore mollit proident Ut dolore laborum eu culpa laborum aliquip elit minim cillum ex nostrud id officia eiusmod Excepteur Duis quis veniam magna occaecat aliquip dolor nostrud occaecat consectetur nulla dolore sit nisi exercitation fugiat nostrud Duis ut cupidatat quis laborum officia magna voluptate sit in dolor in voluptate magna voluptate in minim commodo Excepteur in ad aliqua amet Ut Duis amet amet laborum consequat aliquip sit do ex nostrud fugiat id laborum minim culpa consequat elit.' };
	//$scope.contributionData.createdAt = new Date();

	$scope.contributionData = { 'tags': [] };

	$scope.tag = "";
	$scope.addTag = function(tag){

		$scope.contributionData.tags.push(tag || $scope.tag)
		$scope.tag = "";
	}

	$scope.createNewContribution = function(){

		$scope.contributionData.contentType  = "text";

		$http({
				  method  : 'POST',
				  url     : '/api/contributions/',
				  data    : $scope.contributionData,  // pass in data as strings
				  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
				 })
				.success(function(data) {
				    
					alert("Contribution Created");  
					refresh();  

				})
		
	}


	/*
	 *	To create simulated groups
	 * 
	 */
	$scope.groupData = { 
		    name: "",
			description: "",
			restricted: false,
			groupParentId: "-1",
			author:  null,
			createdAt: null
	};

	$scope.createNewGroup = function(){
		
		$http({
				  method  : 'POST',
				  url     : '/api/groups/',
				  data    : $scope.groupData,  // pass in data as strings
				  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
				 })
				.success(function(data) {
				    
					alert("Group Created", JSON.stringify(data));  
					refresh();  

				})

	}


	/*
     *
     *	Create new user
     *
     * 
	 */
	$scope.userDataJSON = "";
	$scope.userData = { 
		    name: "",
			nusOpenId: "",
			addedBy: "",
			addedOn: "",
			isAdmin: false
	};

	$scope.createNewUser = function(){

		if($scope.userDataJSON){
			// different post requests for each user
			if( eval($scope.userDataJSON) ){
				var users =  eval($scope.userDataJSON);
				for(var i=0; i < users.length; i++){

					var user = users[i];
					var userData = {
						name :  user.name, 
						nusOpenId: user.nusOpenId, 
						addedBy: $scope.userData.addedBy,
						addedOn: $scope.userData.addedOn,
						isAdmin: false
					}
					postUser(userData);

				}
			}
			else{
				alert("Invalid data");
			}
			
		}
		else{

			postUser($scope.userData);
			
		}

		function postUser(user){
			$http({
					  method  : 'POST',
					  url     : '/api/users/',
					  data    : user,  
					  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
					 })
					.success(function(data) {
					    
						alert("User Created");  
						refresh();  

					})
		}

	}

	/*
	 * 		Create new link
	 */
	$scope.linkData = {	};
	$scope.createLink = function(){

			$http({
					  method  : 'POST',
					  url     : '/api/relationships/',
					  data    : $scope.linkData,  
					  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
					 })
					.success(function(data) {
					    
						alert("Link Created");  
						refresh();  

					})

	}






	refresh();

}]);