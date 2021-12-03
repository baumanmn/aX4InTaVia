//region imports
import * as d3 from "d3";
import $ from "jquery";
import "jquery-ui-bundle";
import {
  assignBrushToView,
  currentlyActiveBrush,
  setCurrentlyActive,
} from "./brushSetup";
import { updateClass } from "./brushColorCoding";
import {
  resetSecondOverviewAndStateRects,
  resetThirdOverviewAndStateRects,
  setActiveOverview,
  updatePartition,
} from "./overview";
import {
  stateEncoder,
  removeAllGrandChildren,
  setBrushStateActiveInOverview,
} from "./overviewState";
import {
  drawDetailBars,
  updateAnnoViewRange,
  updateAnnoViewID,
} from "./splitAnnotationWindow";
import {
  getActiveBrushesInOverview,
  getFamilyOfBrush,
  updateOverviewConfig,
  clearOverviewStrips,
  setButtonRefInList,
} from "./drawChart";
import { cascadingButtonIndicatorUpdate, projection } from "./brushIndicators";
//endregion

export var activeCoding = false;

//technicalities
const num_overviews = 3; //maximal depth of brush tree
const num_brushes = 3; //maximal number of child nodes per node
const num_workbenchSnaps = 3;
const overviewMapExt = 750; //MB TODO rename
const overviewMapDepthExt = 120;
const color_palette = ["red", "green", "orange"]; //num_overviews many colors
const inactiveColor = "darkgray";
const buttonNotRendered = 0;
const buttonWasRendered = 1;
const buttonIsActive = 2;

//constants for testing purposes
const initValue = 0;
const clickActive = true;
const noRendering = false;

//containers
//var wrapperDiv; //div holding both the buttons and the workbench
var svg; //button svg
var buttons; //global array holding the structured button objects
var workbench; //global object holding the workbench structure
var chart_width;

//tracker variable
export var currentlyActive = [
  { group: 0, id: 0 },
  { group: 0, id: 0 },
  { group: 0, id: 0 },
];

//A hashmap storing the root positions of the buttons
var positionMap = {};

//color stored for dragging interaction
var storedColor = "none";

var chartRef;

//-----------------------------------------------------------
// Scale functions
//-----------------------------------------------------------
var xScale = d3
  .scaleBand()
  .domain(d3.range(num_overviews))
  .rangeRound([overviewMapDepthExt, 0])
  .paddingInner(0.06);

//adaptive scale needed for positioning different groups along y axis
function yScale(domain_length, height = overviewMapExt, bottom = 0) {
  return d3
    .scaleBand()
    .domain(d3.range(domain_length))
    .range([bottom, height])
    .padding([0.001]);
}

/**
 * Add a div as the container for the buttons and the workbench,
 * create the initial button structure and initialize the workbench
 * @param {*} chart
 */
export function initializeButtonContainer(chart) {
  var container = d3.select("body");
  svg = container
    .append("svg")
    .attr("id", "buttonsTBD")
    //.attr("height", "100%")
    .attr("width", chart.p.buttonsWidth) //MB TODO split windows, add viewbox
    .attr("height", overviewMapExt);
  //.attr("viewBox", `0 0 ${overviewMapDepthExt} ${overviewMapExt}`);
  //svg = wrapperDiv.append("svg").attr("height", "100%").attr("width", "100%");

  return 0;

  // Initialization
  initializeButtonStructure(num_overviews, num_brushes, color_palette);
  initializeWorkbench(chart, num_workbenchSnaps, 0);

  //Overview "-1"
  initializeNameTBD(chart);

  //init.: draw a single button per (active) overview
  for (let i = 0; i < num_overviews; i++) {
    let groupName = "overviewGroups_" + i;
    svg.append("g").classed(groupName, true);
    drawButtons(i, chart);
  }
  addBrushToWorkbench([0], d3.select("#button_0"));

  //hack: create a ref. for the chart object MB for not having to hand down the chart object in method chaining?
  chartRef = chart;
}

function initializeNameTBD(chart) {
  svg
    .append("g")
    .attr("id", "nameTBD")
    .append("rect")
    .attr("id", "nameTDB_overview")
    .attr("x", num_overviews * xScale.bandwidth() + 7) //magic number for now, need to work out exact padding
    .attr("y", 0)
    .attr("width", xScale.bandwidth())
    .attr("height", overviewMapExt)
    .attr("fill", "black");
}

/**
 * Initialize workbench with a given number of (max.) brushes (snaps)
 * @param {*} chart
 * @param {*} max_snaps
 * @param {*} init_snaps
 */
function initializeWorkbench(chart, max_snaps, init_snaps) {
  //hack: need access to chart.width without chart object
  chart_width = chart.p.tokenExt;

  //structure of the workbench object, storing necc. information
  workbench = {
    colorPalette: ["#7FFFD4", "#DDA0DD", "#D3D3D3"],
    max_snaps: max_snaps,
    num_snaps: init_snaps,
    object: "",
  };

  //Each snap is a object iself
  for (let i = 0; i < max_snaps; i++) {
    let id = "snap_" + i;
    workbench[id] = {
      //brush: holding the brush svg
      //brushObject: holding the object
      //button: holding the assigned button div
      //position: coordinates along the workbench
      //selectionRange: current selection range
      //color: temp. color assigned to brush and button
    };
  }

  workbench.object = svg.append("g");
  workbench.object
    .append("rect")
    .attr("id", "workbench")
    .attr("x", overviewMapDepthExt + 100)
    .attr("y", 0)
    .attr("height", chart.p.tokenExt)
    .attr("width", chart.p.overviewExt + 40)
    .attr("fill", "white");
}

/**
 * Initialize button structure with given number of overviews and brushes per overview,
 * each overview is assigned a level starting at 0,
 * for the level i overview (num_brushes)**i many buttons are drawn
 * @param {*} num_overviews
 * @param {*} num_brushes
 * @param {*} color_palette
 */
function initializeButtonStructure(num_overviews, num_brushes, color_palette) {
  buttons = [];

  for (let i = 0; i < num_overviews; i++) {
    //create an object for every overview level holding the buttons and other information
    buttons.push({
      overview: i,
      color: color_palette[i],
      //array of arrays with indicators showing whether the brush was rendered/is
      // (in-)active
      brushes: [
        //[ b1, b2, b3 ],
        //[ [ b11, b12, b13 ], [ b21, b22, b23 ], [ b31, b32, b33 ] ]
        //[ [ [ b111, b112, b113 ], [ b121, b122, b123 ], [ b131, b132, b133 ] ], [ [ b211, b212, b213 ], [ b221, b222, b223 ], [ b231, b232, b233 ] ], ... ]
        //MB rather (?):
        //[ b1, b2, b3 ] for i=0
        //[ b11, b12, b13 ], [ b21, b22, b23 ], [ b31, b32, b33 ] for i=1
        //[ b111, b112, b113 ], [ b121, b122, b123 ], [ b131, b132, b133 ], [ b211, b212, b213 ], [ b221, b222, b223 ], [ b231, b232, b233 ], ...
      ],
    });

    for (let j = 0; j < num_brushes ** i; j++) {
      buttons[i].brushes.push(new Array(num_brushes).fill(initValue));
      buttons[i].brushes[0][0] = buttonIsActive;
    }
  }
}

function drawButtons1(overview, chart) {
  return 0;
  let buttonContainer = svg.select(".overviewGroups_" + overview);
  buttonContainer.selectAll("g").remove();

  let data = buttons[overview];
  //generate a band-scale, number of bands = number of non-zero elements in buttons[overview].brushes
  let y_scale = yScale(sum(data.brushes.flat(1)));
  let last_yEndPos = 0;

  /**
   * create a group for every possible n-tuple (n == num_brushes) of brushes
   * in overview 0, there is only one group holding all n brushes
   * in overview 1, there is a n-tuple associated with each brush of overview 0
   * in overview 2, there is a n-tuple associated with each n-tuple of overview 1
   * ...
   */
  for (let i = 0; i < num_brushes ** overview; i++) {
    //number of non-zero elements in buttons[overview].brushes[i]
    let num_active_brushes = sum(data.brushes[i]);
    if (num_active_brushes === 0) {
      continue;
    }
    /**
     * adjust partitioning space according to partitioning of predecessor overviews
     */
    let fatherGroup = i;
    let father_sum;
    let ancestor = overview - 1;
    let partitionSpace = overviewMapExt;
    while (ancestor >= 0) {
      fatherGroup = Math.floor(fatherGroup / 3) % 3; //MB hard coded to 3
      father_sum = sum(buttons[ancestor].brushes[fatherGroup]);
      partitionSpace = partitionSpace / father_sum;
      y_scale = yScale(
        num_active_brushes,
        last_yEndPos + partitionSpace,
        last_yEndPos
        //last_yEndPos - partitionSpace
      );
      ancestor -= 1;
    }

    /**
     * draw the rectangles representing the buttons
     */
    buttonContainer
      .append("g")
      .classed("group_" + overview + "_" + i, true)
      .selectAll(".buttonRects")
      //only consider buttons that are set to be rendered (partitioning of overview exists)
      .data(
        data.brushes[i].filter(function (d) {
          return d !== buttonNotRendered;
        })
      )
      .enter()
      .append("rect")
      .classed("buttonRects", true)
      //assign id for dragging and store root position of button in positionMap
      .attr("id", function (d, j) {
        //let id = "button_" + overview + "_" + i + "_" + j;
        let id = "button_" + assignID(overview, i, j);
        positionMap[id] = [xScale(data.overview), y_scale(j)];
        return id;
      })
      .attr("width", xScale.bandwidth())
      .attr("height", y_scale.bandwidth())
      .attr("x", xScale(data.overview))
      .attr("y", function (d, j) {
        last_yEndPos += y_scale.bandwidth();
        //last_yEndPos -= y_scale.bandwidth();
        return y_scale(j);
      })
      //only color button if it is currently active, even it its value is set to be active
      .attr("fill", function (d, j) {
        if (d === buttonIsActive) {
          if (
            i === currentlyActive[overview].group &&
            j === currentlyActive[overview].id
          ) {
            return data.color;
          } else {
            return inactiveColor;
          }
        } else {
          return inactiveColor;
        }
      })
      .attr("stroke", function (d, j) {
        let id = assignID(overview, i, j);
        id = extractNumbers(id);
        let assignedSnapID = isBrushAssignedToWB(id);
        if (assignedSnapID != "") {
          return workbench[assignedSnapID]["color"];
        } else {
          return "black";
        }
      })
      .attr("stroke-width", function (d, j) {
        let id = assignID(overview, i, j);
        id = extractNumbers(id);
        let assignedSnapID = isBrushAssignedToWB(id);
        if (assignedSnapID != "") {
          return "2px";
        } else {
          return "1px";
        }
      })
      .on("click", function (d, j) {
        onClick(chart, overview, i, j);
        //onClick(chart, overview, i, j);
      });
  }
  dragAndSnap(buttonContainer.selectAll(".buttonRects"), chart);
}

function assignID(overview, i, j) {
  return 0;
  if (overview === 0) {
    return String(j);
  } else if (overview === 1) {
    return String(i) + "_" + String(j);
  } else {
    return String(Math.floor(i / 3)) + "_" + String(i % 3) + "_" + String(j);
  }
}

//-----------------------------------------------------------
// Interaction
//-----------------------------------------------------------
function onClick(chart, overview, i, j) {
  updateSubTree(overview, i, j);
  if (clickActive === true) {
    //MB is that not always the case?
    if (overview === 0) {
      setSecondOVActive(chart, j);
      setThirdOVActive(chart, currentlyActive[1].id);
    } else if (overview === 1) {
      setSecondOVActive(chart, i);
      setThirdOVActive(chart, j);
    } else {
      setSecondOVActive(chart, currentlyActive[0].id);
      setThirdOVActive(chart, currentlyActive[1].id);
    }
  }

  //HACK FOR NOW
  //0 : [j]
  //1 : father: i % 3, overview, brush: j
  //2 : [overview, i%3, j]
}

var dragAndSnap = d3
  .drag()
  .on("start", function () {
    storedColor = d3.select(this).attr("fill");
    //d3.select(this).attr("x", d3.event.x).attr("y", d3.event.y);
  })
  .on("drag", function () {
    let width = parseInt(d3.select(this).attr("width"));
    let height = parseInt(d3.select(this).attr("height"));
    //d3.select(this).attr("x", d3.event.x).attr("y", d3.event.y);
    d3.select(this).attr("x", d3.event.x);
    if (intersection([d3.event.x, d3.event.y], [width, height]) === true) {
      d3.select(this).attr("fill", "gold");
    } else {
      d3.select(this).attr("fill", storedColor);
    }
  })
  .on("end", function () {
    let id = d3.select(this).attr("id");
    let width = parseInt(d3.select(this).attr("width"));
    let height = parseInt(d3.select(this).attr("height"));
    let position = positionMap[id];
    if (intersection([d3.event.x, d3.event.y], [width, height]) === true) {
      //snap
      addBrushToWorkbench(extractNumbers(id), d3.select(this));
      //d3.select(this).style("stroke", "blue").style("stroke-dasharray", ("3, 3"));
    }
    d3.select(this).attr("x", position[0]).attr("y", position[1]);
    if (storedColor != "none") {
      d3.select(this).attr("fill", storedColor);
      storedColor = "none";
    }
  });

//-----------------------------------------------------------
// Function/behavioural methods
//-----------------------------------------------------------
function updateButtonColoring(overview, i, force = false) {
  return 0;
  let groupName = ".group_" + overview + "_" + i;
  svg
    .select(groupName)
    .selectAll(".buttonRects")
    .data(buttons[overview].brushes[i])
    .attr("fill", function (d, j) {
      if (force === true) {
        return inactiveColor;
      }
      if (d === buttonIsActive) {
        return buttons[overview].color;
      } else {
        return inactiveColor; // REMOVE
      }
    });
}

function updateSubTree(overview, i, j) {
  return 0;
  /**
   * make previously active subtree inactive,
   * force-color previously active buttons,
   * but don't update values --> easy recovery on activation
   */
  for (let k = 0; k < num_overviews; k++) {
    updateButtonColoring(k, currentlyActive[k].group, true);
  }

  /**
   * activate the selected button
   */
  setButtonActive(overview, i, j);
  updateButtonColoring(overview, i);

  /**
   * update its whole Subtree:
   * - activate all of its predecessors and descendants
   * - recover active buttons from the values in the respective array
   * - some predecessor/descendant have never been active bevore --> activate now
   */
  if (overview === 0) {
    checkAndActivate(1, j);
    updateButtonColoring(1, j);
    checkAndActivate(2, 3 * j + 0);
    for (let k = 0; k < num_brushes; k++) {
      updateButtonColoring(2, 3 * j + k);
    }
  }
  if (overview === 1) {
    checkAndActivate(0, 0, i);
    updateButtonColoring(0, 0);
    checkAndActivate(2, 3 * i + j);
    updateButtonColoring(2, 3 * i + j);
  }
  if (overview === 2) {
    checkAndActivate(0, 0, Math.floor(i / 3));
    checkAndActivate(1, Math.floor(i / 3));
    updateButtonColoring(0, 0);
    updateButtonColoring(1, Math.floor(i / 3));
  }
}

/**
 *
 * check whether a specific group of buttons has any active buttons at all
 * if so, highlight the currently active button
 * if not, activate and highlight the first button of the group
 * @param {number} overview overview in question
 * @param {number} i ID of the group
 * @param {number} j ID of the Brush, specifically included for overview 0
 */
function checkAndActivate(overview, i, j = 0) {
  return 0;
  /**
   * sum of values assigned to the buttons
   * if the sum is smaller than (buttonIsActive + 2 * buttonWasRendered)
   * none of the buttons is active yet (either not rendered or rendered but all inactive)
   */
  let active_sum = sum(buttons[overview].brushes[i]);
  if (active_sum >= buttonIsActive + 2 * buttonWasRendered) {
    for (let k = 0; k < num_brushes; k++) {
      if (buttons[overview].brushes[i][k] === buttonIsActive) {
        setButtonActive(overview, i, k);
        break;
      }
    }
  } else {
    setButtonActive(overview, i, j);
  }
}

function setButtonActive(overview, i, brushID) {
  return 0;
  let former = buttons[overview].brushes[i];
  for (let j = 0; j < former.length; j++) {
    j === brushID
      ? (former[j] = buttonIsActive)
      : (former[j] = Math.min(buttonWasRendered, former[j]));
  }
  currentlyActive[overview] = { group: i, id: brushID };
}

//-----------------------------------------------------------
// Utility
//-----------------------------------------------------------
//count the number of non-zero entries in array
function sum(array) {
  if (array.length === undefined) return 1;
  let count = 0;
  for (let i = 0; i < array.length; i++) {
    count = array[i] != 0 ? count + 1 : count;
  }
  return count;
}

function intersection(buttonPos, buttonWH) {
  return 0;
  let wX = parseInt(d3.select("#workbench").attr("x"));
  let wY = parseInt(d3.select("#workbench").attr("y"));
  let wW = parseInt(d3.select("#workbench").attr("width"));
  let wH = parseInt(d3.select("#workbench").attr("height"));
  let result = false;
  if (buttonPos[0] >= wX && buttonPos[0] <= wX + wW) {
    if (buttonPos[1] >= wY && buttonPos[1] <= wY + wH) {
      result = true;
    }
    if (
      buttonPos[1] + buttonWH[1] >= wY &&
      buttonPos[1] + buttonWH[1] <= wY + wH
    ) {
      result = true;
    }
  }
  if (
    buttonPos[0] + buttonWH[0] >= wX &&
    buttonPos[0] + buttonWH[0] <= wX + wW
  ) {
    if (buttonPos[1] >= wY && buttonPos[1] <= wY + wH) {
      result = true;
    }
    if (
      buttonPos[1] + buttonWH[1] >= wY &&
      buttonPos[1] + buttonWH[1] <= wY + wH
    ) {
      result = true;
    }
  }
  return result;
}

function extractNumbers(id) {
  let numbers = id.match(/(\d[\d\.]*)/g);
  return numbers.map((x) => parseInt(x));
}

//-----------------------------------------------------------
// External callbacks
//-----------------------------------------------------------

export function drawNameTBDdRectangle(chart, id) {
  return 0;
  let staticOverviewG = d3.select("#nameTBD");
  let staticOverviewRect = d3.select("#nameTDB_overview");

  if (staticOverviewG.empty() || staticOverviewRect.empty()) return 0;

  let x = parseInt(staticOverviewRect.attr("x"));
  let w = parseInt(staticOverviewRect.attr("width"));
  let y = parseInt(staticOverviewRect.attr("y"));
  let h = parseInt(staticOverviewRect.attr("height"));

  let chartOrigin = 0;
  let chartWidth = chart.p.tokenExt;
  let [rangeX, rangeEnd] = stateEncoder.tokenRange[id];

  let convertFactor = h / chartWidth;

  let buttonRectID = "nameTDB_rect_" + id;

  staticOverviewG.select("#" + buttonRectID).remove();
  staticOverviewG
    .append("rect")
    .attr("id", buttonRectID)
    //.attr("class", "stateRect")
    .attr("x", x + (w / 2 - w / 8))
    .attr("y", y + convertFactor * (rangeX - chartOrigin))
    .attr("width", w / 4)
    .attr("height", convertFactor * (rangeEnd - rangeX))
    .attr("fill", "white")
    .attr("opacity", 0.5);
}

//incoming id: id of brush to the left of the new split
export function drawNameTBDdCircle(chart, id) {
  return 0;
  let staticOverviewG = d3.select("#nameTBD");
  let staticOverviewRect = d3.select("#nameTDB_overview");

  if (staticOverviewG.empty() || staticOverviewRect.empty()) return 0;

  let x = parseInt(staticOverviewRect.attr("x"));
  let w = parseInt(staticOverviewRect.attr("width"));
  let y = parseInt(staticOverviewRect.attr("y"));
  let h = parseInt(staticOverviewRect.attr("height"));

  let convertFactor = h / chart.p.tokenExt;

  let splitPos = stateEncoder.overlayRange[id][1] + 1; //right overlay border

  let circleRectID = "nameTDB_circle_" + id;
  let circleSize = 6;

  staticOverviewG.select("#" + circleRectID).remove();
  staticOverviewG
    .append("circle")
    .attr("id", circleRectID)
    //.attr("class", "stateRect")
    .attr("cx", x + w / 2)
    .attr("cy", y + convertFactor * splitPos)
    .attr("r", circleSize)
    .attr("fill", "white")
    .attr("opacity", 0.9);
}

export function drawButtonRectangle(overview, id, splitPos = null) {
  return 0;
  let convertedBrushID =
    overview === 1 ? "button_" + id[0] : "button_" + id[0] + "_" + id[1];
  let assignedButton = d3.select("#" + convertedBrushID);
  let buttonRectID = convertedBrushID + "_rect_" + id.join("_");

  if (!assignedButton.empty()) {
    let x = parseInt(assignedButton.attr("x"));
    let w = parseInt(assignedButton.attr("width"));
    let y = parseInt(assignedButton.attr("y"));
    let h = parseInt(assignedButton.attr("height"));

    let brushID;
    let brushRectangle;
    let currentBrushX;
    let currentBrushWidth;

    let newRectW = w / 4;
    let newRectOffset = w / 2 - w / 8;

    if (overview === 1) {
      brushID = 0; // fix this to prevent unnessecary removal of rects?
      brushRectangle = stateEncoder[id[0]].childOverviewRectangles[id[1]];
      currentBrushX = stateEncoder.tokenRange[id[0]][0];
      currentBrushWidth =
        stateEncoder.tokenRange[id[0]][1] - stateEncoder.tokenRange[id[0]][0];
    } else {
      brushID = (id[0] + id[1] * id[2]) % 3;
      currentBrushX = stateEncoder[id[0]].tokenRange[id[1]][0];
      currentBrushWidth =
        stateEncoder[id[0]].tokenRange[id[1]][1] -
        stateEncoder[id[0]].tokenRange[id[1]][0];
      brushRectangle =
        stateEncoder[id[0]].children[id[1]].childOverviewRectangles[id[2]];
    }

    let rectX = parseInt(brushRectangle.attr("x"));
    let rectW = parseInt(brushRectangle.attr("width"));
    let convertFactor = h / currentBrushWidth;

    let parentG = d3.select(".group_" + (overview - 1) + "_" + brushID);

    parentG.select("#" + buttonRectID).remove();
    parentG
      .append("rect")
      .attr("id", buttonRectID)
      //.attr("class", "stateRect")
      .attr("x", x + newRectOffset)
      .attr("y", y + convertFactor * (rectX - currentBrushX))
      .attr("width", newRectW)
      .attr("height", convertFactor * rectW)
      .attr("fill", "black")
      .attr("opacity", 0.5);
  }
}

export function drawGrandButtonRectangle(id) {
  return 0;
  let convertedBrushID = "button_" + id[0];
  let assignedButton = d3.select("#" + convertedBrushID);
  let buttonRectID = convertedBrushID + "_rect_" + id.join("_");

  if (!assignedButton.empty()) {
    let x = parseInt(assignedButton.attr("x"));
    let w = parseInt(assignedButton.attr("width"));
    let y = parseInt(assignedButton.attr("y"));
    let h = parseInt(assignedButton.attr("height"));
    1;
    let newRectW = w / 8;
    let newRectOffset = (w / 2 - w / 8) / 2;

    let brushID = 0;
    let grandParentBrushRectangle =
      stateEncoder[id[0]].grandchildOverviewRectangles[id[2]];
    //let parentBrushX = stateEncoder[id[0]].tokenRange[id[1]][0];
    //let parentBrushWidth = stateEncoder[id[0]].tokenRange[id[1]][1] - stateEncoder[id[0]].tokenRange[id[1]][0];
    let parentBrushX = stateEncoder.tokenRange[id[0]][0];
    let parentBrushWidth =
      stateEncoder.tokenRange[id[0]][1] - stateEncoder.tokenRange[id[0]][0];

    let rectX = parseInt(grandParentBrushRectangle.attr("x"));
    let rectW = parseInt(grandParentBrushRectangle.attr("width"));
    let convertFactor = h / parentBrushWidth;

    let parentG = d3.select(".group_0_" + brushID);

    parentG.select("#" + buttonRectID).remove();
    parentG
      .append("rect")
      .attr("id", buttonRectID)
      //.attr("class", "stateRect")
      .attr("x", x + newRectOffset)
      .attr("y", y + convertFactor * (rectX - parentBrushX))
      .attr("width", newRectW)
      .attr("height", convertFactor * rectW)
      .attr("fill", "black")
      .attr("opacity", 0.5);
  }
}

export function updateAllGrandButtonRectangles(id) {
  return 0;
  let convertedBrushID = "button_" + id;
  let assignedButton = d3.select("#" + convertedBrushID);

  if (!assignedButton.empty()) {
    let x = parseInt(assignedButton.attr("x"));
    let w = parseInt(assignedButton.attr("width"));
    let y = parseInt(assignedButton.attr("y"));
    let h = parseInt(assignedButton.attr("height"));
    let newRectW = w / 8;
    let newRectOffset = (w / 2 - w / 8) / 2;
    let brushID = 0;
    let parentG = d3.select(".group_0_" + brushID);

    for (let i = 0; i < num_brushes; i++) {
      for (let j = 0; j < num_brushes; j++) {
        let buttonRectID = convertedBrushID + "_rect_" + id + "_" + i + "_" + j;

        if (!parentG.select("#" + buttonRectID).empty()) {
          let grandParentBrushRectangle =
            stateEncoder[id].grandchildOverviewRectangles[j];
          let parentBrushX = stateEncoder.tokenRange[id][0];
          let parentBrushWidth =
            stateEncoder.tokenRange[id][1] - stateEncoder.tokenRange[id][0];

          let rectX = parseInt(grandParentBrushRectangle.attr("x"));
          let rectW = parseInt(grandParentBrushRectangle.attr("width"));
          let convertFactor = h / parentBrushWidth;

          parentG.select("#" + buttonRectID).remove();
          parentG
            .append("rect")
            .attr("id", buttonRectID)
            //.attr("class", "stateRect")
            .attr("x", x + newRectOffset)
            .attr("y", y + convertFactor * (rectX - parentBrushX))
            .attr("width", newRectW)
            .attr("height", convertFactor * rectW)
            .attr("fill", "black")
            .attr("opacity", 0.5);
        }
      }
    }
  }
}

export function renderButton(chart, overview, i, brushID) {
  return 0;
  if (noRendering === true) return 0;
  if (buttons[overview].brushes[i][brushID] >= buttonWasRendered) return 0;
  buttons[overview].brushes[i][brushID] = buttonWasRendered;
  drawButtons(overview, chart);
  let nextGroup = 3 * i + brushID;
  for (let j = overview + 1; j < num_overviews; j++) {
    buttons[j].brushes[nextGroup][0] = buttonWasRendered;
    nextGroup = 3 * nextGroup;
    drawButtons(j, chart);
  }
}

export function adjustWorkBenchBrush(id, selectionRange = null) {
  return 0;
  $(function () {
    if (workbench === undefined) return 0;
    let snap_id = isBrushAssignedToWB(id);
    if (snap_id === "") return 0;
    redrawWorkbench();
    /* let ranges = getBrushRanges(snap_id);

    let overlayRange = ranges[1];
    if (selectionRange === null) selectionRange = ranges[0];
    selectionRange = [
      selectionRange[0] - overlayRange[0],
      selectionRange[1] - overlayRange[0],
    ];
    let range = convertBrushRanges(
      selectionRange,
      overlayRange[1] - overlayRange[0],
      workbench[snap_id]["position"][1]
    );

    console.log("ranges in workbench");
    console.log(range);

    const y0 = workbench[snap_id]["position"][0] + range[0];
    const y1 = range[1] - range[0];

    workbench[snap_id]["brush"]
      .select(".selection")
      .attr("y", y0);
    workbench[snap_id]["brush"]
      .select(".selection")
      .attr("height", y1);

    if (overlayRange[1] === 750) overlayRange[1] = 749;
    updateAnnoViewRange(
      chartRef,
      workbench[snap_id]["ids"],
      overlayRange,
      true
    ); */
  });
}

function setSecondOVActive(chart, id) {
  return 0;
  if (currentlyActiveBrush == id) {
    resetSecondOverviewAndStateRects(chart, id);
    return 0;
  }
  setCurrentlyActive(chart, id);
  setActiveOverview(chart, id, 1);
  setBrushStateActiveInOverview(id, 0);
  resetSecondOverviewAndStateRects(chart, id);
  resetThirdOverviewAndStateRects(chart, stateEncoder[id].children.childActive);
  if (activeCoding === false) {
    updateClass(chart, id, 0);
    updateClass(chart, currentlyActive[1].id, 1);
  }
}

function setThirdOVActive(chart, id) {
  return 0;
  removeAllGrandChildren();
  if (id == stateEncoder[stateEncoder.parentActive].children.childActive) {
    resetThirdOverviewAndStateRects(chart, id);
    return 0;
  }
  setBrushStateActiveInOverview(id, 1);
  setActiveOverview(chart, id, 2);
  resetThirdOverviewAndStateRects(chart, id);
  if (activeCoding === false) {
    updateClass(chart, id, 1);
  }
}

function adjustOverviewBrush(snap_id) {
  return 0;
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

  let brush = workbench[snap_id]["brush"];

  if (brush === undefined) return 0;

  let ids = workbench[snap_id]["ids"];

  let y0 = workbench[snap_id]["position"][0];

  let y1 = parseInt(brush.select(".selection").attr("y")) - y0;

  let y2 = y1 + parseInt(brush.select(".selection").attr("height"));

  if (ids.length === 1) {
    let targetRange = stateEncoder.overlayRange[ids[0]];
    let selectionRange = convertBrushRanges(
      [y1, y2],
      workbench[snap_id]["position"][1],
      targetRange[1] - targetRange[0]
    );
    selectionRange = [
      targetRange[0] + selectionRange[0],
      targetRange[0] + selectionRange[1],
    ];
    updatePartition(chartRef, [targetRange, selectionRange], 0, ids);
  } else if (ids.length === 2) {
    let targetRange = stateEncoder[ids[0]].overlayRange[ids[1]];
    let selectionRange = convertBrushRanges(
      [y1, y2],
      workbench[snap_id]["position"][1],
      targetRange[1] - targetRange[0]
    );
    selectionRange = [
      targetRange[0] + selectionRange[0],
      targetRange[0] + selectionRange[1],
    ];
    updatePartition(chartRef, [targetRange, selectionRange], 1, [
      ids[0],
      ids[1],
    ]);
  } else {
    let targetRange =
      stateEncoder[ids[0]].children[ids[1]].overlayRange[ids[2]];
    let selectionRange = convertBrushRanges(
      [y1, y2],
      workbench[snap_id]["position"][1],
      targetRange[1] - targetRange[0]
    );
    selectionRange = [
      targetRange[0] + selectionRange[0],
      targetRange[0] + selectionRange[1],
    ];
    updatePartition(chartRef, [targetRange, selectionRange], 2, [
      ids[0],
      ids[1],
      ids[2],
    ]);
  }
}

//-----------------------------------------------------------
// Workbench
//-----------------------------------------------------------
function getBrushRanges(snap_id) {
  return 0;
  let ids = workbench[snap_id]["ids"];
  let leftSelection, rightSelection, leftOverlay, rightOverlay;
  if (ids.length === 1) {
    let j = ids[0];
    leftSelection = stateEncoder.tokenRange[j][0];
    rightSelection = stateEncoder.tokenRange[j][1];
    leftOverlay = stateEncoder.overlayRange[j][0];
    rightOverlay = stateEncoder.overlayRange[j][1];
  } else if (ids.length === 2) {
    let i = ids[0];
    let j = ids[1];
    leftSelection = stateEncoder[i].tokenRange[j][0];
    rightSelection = stateEncoder[i].tokenRange[j][1];
    leftOverlay = stateEncoder[i].overlayRange[j][0];
    rightOverlay = stateEncoder[i].overlayRange[j][1];
  } else {
    let grandID = ids[0];
    let parentID = ids[1];
    let j = ids[2];
    leftSelection = stateEncoder[grandID].children[parentID].tokenRange[j][0];
    rightSelection = stateEncoder[grandID].children[parentID].tokenRange[j][1];
    leftOverlay = stateEncoder[grandID].children[parentID].overlayRange[j][0];
    rightOverlay = stateEncoder[grandID].children[parentID].overlayRange[j][1];
  }
  return [
    [leftSelection, rightSelection],
    [leftOverlay, rightOverlay],
  ];
}

function convertBrushRanges(range, source_length, target_length) {
  //let factor = Math.min(1, target_length / source_length);
  let factor = target_length / source_length;
  return [Math.floor(range[0] * factor), Math.floor(range[1] * factor)];
}

function isBrushAssignedToWB(id) {
  return "";
  let result = "";
  for (let i = 0; i < workbench.num_snaps; i++) {
    let snap_id = "snap_" + i;
    let same;
    if (id.length != workbench[snap_id]["ids"].length) {
      same = false;
    } else {
      same = workbench[snap_id]["ids"].every(function (element, index) {
        return element === id[index];
      });
    }
    if (same === true) result = snap_id;
  }
  return result;
}

function addBrushToWorkbench(id = [0], button) {
  return 0;
  if (isBrushAssignedToWB(id) != "") return 0;

  $(function () {
    let sameTreeSnapID = isPartOfSubtree(id);
    let assignedViewID;

    if (sameTreeSnapID !== -1) {
      //unhighlight formerly assigned button
      workbench["snap_" + sameTreeSnapID]["button"]
        .style("stroke", "black")
        .style("stroke-width", "1px");
      //.style("fill", buttons[workbench["snap_" + sameTreeSnapID]["ids"].length - 1].color)

      //replace annotationView key
      updateAnnoViewID(
        chartRef,
        workbench["snap_" + sameTreeSnapID]["ids"],
        id
      );
      //assign new button
      workbench["snap_" + sameTreeSnapID]["ids"] = id;
      workbench["snap_" + sameTreeSnapID]["button"] = button;
      button
        .style("stroke", workbench["colorPalette"][sameTreeSnapID])
        .style("stroke-width", "2px");

      assignedViewID = workbench["snap_" + sameTreeSnapID]["assignedViewID"];
    } else {
      //assign new button
      workbench["snap_" + workbench.num_snaps]["ids"] = id;
      workbench["snap_" + workbench.num_snaps]["assignedViewID"] =
        workbench.num_snaps;
      workbench["snap_" + workbench.num_snaps]["button"] = button;
      workbench["snap_" + workbench.num_snaps]["color"] =
        workbench["colorPalette"][workbench.num_snaps];
      button
        .style("stroke", workbench["colorPalette"][workbench.num_snaps])
        .style("stroke-width", "2px");

      assignedViewID = workbench.num_snaps;

      workbench.num_snaps = Math.min(
        workbench.max_snaps,
        workbench.num_snaps + 1
      );
    }

    workbench.object.selectAll(".workbenchBrush").remove();
    workbench.object.selectAll(".workbenchDivider").remove();

    let wX = parseInt(d3.select("#workbench").attr("x"));
    let wY = parseInt(d3.select("#workbench").attr("y"));
    let wW = parseInt(d3.select("#workbench").attr("width"));
    let wH = parseInt(d3.select("#workbench").attr("height"));
    let length = wH / workbench.num_snaps;
    let y = wY;

    for (let i = 0; i < workbench.num_snaps; i++) {
      let snap_id = "snap_" + i;
      workbench[snap_id]["brushObject"] = d3.brushY().extent([
        [wX, y],
        [wX + wW, y + length],
      ]);

      let overviewBrushRanges = getBrushRanges(snap_id); //get overlay and selection ranges

      let selectionRange = [
        overviewBrushRanges[1][0] - overviewBrushRanges[0][0],
        overviewBrushRanges[1][1] - overviewBrushRanges[0][0],
      ];

      selectionRange = convertBrushRanges(
        selectionRange,
        overviewBrushRanges[1][1] - overviewBrushRanges[1][0],
        length
      );

      workbench[snap_id]["selectionRange"] = selectionRange;
      workbench[snap_id]["position"] = [y, length];
      workbench[snap_id]["brush"] = workbench.object
        .append("g")
        .classed("workbenchBrush", true)
        .call(workbench[snap_id]["brushObject"])
        .call(workbench[snap_id]["brushObject"].move, [
          y + selectionRange[0],
          y + selectionRange[0] + selectionRange[1], //
        ]);
      /* workbench[snap_id]["brush"] = workbench.object
        .append("g")
        .classed("workbenchBrush", true)
        .call(workbench[snap_id]["brushObject"])
        .call(workbench[snap_id]["brushObject"].move, [
          y + selectionRange[0],
          y + selectionRange[1],
        ]); */

      workbench[snap_id]["brush"]
        .select(".selection")
        .attr("fill", workbench[snap_id]["color"]);

      /**
       * DIMENSIONS: See workbench initialization in initializeWorkbench()
       */
      workbench.object
        .append("rect")
        .attr("class", "workbenchDivider")
        .attr("x", overviewMapDepthExt + 100)
        .attr("y", y + selectionRange[0] + selectionRange[1])
        .attr("height", 4)
        .attr("width", chartRef.p.overviewExt + 40)
        .attr("fill", "lightgray");

      /* workbench[snap_id]["brushObject"].on("brush", function () {
        let overviewBrushRanges = getBrushRanges(snap_id); //get overlay and selection ranges
        if (overviewBrushRanges[0][1] === 750) overviewBrushRanges[0][1] = 749;
        updateAnnoViewRange(
          chartRef,
          workbench[snap_id]["ids"],
          overviewBrushRanges[0],
          true
        );
        adjustOverviewBrush(snap_id);
      }); */

      workbench[snap_id]["brushObject"].on("end", function () {
        let overviewBrushRanges = getBrushRanges(snap_id); //get overlay and selection ranges
        if (overviewBrushRanges[0][1] === 750) overviewBrushRanges[0][1] = 749;
        updateAnnoViewRange(
          chartRef,
          workbench[snap_id]["ids"],
          overviewBrushRanges[0],
          true
        );
        adjustOverviewBrush(snap_id);
      });

      //draw bars according to overlay range and available space

      //add ranges for new annotationWindows
      //HACK
      if (overviewBrushRanges[0][1] === 750) overviewBrushRanges[0][1] = 749;
      updateAnnoViewRange(
        chartRef,
        workbench[snap_id]["ids"],
        overviewBrushRanges[0]
      );
      y += length;
    }
    assignBrushToView(chartRef, assignedViewID, id.length - 1, id);
    drawDetailBars(chartRef);
  });
}

function isPartOfSubtree(id) {
  return -1;
  if (workbench.num_snaps < 1) return -1;
  let result = true;
  let sameTreeSnapID = -1;
  let temp = -1;
  for (let i = 0; i < workbench.num_snaps; i++) {
    let snap_id = "snap_" + i;
    let currID = workbench[snap_id]["ids"];
    let min_length = Math.min(id.length, currID.length);
    for (let j = 0; j < min_length; j++) {
      result = id[j] === currID[j];
    }
    if (result === true) {
      sameTreeSnapID = i;
      temp = currID;
    }
  }
  /* if (result === true)
    alert("Assigning brushes of the same subtree is not possible"); */
  return sameTreeSnapID;
}

/* function constructKey(id) {
  if (id[0] === 0) {
    return [id[2]];
  } else if (id[0] === 1) {
    return [id[1], id[2]];
  } else {
    return [Math.floor(id[1] / 3), id[1] % 3, id[2]];
  }
} */

function redrawWorkbench() {
  return 0;
  workbench.object.selectAll(".workbenchBrush").remove();
  workbench.object.selectAll(".workbenchDivider").remove();

  let wX = parseInt(d3.select("#workbench").attr("x"));
  let wY = parseInt(d3.select("#workbench").attr("y"));
  let wW = parseInt(d3.select("#workbench").attr("width"));
  let wH = parseInt(d3.select("#workbench").attr("height"));
  let length = wH / workbench.num_snaps;
  let y = wY;

  for (let i = 0; i < workbench.num_snaps; i++) {
    let snap_id = "snap_" + i;
    workbench[snap_id]["brushObject"] = d3.brushY().extent([
      [wX, y],
      [wX + wW, y + length],
    ]);

    let overviewBrushRanges = getBrushRanges(snap_id); //get overlay and selection ranges

    /**
     * calculate how far the selection borders, i.e. the position of the brush handles, are from the brush extend borders
     */
    let borderDistances = [
      overviewBrushRanges[0][0] - overviewBrushRanges[1][0],
      overviewBrushRanges[0][1] - overviewBrushRanges[0][0],
    ];

    /**
     * Utilise the previously computed distances and map them to the workbench extend space,
     * i.e. determine the position of the selection borders of the workbench brushes
     */
    let handlePositions = convertBrushRanges(
      borderDistances,
      overviewBrushRanges[1][1] - overviewBrushRanges[1][0],
      length
    );

    workbench[snap_id]["selectionRange"] = handlePositions; //this shouldn't work, but does, need to fix
    workbench[snap_id]["position"] = [y, length];
    workbench[snap_id]["brush"] = workbench.object
      .append("g")
      .classed("workbenchBrush", true)
      .call(workbench[snap_id]["brushObject"])
      .call(workbench[snap_id]["brushObject"].move, [
        y + handlePositions[0],
        y + handlePositions[0] + handlePositions[1], //
      ]);

    workbench[snap_id]["brush"]
      .select(".selection")
      .attr("fill", workbench[snap_id]["color"]);

    workbench.object
      .append("rect")
      .attr("class", "workbenchDivider")
      .attr("x", overviewMapDepthExt + 100)
      .attr("y", y + handlePositions[0] + handlePositions[1])
      .attr("height", 4)
      .attr("width", chartRef.p.overviewExt + 40)
      .attr("fill", "lightgray");

    workbench[snap_id]["brushObject"].on("end", function () {
      let overviewBrushRanges = getBrushRanges(snap_id); //get overlay and selection ranges
      if (overviewBrushRanges[0][1] === 750) overviewBrushRanges[0][1] = 749;
      updateAnnoViewRange(
        chartRef,
        workbench[snap_id]["ids"],
        overviewBrushRanges[0],
        true
      );
      adjustOverviewBrush(snap_id);
    });

    //draw bars according to overlay range and available space

    //add ranges for new annotationWindows
    //HACK
    if (overviewBrushRanges[0][1] === 750) overviewBrushRanges[0][1] = 749;
    updateAnnoViewRange(
      chartRef,
      workbench[snap_id]["ids"],
      overviewBrushRanges[0]
    );
    y += length;
  }
}

export function drawButtonTree(chart) {
  if (!svg) return 0;

  svg.selectAll(".buttonTreeElement").remove();
  svg.selectAll(".buttonPartitionIndicator").remove();

  const externalPadding = 20;
  const internalPadding = 0.05;

  const xScale = d3
    .scaleBand()
    .domain(d3.range(chart.p.maxNumOverviews))
    .rangeRound([overviewMapDepthExt, externalPadding])
    .paddingInner(internalPadding);

  const buttonWidth = xScale.bandwidth();

  let rootPartition = getActiveBrushesInOverview(chart, 0);

  let treeStack = [
    {
      partition: rootPartition,
      depth: 0,
      y0: 1,
      y1: overviewMapExt - 1,
    },
  ];

  while (treeStack.length > 0) {
    const nextPartitionData = treeStack.shift();
    const nextPartition = nextPartitionData["partition"];
    const overviewDepth = nextPartitionData["depth"];

    const xPos = xScale(overviewDepth);

    const ys = drawButtons(
      chart,
      xPos,
      buttonWidth,
      nextPartitionData["y0"],
      nextPartitionData["y1"],
      nextPartition
    );

    nextPartition.forEach((part) => {
      cascadingButtonIndicatorUpdate(chart, overviewDepth, part);

      const nextButtonFamily = getFamilyOfBrush(chart, part);
      const children = Array.from(nextButtonFamily["children"]);
      const y_pos = ys[part];

      if (children.length > 0) {
        treeStack.push({
          partition: children,
          depth: overviewDepth + 1,
          y0: y_pos["y0"],
          y1: y_pos["y1"],
        });
      }
    });
  }
}

const drawButtons = (chart, x, w, y0, y1, partitions) => {
  const buttonIDPrefix = "button_";

  const n = partitions.length;

  const yScale = d3.scaleBand().domain(d3.range(n)).rangeRound([y0, y1]);
  //.paddingInner(0.005);

  const y_pos = {};

  partitions.forEach((part, idx) => {
    const buttonID = buttonIDPrefix + part;

    const y_part = yScale(idx);
    const h_part = yScale.bandwidth();

    const button = svg
      .append("rect")
      .attr("id", buttonID)
      .attr("class", "buttonTreeElement")
      .attr("x", x)
      .attr("width", w)
      .attr("y", y_part + 1)
      .attr("height", h_part - 1)
      .attr("fill", "lightgray")
      .attr("stroke", "black")
      .attr("stroke-width", "1px")
      .on("click", () => buttonOnClick(chart, buttonID));

    setButtonRefInList(chart, part, {
      x,
      w,
      y: y_part,
      h: h_part,
    });

    y_pos[part] = {
      y0: y_part,
      y1: y_part + h_part,
    };
  });

  return y_pos;
};

const buttonOnClick = (chart, buttonID) => {
  let configData = chart.overviewConfig;

  let key = buttonID.split("_");
  key.shift();

  while (key.length > 1) {
    let partitionKey = key.pop();
    let strippedOverviewKey = key.join("_");

    configData[strippedOverviewKey]["active_partition"] = partitionKey;
  }

  updateOverviewConfig(chart, configData);
  clearOverviewStrips(chart);
};

export function drawButtonIndicator(
  chart,
  indicatorX,
  indicatorY,
  indicatorID,
  drawSplitIndicator
) {
  const [buttonIndicatorID, splitIndicatorID] = constructButtonIndicatorIDs(
    indicatorID
  );
  const oldIndicator = d3.select("#" + buttonIndicatorID);
  if (oldIndicator) oldIndicator.remove();

  svg
    .append("rect")
    .attr("id", buttonIndicatorID)
    .attr("class", "buttonPartitionIndicator")
    .attr("x", indicatorX[0])
    .attr("y", indicatorY[0])
    .attr("width", indicatorX[1] - indicatorX[0])
    .attr("height", indicatorY[1] - indicatorY[0]) //indicatorY[1] - indicatorY[0]
    .attr("fill", "black");

  if (drawSplitIndicator) {
    const oldSplitIndicator = d3.select("#" + splitIndicatorID);
    if (oldSplitIndicator) oldSplitIndicator.remove();

    svg
      .append("circle")
      .attr("id", splitIndicatorID)
      .attr("class", "buttonPartitionIndicator")
      .attr("cx", indicatorX[1] - (indicatorX[1] - indicatorX[0]) / 2)
      .attr("cy", indicatorY[1] - indicatorY[0] + 1)
      .attr("r", (indicatorX[1] - indicatorX[0]) / 2)
      .attr("fill", "black");
  }
}

const constructButtonIndicatorIDs = (indicatorID) => {
  const buttonPrefix = "button_";
  const splitPrefix = "button_split_";
  return [buttonPrefix + indicatorID, splitPrefix + indicatorID];
};
