// @author: Le Lyu
// @credit: Peiyu Zhong
const margin = { top: 20, right: 30, bottom: 30, left: 40 };

const width = 800,
  height = 800;

const svg = d3
  .select("body")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

d3.json("airports.json", d3.autoType).then((airports) => {
  d3.json("world-110m.json", d3.autoType).then((map) => {
    let visType = d3.select("input[name=type]:checked").node().value;
    // creating the force layout
    // create scale for the circle sizing
    const size = d3
      .scaleLinear()
      .domain(d3.extent(airports.nodes, (d) => d.passengers))
      .range([3, 10]);
    airports.nodes.forEach((d) => {
      d.r = size(d.passengers);
    });
    // creating map before node in order for nodes to be on top of map
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

    const worldmap = svg
      .selectAll("path")
      .data(features)
      .join("path")
      .attr("class", "map");

    d3.selectAll("input[name=type]").on("change", (event) => {
      visType = event.target.value; // selected button
      switchLayout();
    });

    worldmap
      .append("path")
      .attr("name", function (d) {
        return d.properties.name;
      })
      .attr("id", function (d) {
        return d.id;
      });

    svg
      .append("path")
      .datum(topojson.mesh(map, map.objects.countries))
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("class", "subunit-boundary");
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

    const drag = d3
      .drag()
      .filter((event) => visType === "force")
      .on("start", (event) => {
        if (!event.active) force.alphaTarget(0.3).restart();
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("drag", (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", (event) => {
        if (!event.active) force.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });
    node.call(drag);

    function switchLayout() {
      if (visType === "map") {
        force.stop();
        worldmap.attr("d", path);

        node
          .transition()
          .duration(500)
          .attr("cx", function (d) {
            d.x = projection([d.longitude, d.latitude])[0];
            return d.x;
          })
          .attr("cy", function (d) {
            d.y = projection([d.longitude, d.latitude])[1];
            return d.y;
          });
        worldmap.transition().duration(500).attr("opacity", 1);

        link
          .transition()
          .duration(500)
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
      } else {
        force.alpha(1.0).restart();
        worldmap.transition().duration(500).attr("opacity", 0);
      }
    }
  });
});
