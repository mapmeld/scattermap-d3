var transition_to_map, transition_to_chart;

// prepare for geo
var geopath = d3.geo.path();
var ctrlat, ctrlng, geoscale;

function x(d) { return 1 * d.properties.SALE_YY * 1 + (d.properties.SALE_MM * 1 - 1) / 12 + (d.properties.SALE_DD * 1 - 1) / 31; }
function y(d) { return 1 * d.properties.SALE_PRICE + 1; }
function radius(d) { return 1; }
function color(d) { return decadeColors[ Math.floor(d.properties.SALE_YY / 10) + "0" ]; }
function key(d) { return d.properties.PROP_ADDRE; }

var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 75.5},
    width = 960 - margin.right,
    height = 600 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.linear().domain([1970, 2011]).range([0, width]),
    yScale = d3.scale.log().domain([8000, 42000000]).range([height, 0]);

// The x & y axes.
var toyr = function(e){ console.log(e); return "" + e; };
var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(8),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("most recent sale");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("sale price");

// approximate centroid = average point
var centroid = function(poly, timer, timer_end){
  var x = 0;
  var y = 0;
  if(poly.type == "Polygon"){
    var pts=poly.coordinates[0];
    for(var p=0;p<pts.length-1;p++){
      x += pts[p][0] * 1.0;
      y += pts[p][1] * 1.0;
    }
    x /= pts.length - 1;
    y /= pts.length - 1;
  }
  else{
    var polys=poly.coordinates[0];
    for(var e=0;e<polys.length;e++){
      var pts=polys[e];
      for(var p=0;p<pts.length-1;p++){
        x += pts[p][0] * 1.0;
        y += pts[p][1] * 1.0;
      }
      x /= pts.length - 1;
      y /= pts.length - 1;
    }
  }
  if(timer || timer_end){
    return [ (x - ctrlng) * timer / timer_end + ctrlng, (y - ctrlat) * timer / timer_end + ctrlat ];
  }
  else{
    return [ x, y ];
  }
};

// Load the data.
d3.json("savannahs2.geojson", function(err, parcels) {
  // calculate centroid and scale
  var minlat = 90;
  var maxlat = -90;
  var minlng = 180;
  var maxlng = -180;
  for(var t=0;t<parcels.features.length;t++){
    var ctr = centroid(parcels.features[t].geometry);
    parcels.features[t].properties.centroid = ctr;
    minlat = Math.min(minlat, ctr[1]);
    maxlat = Math.max(maxlat, ctr[1]);
    minlng = Math.min(minlng, ctr[0]);
    maxlng = Math.max(maxlng, ctr[0]);
  }
  ctrlat = (minlat + maxlat) / 2;
  ctrlng = (minlng + maxlng) / 2;
  geoscale = 12000000 / (Math.max(maxlng - minlng, 1.5 * (maxlat - minlat)) / 0.01967949560602733);

  // load tract map
  var parcelgeos = svg.selectAll("svg")
    .data(parcels.features).enter()
    .append("path")
    .attr("d", geopath.projection( d3.geo.mercator().scale(geoscale).center([ctrlng, ctrlat]) ) )
    .style("fill", function(d) { return color(d); })
    .style("stroke", "#fff");

  // Add a dot per parcel. Colored by decades
  var dot = svg.append("g")
      .attr("class", "dots")
    .selectAll(".dot")
      .data(parcels.features)
    .enter().append("circle")
      .attr("class", function(d) { return "dot d" + d.id; })
      .style("fill", function(d) { return color(d); })
      .call(position);

  transition_to_chart = function(){
    var timer = 0;
    var timer_end = 120;
 
    var tick = setInterval(function(){
      timer++;
      for(var t=0;t<parcelgeos[0].length;t++){
        d3.select(parcelgeos[0][t]).attr("d", geopath.projection(
          d3.geo.mercator()
            .scale(geoscale)
            .center(
              [ (parcels.features[t].properties.centroid[0] - ctrlng) * timer / timer_end + ctrlng, (parcels.features[t].properties.centroid[1] - ctrlat) * timer / timer_end + ctrlat ]
            )
        ));
      }
      parcelgeos.attr("transform", function(d) {
        var matchCircle = svg.select(".d" + d.id);
        if(matchCircle.attr("cy") == Infinity){
          if(timer <= timer_end){
            return "translate(" + (matchCircle.attr("cx") - 480) * timer / timer_end + "," + -250 * timer / timer_end + ")";
          }
          else{
            return "translate(" + (matchCircle.attr("cx") - 480) + ",-250)";
          }
        }
        if(timer <= timer_end){
          return "translate(" + (matchCircle.attr("cx") - 480) * timer / timer_end + "," + (matchCircle.attr("cy") - 250) * timer / timer_end + ")";
        }
        else{
          return "translate(" + (matchCircle.attr("cx") - 480) + "," + (matchCircle.attr("cy") - 250) + ")";
        }
      });
      if(timer > timer_end){
        clearInterval(tick);
      }
    }, 50);
  };
  transition_to_map = function(){
    var timer = 120;
    var timer_end = 0;
    var timer_length = timer - timer_end;
 
    var tick = setInterval(function(){
      timer--;
      for(var t=0;t<parcelgeos[0].length;t++){
        d3.select(parcelgeos[0][t]).attr("d", geopath.projection( d3.geo.mercator().scale(geoscale).center(
          [ (parcels.features[t].properties.centroid[0] - ctrlng) * timer / timer_end + ctrlng, (parcels.features[t].properties.centroid[1] - ctrlat) * timer / timer_end + ctrlat ]
        ) ) );
      }
      parcelgeos.attr("transform", function(d) {
        var matchCircle = svg.select(".d" + d.id);
        if(matchCircle.attr("cy") == Infinity){
          if(timer > timer_end){
            return "translate(" + (matchCircle.attr("cx") - 480) * timer / timer_length + "," + -250 * timer / timer_length + ")";
          }
          else{
            return "translate(0,0)";
          }
        }
        if(timer > timer_end){
          return "translate(" + (matchCircle.attr("cx") - 480) * timer / timer_length + "," + (matchCircle.attr("cy") - 250) * timer / timer_length + ")";
        }
        else{
          return "translate(0,0)";
        }
      });
      if(timer <= timer_end){
        clearInterval(tick);
      }
    }, 50);
  };
  setTimeout(transition_to_chart, 1000);
  //setTimeout(transition_to_map, 14000);

  // Positions the dots based on data.
  function position(dot) {
    try{
      dot.attr("cx", function(d) { return xScale(x(d)); })
       .attr("cy", function(d) { return yScale(y(d)); })
       .attr("r", 3);
    }
    catch(e){
      // impossible cy
    }
  }
});