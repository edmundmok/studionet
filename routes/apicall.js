var request = require('request');
var inspect = require('eyespect').inspector();

var db_loc = 'http://'+ process.env.DB_USER +':'+ process.env.DB_PASS +'@localhost:7474/db/data/transaction/commit'; 
if(process.env.SERVER_URL != undefined)
    db_loc = 'http://'+ process.env.DB_USER +':'+ process.env.DB_PASS +'@' + process.env.SERVER_URL.slice(7) + '/db/data/transaction/commit'; 

function idIndex(a, id){
  for (var i = 0; i < a.length ; i++) {
    if (a[i].id === id) {
      return a[i];
    }
  }
  return null;
}

function setName(n) {
    if (n.labels[0] === "contribution") {
        return n.properties.title;
    } else {
        return n.properties.name;
    }
}

function apiCall(query, callback){
  var postData = {
    "statements": [
      {
        "statement": query,
        "resultDataContents": [
          "graph", "row"
        ],
        "includeStats": true
      }
    ]
  };

  var options = {
    method: 'post',
    body: postData,
    json: true,
    url: db_loc
  };

  request(options, function (err, result, body) { 

    if (err) {
      inspect(err, 'error posting json');
      return;
    }
    
    var headers = result.headers;
    var statusCode = result.statusCode;
    //inspect(headers, 'headers')
    //inspect(statusCode, 'statusCode')
    //inspect(body, 'body')

    var nodes = [], links = [];

    var data = body.results[0].data;
      
    data.forEach(function(row){
      // for each graph

      row.graph.nodes.forEach(function(n) {
        n.type = n.labels[0];
        n.name = setName(n);
        if (idIndex(nodes, n.id) == null)
            nodes.push({
                id: n.id,
                type: n.labels[0],
                name: setName(n)
            });
      });
      links = links.concat(row.graph.relationships.map(function(r) {
          return {
              source: idIndex(nodes, r.startNode).id,   // should not be a case where start or end is null.
              target: idIndex(nodes, r.endNode).id,
              name: r.type
          };
      }));
    });

    callback({
      nodes: nodes, 
      links: links
    });

  });

}

module.exports = apiCall;