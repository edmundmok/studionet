d3.json("/api/all", function(error, data) {

    if (error) {
        console.log("error");
        return;
    }

    console.log(data);
    dataset = data
    var nodes = [],
        links = [];
    data.forEach(function(row) {
        row.graph.nodes.forEach(function(n) {
            if (idIndex(nodes, n.id) == null)
                nodes.push({
                    id: n.id,
                    label: n.labels[0],
                    title: setTitle(n)
                });
        });
        links = links.concat(row.graph.relationships.map(function(r) {
            return {
                source: idIndex(nodes, r.startNode),
                target: idIndex(nodes, r.endNode),
                type: r.type
            };
        }));
    });

    var dataset = {
        nodes: nodes,
        links: links
    };

    console.log(dataset);

    drawGraph(dataset);

})




function idIndex(a, id) {
    for (var i = 0; i < a.length; i++) {
        if (a[i].id == id) return i;
    }
    return null;
}


function drawGraph(dataset) {
    var w = 1500, h =1500;

    var force = d3.layout.force()
        .nodes(dataset.nodes)
        .links(dataset.links)
        .size([w, h])
        .linkDistance([190])
        .charge([-600])
        .start();

    // scale graph
    var svg = d3.select("#graph").append("svg")
             //better to keep the viewBox dimensions with variables
            .attr("viewBox", "0 0 " + w + " " + h )
            .attr("preserveAspectRatio", "xMidYMid meet")
            /*.on("click", function(){
                force.nodes(dataset.nodes.push({
                    id: 10000+dataset.nodes.length + "",
                    label: 'test label',
                    title: 'Test Click',
                    x: d3.mouse(this)[0],
                    y: d3.mouse(this)[1]
                }));
                d3.select("svg").remove();
                drawGraph(dataset)

            })*/
             .call(d3.behavior.zoom().on("zoom", function () {
                svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
              }))
              .append("g");

    /* Test Circle
        svg.append("circle")
      .attr("cx", document.body.clientWidth / 2)
      .attr("cy", document.body.clientHeight / 2)
      .attr("r", 50)
      .style("fill", "#B8DEE6")
    */


    var links = svg.selectAll("line")
        .data(dataset.links)
        .enter()
        .append("line")
        .style("stroke", "#ccc")
        .style("stroke-width", 1);


        var readyToLink = false;
        var sourceNode = 1, targetNode = 2;
    var nodes = svg.selectAll("g")
        .data(dataset.nodes)
        .enter()
        .append("g")
        .on("click", function(d){
            d3.event.stopPropagation();
        });

    var circles = nodes.append("circle")
        .attr("r", 40)
        .style("fill", function(d, i) {
            return color(d["label"]);
        })
        .on("click", function(d){
            d3.event.stopPropagation();

            if (readyToLink === false){
            sourceNode=d;
            console.log(d);
            readyToLink = true;
        } else{
            targetNode = d;
            console.log("targeNode: "+targetNode);
            force.links(dataset.links.push({
                source: sourceNode,
                target: targetNode,
                type:""
            }));
            console.log(dataset.links);
            readyToLink = false;
            d3.select("svg").remove();
            drawGraph(dataset);}
        });

    var texts = nodes.append("text")
        .text(function(d) {
            //console.log(d);
            return d["title"];
        });

    //force.drag().on('dragstart', dragstart);

    nodes.call(force.drag().on('dragstart', dragstart));

    function dragstart (d){
        console.log('drag start!');
        d3.event.sourceEvent.stopPropagation();
    }

    force.on("tick", function() {
        links.attr("x1", function(d) {
                return d.source.x;
            })
            .attr("y1", function(d) {
                return d.source.y;
            })
            .attr("x2", function(d) {
                return d.target.x;
            })
            .attr("y2", function(d) {
                return d.target.y;
            });

        circles.attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            });

        texts.attr("x", function(d) {
                return d.x - 30;
            })
            .attr("y", function(d) {
                return d.y + 4;
            });

    });


}

function color(type) {
    if (type === "user") {
        return "green";
    } else if (type === "module") {
        return "orange";
    } else if (type === "contribution") {
        return "blue";
    } else if (type === "file") {
        return "grey";
    } else {
        return "red";
    }
}

function setTitle(n) {
    if (n.labels[0] === "contribution" || n.labels[0]==='post') {
        return n.properties.title;
    } else {
        return n.properties.name;
    }
}