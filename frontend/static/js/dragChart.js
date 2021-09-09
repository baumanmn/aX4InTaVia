import * as d3 from "d3";
//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";

const dragWindowWidth = 50; //width of the drag window
const dragHorizontalSpacer = 10; //distance of drag window from tool window
const buttonRadius = 12;
const dragButtonMargin = 17; //  Drag button margin

export function dragChart(chart) {
  var idNumber;

  //Copying array by value, not by reference

  chart.d.dragState = chart.d.users.slice(); //  order of user layers

  var l = chart.d.dragState.length; // number of layers
  var tokenBarHeight = chart.p.tokenBarHeight; //height of the annotators part of the detail window
  var userHeight = chart.p.userHeight; //height of a user layer
  //var tokenTextHeight = chart.p.tokenTextHeight;  //height of the token text window
  //var dragWindowWidth = chart.p.overviewHeight;  //height of the overview window
  var users = chart.d.users; //  data
  var dragButtonWidth = 34; //   Drag button widht
  var dragButtonHeight = 20; //  Drag button height

  const dist = (tokenBarHeight - l * userHeight) / (l + 1);

  //  Adding drag windows SVG elements
  //=================================================
  //define a mask for the drag window
  //chart.svg.append("defs").append("clipPath")
  //    .attr("id", "clipDrag")
  //    .append("rect")
  //    .attr("width", dragWindowWidth)
  //    .attr("height", tokenBarHeight);

  //the drag window (with clip path) moved  to the coordinates
  var verticalMov =
    chart.p.margins.top + chart.p.tokenTextHeight + chart.p.tokenPolygonHeight;
  var horizontalMov =
    chart.p.margins.left + chart.p.width + dragHorizontalSpacer;

  chart.drag.attr(
    "transform",
    "translate(" + horizontalMov + "," + verticalMov + ")"
  );
  //.attr("clip-path", "url(#clipDrag)");

  // Drag window background
  //chart.drag.append("rect")
  //    .attr("id", "dragBackground")
  //    .attr("x", 0)
  //    .attr("y", 0)
  //    .attr("width", dragWindowWidth)
  //    .attr("height", tokenBarHeight);

  // Group of drag buttons
  chart.dragButtons = chart.drag
    .append("g")
    .attr("id", "dragButtons")
    .selectAll("g")
    .data(users)
    .enter()
    .append("g")
    .attr("class", "dragButtons")
    .attr("id", function (d) {
      return "userDragButton" + d;
    })
    //.attr("width", dragButtonWidth)
    //.attr("height", dragButtonHeight)
    .attr("cursor", "move")
    .attr("transform", function (d, i) {
      var offset = dist * (i + 1) + i * userHeight + userHeight / 2;
      return "translate(" + dragButtonMargin + "," + offset + ")";
    })
    .call(
      d3
        .drag() // Drag event binding
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    );

  //  Drag button consist of a rect and text.
  //===========================================
  // Rect
  //d3.selectAll(".dragButtons").append("rect")
  //    .attr("x", 0)
  //    .attr("y", 0)
  //    .attr("width", dragButtonWidth)
  //    .attr("height", dragButtonHeight)
  //    .attr("fill", "#DCDAD6");

  d3.selectAll(".dragButtons")
    .append("line")
    .attr("class", "dragButtonConnector")
    .attr("x1", -100)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 0);

  d3.selectAll(".dragButtons")
    .append("circle")
    .attr("class", "dragButtonOutline")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", buttonRadius)
    .attr("fill", "white");

  // Button text
  var bText = d3
    .selectAll(".dragButtons")
    .append("text")
    .attr("class", "dragButtonText")
    .attr("x", 0)
    .attr("y", 0)
    //.attr("dy", ".35em")
    .text(function (d) {
      return d;
    });

  var label = d3
    .selectAll(".dragButtons")
    .append("foreignObject")
    .append("body")
    .attr("xmlns", "http://www.w3.org/1999/xhtml")
    .append("div")
    .append("label");

  label
    .append("input")
    .attr("type", "checkbox")
    .attr("id", function (d) {
      return "user" + d;
    })
    .on("change", function () {
      console.log("test");
    });
  label.append("text").text("show background");

  if (chart.p.orientation === "portrait")
    bText.attr("transform", "rotate (-90)");

  //  Drag functionality
  //  ==========================================

  //  Drag Start
  function dragStarted(d) {
    idNumber = getLayerNumber(d3.select(this));
    d3.select(this).raise().classed("active", true);
    var userLayer = d3.select("#userLayerG" + idNumber); // select user layer by id
    // aligning user layers center to the  cursor
    userLayer.attr(
      "transform",
      "translate(" + 0 + "," + centraliseDragLayer() + ")"
    );
    // aligning drag buttons center to the cursor
    d3.select(this).attr(
      "transform",
      "translate(" + dragButtonMargin + "," + centraliseDragButton() + ")"
    );

    var lensUserLayer = d3.select("#lensUserLayerG" + idNumber);
    lensUserLayer.attr(
      "transform",
      "translate(" + 0 + "," + centraliseDragLayer() + ")"
    );
  }

  function getLayerNumber(layer) {
    var id = layer.attr("id");
    return id.slice(14, id.length);
  }

  //  Drag
  function dragged(d) {
    var userLayer = d3.select("#userLayerG" + idNumber);
    userLayer.moveToFront(); // move user layer to the front (z-index alternative )

    //  transform
    d3.select(this).attr(
      "transform",
      "translate(" + dragButtonMargin + "," + centraliseDragButton() + ")"
    );
    userLayer.attr(
      "transform",
      "translate(" + 0 + "," + centraliseDragLayer() + ")"
    );

    var lensUserLayer = d3.select("#lensUserLayerG" + idNumber);
    lensUserLayer.attr(
      "transform",
      "translate(" + 0 + "," + centraliseDragLayer() + ")"
    );
    lensUserLayer.moveToFront();
  }

  //  Drag end
  function dragEnded(d) {
    var startLine = chart.d.dragState.indexOf(idNumber); //Drag start line
    var endLine = lineByCoordinate(d3.event.y); //  Drag end line

    //  Select svg element by id
    var userLayer1 = d3.select("#userLayerG" + idNumber);
    var lensUserLayer1 = d3.select("#lensUserLayerG" + idNumber);

    // calculate Offsets by line number
    var offsetB1 = calculateButtonOffset(endLine);
    var offsetL1 = calculateLayerOffset(endLine);

    // transitions
    d3.select(this)
      .transition("drag1")
      .duration(1000)
      .attr(
        "transform",
        "translate(" + dragButtonMargin + "," + offsetB1 + ")"
      );
    userLayer1
      .transition("drag2")
      .duration(1000)
      .attr("transform", "translate(" + 0 + "," + offsetL1 + ")");
    lensUserLayer1
      .transition("drag2")
      .duration(1000)
      .attr("transform", "translate(" + 0 + "," + offsetL1 + ")");

    //  Select svg element by id
    var dragButton2 = d3.select("#userDragButton" + chart.d.dragState[endLine]);
    var userLayer2 = d3.select("#userLayerG" + chart.d.dragState[endLine]);
    var lensUserLayer2 = d3.select(
      "#lensUserLayerG" + chart.d.dragState[endLine]
    );

    // calculate Offsets by line number
    var offsetB2 = calculateButtonOffset(startLine);
    var offsetL2 = calculateLayerOffset(startLine);

    userLayer2.moveToFront();
    userLayer1.moveToFront();

    lensUserLayer2.moveToFront();
    lensUserLayer1.moveToFront();

    // transitions
    dragButton2
      .transition("drag1")
      .duration(1000)
      .attr(
        "transform",
        "translate(" + dragButtonMargin + "," + offsetB2 + ")"
      );
    userLayer2
      .transition("drag2")
      .duration(1000)
      .attr("transform", "translate(" + 0 + "," + offsetL2 + ")");
    lensUserLayer2
      .transition("drag2")
      .duration(1000)
      .attr("transform", "translate(" + 0 + "," + offsetL2 + ")");

    updateDragState(startLine, endLine); //Update dragState order
    d3.select(this).classed("active", false);
    d3.select("#lensFrame").moveToFront();
  }

  // helper functions
  // ========================================

  //  move SVG element to the front (z-index alternative)
  d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
      this.parentNode.appendChild(this);
    });
  };

  //  Get offset for aligning layers center to the  cursor
  function centraliseDragLayer() {
    return d3.event.y - userHeight / 2;
  }

  //  Get offset for aligning buttons center to the  cursor
  function centraliseDragButton() {
    return d3.event.y;
  }

  //  Get layer offset by line number
  function calculateLayerOffset(line) {
    return dist * (line + 1) + line * userHeight;
  }

  //  Get button offset by line number
  function calculateButtonOffset(line) {
    return dist * (line + 1) + line * userHeight + userHeight / 2;
  }

  // get layer number by y Coordinat
  function lineByCoordinate(y) {
    var dragDerritoryHeight = tokenBarHeight / l;
    var clickedLine = Math.floor(y / dragDerritoryHeight);
    if (clickedLine < 0) {
      clickedLine = 0;
    }
    if (clickedLine > l - 1) {
      clickedLine = l - 1;
    }
    return clickedLine;
  }

  // update order of user layers
  function updateDragState(item1, item2) {
    var temp = chart.d.dragState[item1];
    chart.d.dragState[item1] = chart.d.dragState[item2];
    chart.d.dragState[item2] = temp;
    // return chart.d.dragState;
  }
}
