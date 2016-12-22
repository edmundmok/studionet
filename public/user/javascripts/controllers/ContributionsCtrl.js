angular.module('studionet')

/*
 *  Main Contribution Graph Page
 * 
 */
.controller('ContributionsCtrl', ['AppContextService','$scope', 'supernode', 'users', 'Upload', '$timeout', 'ModalService', 'contributions', function(AppContextService, $scope, supernode, users, Upload, $timeout, ModalService, contributions){

  /* todo: reset graph so top bar knows about the graph */
  AppContextService.setGraph(true);
  //console.log(AppContextService);

	//$scope.user = profile.user;
  $scope.users = users.usersById();   // needed for hover to get user name - fix later


  /*
   *    Graph Creation & Interactions
   */
  $scope.graphInit = function(graph_data){
      
      // takes either data from filters or contribution.graph data
      $scope.graph = STUDIONET.GRAPH.makeGraph( graph_data || contributions.graph, 'cy' );
      var cy = $scope.graph;

      cy.on('mouseover','node', function(evt){

          var node = evt.cyTarget;

          /* 
           *  Highlight connections
           * 
           */
          cy.elements().removeClass('highlighted');
          cy.elements().removeClass('selected');
          cy.elements().addClass('faded');

          node.addClass('selected');
          node.removeClass('faded');
          node.successors().addClass('highlighted');
          node.successors().removeClass('faded');
          node.predecessors().addClass('highlighted');
          node.predecessors().removeClass('faded');

          /*
           * Get node data and construct qTip
           */

          var data = node.data();

          var qtipFormat = STUDIONET.GRAPH.qtipFormat(evt);

          if(data.id == supernode.contribution){
              qtipFormat.content.title = "Studionet Root Node";
              qtipFormat.content.text = "This is the root node for Studionet."; 
              
              node.qtip(qtipFormat, evt); 
          }
          else{

            // fix me
            var route = "/api/" + data.type + "s/" + data.id;
            $.get( route , function( extra_data ) {
                  var content = "<b>" +  angular.element($('.graph-container')).scope().users[ extra_data.createdBy ].name  + "</b>" +
                                "<br><em>" + (new Date(extra_data.dateCreated)).toString().substr(0, 10) + "</em>" +
                                "<br>" + extra_data.body.substr(0,300)

                  qtipFormat.content.title =  extra_data.title;
                  qtipFormat.content.text = content;

                  node.qtip(qtipFormat, evt);   
            });
          }
      });

      cy.on('mouseout','node', function(evt){
          cy.elements().removeClass('faded');
      });

      cy.on('tap', 'node', function(evt){

        cy.elements().removeClass('highlighted');
        var node = evt.cyTarget;
        var data = node.data();
        var directlyConnected = node.neighborhood();
        node.addClass('selected');
        directlyConnected.nodes().addClass('highlighted');
        node.connectedEdges().addClass('highlighted');


        if(data.type == 'contribution'){
             var predecessors = node.predecessors();
             var successors = node.successors();
             var nodeTree = [];
             for(var i = predecessors.nodes().length - 1; i >= 0; i--){
               //Recursively get edges (and their sources) coming into the nodes in the collection (i.e. the incomers, the incomers' incomers, ...)
               var nodeItem = predecessors.nodes()[i];
               if(nodeItem.data().type == 'contribution'){
                  nodeTree.push(nodeItem.data());
                  console.log(nodeItem.data());
                }
             }
             nodeTree.push(data);
             successors.nodes().forEach(function(nodeItem){
                //Recursively get edges (and their targets) coming out of the nodes in the collection (i.e. the outgoers, the outgoers' outgoers, ...).
                if(nodeItem.data().type == 'contribution'){
                  nodeTree.push(nodeItem.data());
                  console.log(nodeItem.data());
                }
             })

             var RecursiveGetData = function(index){
                var route = "/api/" + nodeTree[index].type + "s/" + nodeTree[index].id;
                $.get( route , function(result) {
                    //console.log("test on clicking onto a contribution");
                    nodeTree[index].db_data = result;
                    if(index == nodeTree.length - 1){
                      angular.element($('.graph-container')).scope().showDetailsModal(nodeTree, data.id);

                      //Mouse out the clicked node once it enters the modal page
                      cy.elements().css({ content: " " });
                      cy.elements().removeClass('highlighted');
                      cy.elements().removeClass('selected');

                      if(cy.$('node:selected')){
                        $('#content-block-hover').html("");
                        $('#content-block-hover').hide();    
                      }
                    }
                    else{
                      RecursiveGetData(++index);
                    }
                });
             };

             RecursiveGetData(0);
        }
      });
  }

  /* 
   *    Nav Controls
   */
  $scope.resetGraph = function(){
      $scope.graph.layout().stop(); 
      layout = $scope.graph.elements().makeLayout({ 'name': 'cola'}); 
      layout.start();   
  }

  $scope.createNewContribution = function(){
    alert("Creates a new contribution");
  }


  /*
   *
   *  Contribution Details
   *
   * 
   */
  $scope.showDetailsModal = function(data, clickedContributionId) {

      ModalService.showModal({
        templateUrl: "/user/templates/home.graphView.modal.html",
        controller: "DetailsModalCtrl",
        inputs: {
          title: "A More Complex Example"
        }
      }).then(function(modal) {
        modal.element.modal({
          backdrop: 'static'
          // keyboard: false
        });

        /// set data
        modal.scope.setData(data,clickedContributionId);
        
        // modal.close.then(function(result) {
        //   //$scope.complexResult  = "Name: " + result.name + ", age: " + result.age;
        // });


      });

  };




}])

