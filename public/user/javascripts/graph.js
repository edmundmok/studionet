d3.json("javascripts/dummy.json", function(error, data) {

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

    var force = d3.layout.force()
        .nodes(dataset.nodes)
        .links(dataset.links)
        .size([600, 600])
        .linkDistance([190])
        .charge([-600])
        .start();

    var w = 1000, h =1000;

    d3.select("#graph").select("svg")
             //better to keep the viewBox dimensions with variables
            .attr("viewBox", "0 0 " + w + " " + h )
            .attr("preserveAspectRatio", "xMidYMid meet");


    var links = d3.select("#graph").select("svg").selectAll("line")
        .data(dataset.links)
        .enter()
        .append("line")
        .style("stroke", "#ccc")
        .style("stroke-width", 1);


    var nodes = d3.select("#graph").select("svg").selectAll("g")
        .data(dataset.nodes)
        .enter()
        .append("g");

    var circles = nodes.append("circle")
        .attr("r", 40)
        .style("fill", function(d, i) {
            return color(d["label"]);
        });

    var texts = nodes.append("text")
        .text(function(d) {
            //console.log(d);
            return d["title"];
        });

    nodes.call(force.drag);

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
    if (n.labels[0] === "contribution") {
        return n.properties.title;
    } else {
        return n.properties.name;
    }
}