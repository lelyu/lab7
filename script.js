const margin = { top: 20, right: 30, bottom: 30, left: 40 };

const width = 800,
  height = 800;

const svg = d3
  .select("body")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

d3.json("airports.json", d3.autoType).then((airports) => {
  d3.json("world-110m.json", d3.autoType).then((map) => {
    // creating the force layout
    // create scale for the circle sizing
    const size = d3
      .scaleLinear()
      .domain(d3.extent(airports.nodes, (d) => d.passengers))
      .range([3, 10]);
    airports.nodes.forEach((d) => {
      d.r = size(d.passengers);
    });

    // creating force
    let force = d3
      .forceSimulation(airports.nodes)
      .force("link", d3.forceLink(airports.links))
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(width / 2, height / 3))
      .on("tick", ticked);

    let link = svg
      .append("g")
      .selectAll("line")
      .data(airports.links)
      .enter()
      .append("line")
      .style("stroke", "lightblue");

    let node = svg
      .append("g")
      .selectAll("circle")
      .data(airports.nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", "red")
      .attr("stroke", "yellow");

    function ticked() {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    }

    node.append("title").text((d) => d.name);
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
        .filter((event) => visType === "force");
    }
    // Set default visType to force
    let visType = "force";
    node.call(drag(force));

    // creating map
    // conver topojson to geojson, extract state info
    const features = topojson.feature(map, map.objects.countries).features;

    const projection = d3.geoMercator().fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      topojson.feature(map, map.objects.countries)
    );

    let path = d3.geoPath().projection(projection);
    let worldmap = svg.append("g").attr("class", "map");

    
    d3.selectAll("input[name=type]").on("change", (event) => {
      visType = event.target.value; // selected button
      switchLayout();
    });
    worldmap
      .selectAll("path")
      .data(features)
      .enter()
      .append("path")
      .attr("name", function (d) {
        return d.properties.name;
      })
      .attr("id", function (d) {
        return d.id;
      })
      .attr("d", path)
      .attr("stroke", "white")
      .attr("class", "subunit-boundary");
    worldmap.attr("opacity", 0);

    function switchLayout() {
      if (visType === "map") {
        // create the map

        // stop the simulation
        force.stop();
        // set the positions of links and nodes based on geo-coordinates
        airports.nodes.forEach((d) => {
          d.x = projection([d.longitude, d.latitude])[0]; // update x and use it for cx
          d.y = projection([d.longitude, d.latitude])[1]; // update x and use it for cy

          node.attr("cx", (d) => d.x);
          node.attr("cy", (d) => d.y);
          link
            .attr("x1", (d) => d.source.x)
            .attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x)
            .attr("y2", (d) => d.target.y);
        });
        // set the map opacity to 1
        worldmap.attr("opacity", 1);
      } else {
        // force layout
        // restart the simulation
        // issue: some nodes can't be dragged.
        force.restart();
        // set the map opacity to 0
        worldmap.attr("opacity", 0);
      }
    }
  });
});
