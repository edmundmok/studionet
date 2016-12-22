var STUDIONET = {};
STUDIONET.GRAPH = {};

/*
 * qTip format for hover functions
 *
 */
STUDIONET.GRAPH.qtipFormat = function(evt){
  return {
     content: { title: "", text:""  },
     show: {
        evt: evt.type,
        ready: true,
        solo: true
     },
     hide: {
        evt: 'mouseout',
     },
     position: {
        //container: $('div.graph-container'),
        my: 'top left',
        at: 'center center'
     },
     events: {
                    //this hide event will remove the qtip element from body and all assiciated events, leaving no dirt behind.
                    hide: function(event, api) {
                        api.destroy(true); // Destroy it immediately
                    }
     },
     style: {
        classes: 'qTipClass',
        width: 200 // Overrides width set by CSS (but no max-width!)
     }
  }
}

/*
 * Layout options
 */
var COLA_GRAPH_LAYOUT = { name : 'cola', padding: 10 };
var GRID_GRAPH_LAYOUT = { name : 'grid' };
var DAGRE_GRAPH_LAYOUT = { name : 'dagre' };
var CIRCLE_GRAPH_LAYOUT = { name : 'circle' };
var COSE_GRAPH_LAYOUT = { name: 'cose', padding: 15, randomize: true };
var CONCENTRIC_GRAPH_LAYOUT = {  name: 'concentric', 
                                  concentric: function( node ){
                                    return node.degree();
                                  },
                                  levelWidth: function( nodes ){
                                    return 1;
                                  }};
/*
 * Cytoscape Specific Styles
 */
var graph_style = {

      hideLabelsOnViewport: false,

      layout: COLA_GRAPH_LAYOUT,
      
      style: 
        cytoscape.stylesheet()
          
          .selector('node')
            .css({
              'text-valign': 'bottom',
              'font-size':'1em',
              'font-weight': '300',
              'border-color': '#222',
              'content' : 'data(name)',
              'text-wrap' : 'wrap',
              'text-max-width': '100',
              'text-valign': 'bottom',
            })

          .selector('edge')
            .css({
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              //'content' : 'data(name)',
              'color': '#222',
              'edge-text-rotation': 'autorotate',
            })     
           
          .selector('.selected')
            .css({
              'border-width': 3.5,
              'border-color': '#333',
              'font-size': '15%'
            })
          
          .selector('.faded')
            .css({
              'opacity': 0.75,
              'text-opacity': 0.25
            })
          
          .selector('.highlighted')
            .css({
              'line-color': 'green',
              'target-arrow-color':'green',
              'background-color': 'blue',
              'border-width': 3.5              
            })

          .selector('.searched')
            .css({
              'line-color': 'blue',
              'target-arrow-color':'black',
              'background-color': 'blue',
              'border-width': 0.5,
              'border-color': '#333',
            })

}

/*
 * Converts normal node from backend into cytoscape-specific format
 */
var createGraphNode = function(node){    return  { data: node };   }

/*
 * Converts normal edge from backend into cytoscape-specific format
 */
var createGraphEdge = function(edge){    return { data: edge };   }


/*
 * Helper Functions
 * Stackoverflow source
 */
function randomColors(total){
    var i = 360 / (total - 1); // distribute the colors evenly on the hue range
    var r = []; // hold the generated colors
    for (var x=0; x<total; x++)
    {
        r.push(hsvToRgb(i * x, 100, 100)); // you can also alternate the saturation and value for even more contrast between the colors
    }
    return r;
}

function hsvToRgb(h, s, v) {
  var r, g, b;
  var i;
  var f, p, q, t;
 
  // Make sure our arguments stay in-range
  h = Math.max(0, Math.min(360, h));
  s = Math.max(0, Math.min(100, s));
  v = Math.max(0, Math.min(100, v));
 
  // We accept saturation and value arguments from 0 to 100 because that's
  // how Photoshop represents those values. Internally, however, the
  // saturation and value are calculated from a range of 0 to 1. We make
  // That conversion here.
  s /= 100;
  v /= 100;
 
  if(s == 0) {
    // Achromatic (grey)
    r = g = b = v;
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
 
  h /= 60; // sector 0 to 5
  i = Math.floor(h);
  f = h - i; // factorial part of h
  p = v * (1 - s);
  q = v * (1 - s * f);
  t = v * (1 - s * (1 - f));
 
  switch(i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
 
    case 1:
      r = q;
      g = v;
      b = p;
      break;
 
    case 2:
      r = p;
      g = v;
      b = t;
      break;
 
    case 3:
      r = p;
      g = q;
      b = v;
      break;
 
    case 4:
      r = t;
      g = p;
      b = v;
      break;
 
    default: // case 5:
      r = v;
      g = p;
      b = q;
  }
 
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}


/*
 * Makes the actual graph and defines functionality on the nodes and edges
 * Arguments - 
 *      data - Graph Data
 *      graphContainer - HTML Container for the graph
 *      graphFn - Conversion of nodes in data to cytoscape nodes
 *      edgeFn - Conversion of edges in data to cytoscape edges
 *      graphStyle - Graph Style 
 */
STUDIONET.GRAPH.makeGraph = function(data, graphContainer, graphLayout, graphFn, edgeFn){

    // if cytoscape canvas is defined, assign that
    if(arguments[1] != undefined)
      graph_style.container = document.getElementById(arguments[1]);

    if(arguments[2] != undefined)
      graph_style = graphLayout; 

    if(arguments[3] != undefined)
      createGraphNode = graphFn; 

    if(arguments[4] != undefined)
      createGraphEdge = edgeFn;

    graph_style.elements = {
        nodes: data.nodes.map( function(node){ return createGraphNode(node) } ), 
        edges: data.links.map( function(edge){ return createGraphEdge(edge) } )
    }

    return cytoscape( graph_style );
}