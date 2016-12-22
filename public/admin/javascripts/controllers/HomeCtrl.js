angular.module('studionetAdmin')

.controller('HomeCtrl', ['$scope', '$http', 'groups', 'users', 'tags', 'contributions', 'CONFIG', function($scope, $http, groups, users, tags, contributions, CONFIG){
	
  $scope.app_name = "Studions";

	$scope.users = users.users;
	$scope.tags = tags.tags;
	$scope.contributions = contributions.contributions;
	$scope.groups = groups.groups;

	/*
     * Helper function to convert dates to human readable format
	 */
	$scope.getDateString = function(date){
		return( String(new Date(date)).substr(0,15) )
	}

	$scope.showDetails = function(){
		alert("Details");
	}

/*	$http({
	    method: 'GET',
	    url: '/api/logs'
	}).then(function successCallback(logs) {

        console.log("hello", logs.data);

        var json = [];
        for(var i=0; i < logs.data.length; i++){
        	json.push( {
        		'date' : i, 
        		'close' : Math.random(0, 1)*100
        	})
        }
               

        var svg = d3.select("svg"),
            margin = {top: 20, right: 20, bottom: 30, left: 50},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom,
            g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        //var parseTime = d3.timeParse("%d-%b-%y");

        var x = d3//.scaleTime()
            .rangeRound([0, width]);

        var y = d3//.scaleLinear()
            .rangeRound([height, 0]);

        var line = d3.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.close); });
         
        d3.json(logs.data, function(d) {
          d.date = d.date; //parseTime(d.date);
          d.close = +d.close;
          return d;
        }, function(error, data) {
          if (error) throw error;

          x.domain(d3.extent(data, function(d) { return d.date; }));
          y.domain(d3.extent(data, function(d) { return d.close; }));

          g.append("g")
              .attr("class", "axis axis--x")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x));

          g.append("g")
              .attr("class", "axis axis--y")
              .call(d3.axisLeft(y))
            .append("text")
              .attr("fill", "#000")
              .attr("transform", "rotate(-90)")
              .attr("y", 6)
              .attr("dy", "0.71em")
              .style("text-anchor", "end")
              .text("Price ($)");

          g.append("path")
              .datum(data)
              .attr("class", "line")
              .attr("d", line);
        }); 

	    }, function errorCallback(response) {
	          console.log("Error fetching logs")
		});
*/

}]);

