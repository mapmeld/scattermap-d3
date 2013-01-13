# ScatterMap-D3

ScatterMap-D3 turns a GeoJSON file into a map and scatter plot animation.

In the first phase, you see a scatter plot of dots representing price / year. There is also a map, color-coded by the decade that a parcel was last sold.

<img src="https://raw.github.com/mapmeld/scattermap-d3/gh-pages/phase1.png"/>

The map then animates. Each parcel moves to its matching dot in the scatter plot.

<img src="https://raw.github.com/mapmeld/scattermap-d3/gh-pages/phase2.png"/>

The data in this demo, from <a href="http://www.thempc.org/SAGIS.htm" target="_blank">SAGIS</a>, is the most recent sale year and sale price of parcels in downtown Savannah, Georgia (before January 2011).

## How does it work?

D3 reads data from a GeoJSON file to place the dots, the map, and the scattered map.

    d3.json("savannahs3.geojson", function(err, parcels) {
       ...
    });

The axes and scale of the scatter plot, color codes, and other details are written in JavaScript.

The GeoJSON has the sale price and sale date for each parcel. Creating and positioning a dot for each parcel:

    var dot = svg.append("g")
      .attr("class", "dots")
      .selectAll(".dot")
      .data(parcels.features)
      .enter()
      .append("circle")
        .attr("class", function(d) { return "dot d" + d.id; })
        .style("fill", function(d) { return color(d); })
        .call(position);

Loading the centered and scaled map from the GeoJSON:

    // have a center latitude and longitude (it's calculated from the GeoJSON in ScatterMap)
    var ctrlat = 32.08213;
    var ctrlng = -81.09639;

    // use a large scale value to see buildings and parcels (also calculated from the GeoJSON in ScatterMap)
    var geoscale = 15000000;

    var parcelgeos = svg.selectAll("svg")
      .data(parcels.features)
      .enter()
      .append("path")
      .attr("d", geopath.projection(
        d3.geo.mercator()
            .scale(geoscale)
            .center([ctrlng, ctrlat])
        )
      )
      .style("fill", function(d) { return color(d); });

To instantly snap the parcels to their dots, you can run the code to re-center and translate parcels

    // set each parcel's 0,0 coordinate to its own centroid
    function centroid(geo){
      // available in the code
    }
    for(var t=0;t<parcelgeos[0].length;t++){
      d3.select(parcelgeos[0][t])
        .attr("d", geopath.projection(
            d3.geo.mercator()
                .scale(geoscale)
                .center(
                   centroid(parcels.features[t].geometry)
                )
            )
        );
    }
    
    // move parcel's 0,0 coordinate to its dot's location * ( timer / timer_end )
    parcelgeos.attr("transform", function(d) {

      // get the matching dot
      var matchCircle = svg.select(".d" + d.id);

      // parcels outside graph boundaries (cy=Infinity) are relocated
      if(matchCircle.attr("cy") == Infinity){
        return "translate(" + (matchCircle.attr("cx") - 480) + ",-250)";
      }
      
      // parcels within graph boundaries
      return translate(" + (matchCircle.attr("cx") - 480) + "," + (matchCircle.attr("cy") - 250) + ")";
    });

Animating these processes together is cooler:

    var timer = 0;
    var timer_end = 120;
 
    var tick = setInterval(function(){
      // increment timer
      timer++;

      // set each parcel's 0,0 coordinate to its own centroid * ( timer / timer_end )
      for(var t=0;t<parcelgeos[0].length;t++){
        d3.select(parcelgeos[0][t]).attr("d", geopath.projection( d3.geo.mercator().scale(geoscale).center( centroid(parcels.features[t].geometry, timer, timer_end) ) ) );
      }

      // move parcel's 0,0 coordinate to its dot's location * ( timer / timer_end )
      parcelgeos.attr("transform", function(d) {
        var matchCircle = svg.select(".d" + d.id);
        if(matchCircle.attr("cy") == Infinity){
          return "translate(" + (matchCircle.attr("cx") - 480) * timer / timer_end + "," + -250 * timer / timer_end + ")";
        }
        return "translate(" + (matchCircle.attr("cx") - 480) * timer / timer_end + "," + (matchCircle.attr("cy") - 250) * timer / timer_end + ")";
      });
      
      // finish timer after timer_end
      if(timer >= timer_end){
        clearInterval(tick);
      }
    }, 50);

## License

ScatterMap-D3 is available under an open source MIT License

It is based on Mike Bostock's "Nations" scatter plot from https://github.com/mbostock/bost.ocks.org/blob/gh-pages/mike/nations/index.html
