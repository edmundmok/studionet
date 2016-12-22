angular.module('studionet')

// todo
.service('AppContextService', function(){
    
    var o = {
    	graph: null
    }

    o.getGraph = function(){
    	//console.log("getting graph");
    	return o.graph;
    }

    o.setGraph = function( graph_value ){
    	o.graph = graph_value;
    	//console.log("setting graph");
    }

    return o; 
})

.factory('supernode', ['$http', function($http){
	var o ={
		group: -1, 
		contribution: -1
	};

	o.getSupernodes = function(){
		return $http.get('/api/supernode').success(function(data){
			o.group = data.groupId; 
			o.contribution = data.contributionId;
		});
	};

	return o;
}])

.factory('profile', ['$http', function($http){
	var o ={
		user: {},
		//groups: [],
		//contributions: [],
		//groupsById: {}
	};

	o.getUser = function(){
		return $http.get('/api/profile/').success(function(data){
			angular.copy(data, o.user);
		});
	};

	// redundant
	o.getGroups = function(){
		console.warn("Shouldn't be using this");
		return $http.get('/api/profile/groups').success(function(data){
			angular.copy(data, o.groups);
		});
	};

	// redundant
	o.getContributions = function(){
		console.warn("Shouldn't be using this");		
		return $http.get('/api/profile/contributions').success(function(data){
			angular.copy(data, o.contributions);
		});
	};


	o.changeName = function(user){

	  	$http({
			  method  : 'PUT',
			  url     : '/api/profile/',
			  data    : user,  // pass in data as strings
			  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
			 })
			.success(function(data) {
				o.user = user;
			})
	}

	o.changePicture = function(){
		
	}

	return o;
}])


.factory('users', ['$http', function($http){

	var o = {
		users: [],
		usersById: {}
	};

	o.getAll = function(){
		return $http.get('/api/users').success(function(data){
			angular.copy(data, o.users);
		});
	};

	o.usersById = function(){

			var arr = {};
			o.users.map(function(user){
				arr[user.id] = user;
			})

			return arr;
	}

	o.createNewUser = function(user){
		return $http.post('/api/users', user).success(function(data){
			o.users.push(data);
		});
	}

	return o;
}])

.factory('tags', ['$http', function($http){

	var o = {
		tags: []
	};

	o.getAll = function(){
		return $http.get('/api/tags').success(function(data){
			angular.copy(data, o.tags);
		});
	};

	return o;
}])


.factory('contributions', ['$http', function($http){

	var o = {
		contributions: [],
		graph: {}
	};

	o.getAll = function(){
		return $http.get('/api/contributions').success(function(data){
			angular.copy(data, o.contributions);
		});
	};

	o.getGraph = function(){
		return $http.get("/graph/all").success(function(data){
			angular.copy(data, o.graph);
		});
	};

	return o;
}])

.factory('groups', ['$http', 'profile', function($http, profile){

	var o = {
		groups: [],
		graph: {}
	};

	o.getAll = function(){
		return $http.get('/api/groups').success(function(data){
			angular.copy(data, o.groups);
		});
	};

	o.getGraph = function(user_context){
		return $http.get('/graph/all/groups').success(function(data){
			// replace the nodes with the groups that already hold data about the user status in each group
			data.nodes = o.groups;
			// copy data
			angular.copy(data, o.graph);
		});
	};

	o.createNewGroup = function(group){
		return $http.post('/api/groups', group).then(function(response){
			
			var data = response.data;

			console.log("new group created", data);
			
			// add the group to the user profile
			profile.groups.push({ id: data.id , name: data.name , role: "Admin" })

			// add group to groups array
			o.groups.push(data);
			
			// correct nodes for graph
			o.graph.nodes = o.groups;

			// handle links for subgroups

			return data; 
		
		}, function(error){

			throw error;
		
		});

	}

	o.updateCreate = function( data ){
		
		// update groups
		groups.groups.push(data);
	}

	o.updateDelete = function( data ){
		// update groups
		groups.groups = groups.groups.filter( function(grp){
			console.log(data, "deleted");
			return grp.id != data.id;
		})
	}

	return o;
}])


.factory('group', ['$http', 'profile', 'groups', 'supernode', 'users', function($http, profile, groups, supernode, users){

	var o = {
		group: {},
		users: [],
		user_status: undefined
	};

	var cache = [];

	o.getGroupInfo = function(id){
		return $http.get('/api/groups/' + id).success(function(data){
					
					data.requestingUserStatus = undefined;

					// fix me - find a better way
/*					for(var i=0; i < profile.user.groups.length; i++){
						if( data.id == profile.groups[i].id ){
								data.requestingUserStatus = profile.groups[i].role;
						}
					}*/

					angular.copy(data, o.group);

					cache[id] = data;



		});		


	};

	o.getGroupUsers = function(id){
		console.log("getting users");
		return $http.get('/api/groups/' + id + '/users').success(function(data){
			angular.copy(data, o.users);

			//o.getGroupPotentials(id);
		});
	};

	/*	o.updateContribution = function(groupDetails){
			return $http.put('/api/groups/'+groupDetails.groupId, groupDetails).success(function(){
				$("#successMsg").show();
				
			});
		};*/

	o.joinGroup = function(){
		return $http.get('/api/groups/' + o.group.id + '/join').success(function(data){
			
			// push the group - id, name, role
			profile.groups.push( {id: o.group.id, name: o.group.name, role: "Member"});

			// fix status in groups & graph
			groups.groups = groups.groups.map(function(group){
				if(group.id == o.group.id){
					group.requestingUserStatus = "Member";
				}

				return group;
			})
			groups.graph.nodes = group.groups;
			
			//
			console.log("joined group", o.group)
		});
	}

	o.leaveGroup = function(){
		return $http.get('/api/groups/' + o.group.id + '/leave').success(function(data){
			
			// remove the group from groups id
			profile.groups = profile.groups.filter( function(obj){ return obj.id!= data.id } );

			// fix status in groups & graph
			groups.groups = groups.groups.map(function(group){
				if(group.id == data.id){
					group.requestingUserStatus = undefined;
				}

				return group;
			})
			//groups.graph.nodes = groups.groups;

			// 
			console.log("Removed from group", data)

		});
	}

	o.addGroupMember = function(data){
		return $http.post('/api/groups/' + o.group.id + '/users', data).success(function(res){
				
			o.group.users.push({ id: data.users[0] })

		});

	};

	o.removeGroupMember = function(data){

		return $http({
		    method: 'DELETE',
		    url: '/api/groups/' + o.group.id + '/users',
		    data: data,
		    headers: {
		        'Content-type': 'application/json;charset=utf-8'
		    }
		}).success( function(res){

			o.group.users = o.group.users.filter( function(user){

				return !(user.id == data.users[0])

			})

		})
	}

	o.updateGroup = function(data){

		return $http({
			  method  : 'PUT',
			  url     : '/api/groups/' + data.id,
			  data    : data,  // pass in data as strings
			  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
			 })
			.success(function(data) {

				//o.getGroupInfo().then( function(){ o.getGroupUsers() });
				console.log("Group edited", data);

				return (data);
			})

	}

	o.deleteGroup = function(){

		return $http.delete('/api/groups/' + o.group.id ).success(function(data){
				
				//groups.updateDelete( data );

		});		
	}

	return o;
}])



.factory('modelsFactory', ['$http', function($http){
	var o = {
		userModels: []
	};

	o.getUserModels = function(nusOpenId){
		return $http.get('/uploads/' + nusOpenId + '/models').success(function(data){
			angular.copy(data, o.userModels);
		});
	}

	return o;
}]);