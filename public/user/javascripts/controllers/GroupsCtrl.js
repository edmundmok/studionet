angular.module('studionet')

/*
 *	Controller for Groups
 * 
 */
.controller('GroupsCtrl', ['$scope', 'profile', 'groups', 'users', 'group', '$http', function($scope, profile, groups, users, group, $http){

	/*
	 * Scope Variables
	 */
	$scope.user = profile.user;
	$scope.groups = groups.groups;
	$scope.users = users.usersById();

	$scope.graph = {};

	/*
	 * Graph Creation and Interactions
	 */

	var onTap = function(evt){
		
		if(evt.cyTarget.data().type == "USER"){
			console.log("you clicked on a user");
		}
		else{

			// remove other users
			var collection = $scope.graph.elements("node[type = 'USER']");
			$scope.graph.remove( collection );
			 
			if( evt.cyTarget.data().supernode ){
				return; 
			}
			else{

				// fix me
				group.getGroupInfo(evt.cyTarget.data().id).then( function(){

					// explode the node to show users
					group.getGroupUsers(evt.cyTarget.data().id)
					.then(function(){

						for (var i=0; i<group.users.length; i++) {

							group.users[i].type = "USER";

							var node = { group: "nodes", data: group.users[i] };
							var edge = { group: "edges", data: { source: evt.cyTarget.data().id, target: group.users[i].id } }

						    $scope.graph.add([ node, edge ]);
						    $scope.graph.layout().stop(); 
						    layout = $scope.graph.elements().makeLayout({ 'name': 'cola'}); 
						    layout.start();

						   	// change css of user-nodes
						    $scope.graph.nodes().map(function(node){ 
						    	if(node.data().type == "USER"){ 
						    		node.css({'background-color':'red', 'width': 10, 'height': 10}) 
						    	} 
						    })
						}

					});
				})
				
			}
			
		}
	}

	var onHover = function(evt){

	    if(evt.cyTarget.data().supernode)
	    	return;

		// update the service
	    var node = evt.cyTarget;
	    var nodeData = node.data();

	    var qtipFormat = STUDIONET.GRAPH.qtipFormat(evt);

	    qtipFormat.content.title = nodeData.name;
	
	    // change content text for users
	    if(nodeData.type == "USER"){
	    	qtipFormat.content.text = "<center><img " + 
	    				   "style='width: 80px; height: 80px; display: inline-block;' " +
	    				   "src=' " + nodeData.avatar + "'><br>" + 
	    				   "<b>About the User</b><br>Lorem ipsum Incididunt et laborum cillum officia reprehenderit minim laborum sint aliquip aliqua elit dolor.";

	    	qtipFormat.style.width = '180px';

	    }
	    else{
			qtipFormat.content.text +="<p>" + nodeData.description.substr(0,100)  +  "</p>"
						+ "<p><b>Status:</b> " + ( nodeData.requestingUserStatus || "Not Joined" ) + "</p>" + 
	         		  "<button class='btn btn-link btn-sm pull-right qtip-btn' onclick='viewGroup(" + nodeData.id +")'>More</button></p>"
	    }

	    node.qtip(qtipFormat, evt);		
	}


	$scope.graphInit = function(graph_data){
	  
	  	// fix
		/*		profile.getGroups().then( function(){ 

			groups.getAll().then( function(){

				groups.getGraph().then(function(){

						// creating the grpah
						var graph = makeGraph( groups.graph, 'user-graph', createGraphNode);
						
						// add interactions 
						graph.on('tap', 'node', function(evt){ onTap(evt); })
						graph.on('mouseover', 'node', function(evt) { onHover(evt); });

						// attach it to the scope
						$scope.graph = graph;


			            graph.minZoom(0.5);
			            graph.maxZoom(1.5);
			    })

			})
		});*/

		// takes either data from filters or contribution.graph data
		$scope.graph = STUDIONET.GRAPH.makeGraph( graph_data || groups.graph, 'user-graph' );
		var cy = $scope.graph;

		cy.on('mouseover','node', function(evt){		onHover(evt);		});
		cy.on('mouseout','node', function(evt){				});
		cy.on('tap','node', function(evt){		onTap(evt);		});

	}

	/*
     *	
     *	Modal Functions & Graph Interactions
     *	
	 */
	
	$scope.resetGraph = function(){
	    $scope.graph.layout().stop(); 
	    layout = $scope.graph.elements().makeLayout({ 'name': 'cola'}); 
	    layout.start();		
	}

	$scope.createGroup = function(){ 
		angular.element($("#createGroupModal")).scope().reset();
		$("#createGroupModal").modal(); 
	}

	viewGroup = function(group_id){  
		angular.element($("#viewGroupModal")).scope().reset();
		group.getGroupInfo(group_id).then( function(){ 
			$("#viewGroupModal").modal();
		})
	}

	$scope.editGroup = function( group_id ){	
		angular.element($("#editGroupModal")).scope().reset();
		group.getGroupInfo(group_id).then( function(){
			group.getGroupUsers(group_id).then( function(){
				$("#editGroupModal").modal();
			})
		})
	}


}]);



/*
 *
 *	Modal Controllers
 *		
 */


// Group Creation Controller
angular.module('studionet').controller('CreateGroupCtrl', ['$scope', 'groups', 'supernode', function($scope, groups, supernode){

	$scope.groupCreated = false; 
	$scope.groupError = false;

	$scope.newGroupId = undefined;


	$scope.group = {
		groupParentId: supernode.group
	};

	$scope.createGroup = function(){

		groups.createNewGroup($scope.group).then( function(data){
		
			// refresh the graph underneath
			// function present in container scope
			console.log(data);
			$scope.newGroupId = data.id; 
			$scope.$parent.refreshGraph();
			showSuccess();
		
		}, function(error){

			showError();

		});

	}

	$scope.editGroup = function(){
		$scope.$parent.editGroup( $scope.newGroupId  );
	}

	$scope.reset = function(){
		$scope.groupCreated = false; 
		$scope.groupError = false;

		$scope.newGroupId = undefined;	

		$scope.group = {
			groupParentId: supernode.group
		};	
	}

	var showSuccess = function(){

		$scope.groupCreated = true;
		$scope.groupError = false;
		
	}

	var showError = function(){
		$scope.groupError = true;
	}


}]);


// Edit Groups Controller
angular.module('studionet').controller('EditGroupCtrl', ['$scope', 'groups', 'group', 'supernode', 'users', function($scope, groups, group, supernode, users){

	// get group info
	$scope.activeGroup = group.group; 
	// get members
	$scope.group_users = group.users;
	$scope.members = users.users; 

	$scope.status = {};

	$scope.isMember = function(id){

		for(var i=0; i < $scope.group_users.length; i++){

			if(id == $scope.group_users[i].id)
				return true;
		}

		return false;

	}

	$scope.add = function(id){

		group.addGroupMember({ users: [id] }).then(function(){
			//alert("User added");
		})

	}

	$scope.remove = function(id){

		group.removeGroupMember({ users: [id] }).then(function(){
			//alert("User removed");
		})
	}

	$scope.saveGroup = function(){

		group.updateGroup($scope.activeGroup).then( function(data){
		
			// refresh the graph underneath
			// function present in container scope
			$scope.$parent.refreshGraph();

			showSuccess();
		
		}, function(error){

			showError();

		});

	}

	var showSuccess = function(msg){
		$scope.status.value = true;
		$scope.status.msg = msg || "Group edited." 
	}

	var showError = function(){
		$scope.status.value = false;
		$scope.status.msg = "Error occured while editing group." 
	}

	$scope.reset = function(){
		$scope.status = {};
	}

}]);



// View Group Controller
angular.module('studionet').controller('ViewGroupCtrl', ['$scope', 'profile', 'group', function($scope, profile, group){

	// check if scope has active group
	$scope.activeGroup = group.group; 

	$scope.members = group.users;

	$scope.active = 0; 
	$scope.error = undefined;
	$scope.success = undefined; 

	$scope.reset = function(){
		$scope.active = 0; 
		$scope.error = undefined;
		$scope.success = undefined; 
	}

	$scope.deleteGroup = function(){
		group.deleteGroup().then(function(){
				showSuccess();

				$scope.$parent.refreshGraph();


		}, function(){
				showError();
		});

	}

	$scope.editGroup = function(){
		$scope.$parent.editGroup( $scope.activeGroup.id );
	}


	$scope.joinGroup = function(){
		group.joinGroup().then( function(data){
			showSuccess("Successsfully joined the group", data); 
			$scope.$parent.refreshGraph();
		});
	}

	$scope.leaveGroup = function(){
		group.leaveGroup().then( function(data){
			showSuccess("Successsfully left the group", data); 
			$scope.$parent.refreshGraph();
		});
	}


	var showSuccess = function(msg){

		$scope.success = true;
		$scope.error = false;
		$scope.successMsg = msg || "Group has been deleted."
		
	}

	var showError = function(){
		$scope.error = true;
	}

}]);

