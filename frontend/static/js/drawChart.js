//region imports
import * as d3 from "d3";
import $ from "jquery"; //Jena
//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
import { typeArray } from "./constants.js";
import * as preprocessData from "./preprocessData.js";
import {
  addMultipleTextviews,
  addTextview,
  cascadingProjection,
  initTextArea,
  replaceTextview,
  resetTextviews,
  updateTextArea,
  updateTextview,
} from "./textArea";
import {
  installZoom,
  installBrush,
  initializeViewAssignment,
} from "./brushSetup.js";
import {
  drawHistogram,
  drawInitialBars,
  drawSecondOverviewBars,
  drawThirdOverviewBars,
} from "./drawBars.js";
import { initializeSliders, bindSliderToBrushes } from "./slider";
import { initializeStates } from "./overviewState.js";
import { buttonOnClick, drawButtonTree } from "./buttons.js";
import {
  ascendingBrushIndicatorUpdate,
  ascendingButtonIndicatorUpdate,
  cascadingBrushIndicatorUpdate,
  cascadingButtonIndicatorUpdate,
  drawRootButtonTreeNodeIndicators,
  projection,
} from "./brushIndicators.js";
import {
  setAnnotationWindows,
  updateAnnoViewRange,
} from "./splitAnnotationWindow.js";
//import {computeTerms} from "./preprocessData";
//endregion

//region constants
//region chart-related constants
// const canvasHeight = window.innerHeight; //height of the canvast

const orientation = "portrait"; //landscape or portrait

//const canvasHeight = 750; //height of the canvas, former 650
//const lsHeight = 1500;
//const ptHeight = parseInt($(window).height() - 50);
//const canvasWidth = orientation === "landscape" ? lsHeight : ptHeight;
//const canvasWidth = (orientation === "landscape") ? $(window).tokenExt() : $(window).height();
const tokenExt = 750; //(landsacpe) width of the annoWindow
const annotatorIdExtension = 40; //space for the annotators IDs
const wordViewExt = 110; //(landscape) height of the token text window
const wordViewConnectorsExt = 20; //height of the connecting polygons
const annotatorBandsExt = 370; //height of the annotators part of the detail window
const annoWindowExt = tokenExt + annotatorIdExtension + 50;
const annotatorExt =
  wordViewExt + wordViewConnectorsExt + annotatorBandsExt + 50;
const [annoWindowWidth, annoWindowHeight] =
  orientation === "landscape"
    ? [annoWindowExt, annotatorExt]
    : [annotatorExt, annoWindowExt];

/**
 * OVERVIEW RELATED CONSTANTS
 */
const maxNumOverviews = 3;
const maxNumBrushes = 3;
const maxNumSliders = maxNumBrushes - 1;
const maxNumTextViews = maxNumBrushes;

const overviewExt = 40; //height of an overview strip
const sliderSpace = 15; //space for sliders
const overviewHandleExt = 40; //space for the handles
const overviewStripsExt = tokenExt + overviewHandleExt;
const stripsExt = (maxNumOverviews + 1) * (overviewExt + sliderSpace);
const [overviewStripsWidth, overviewStripsHeight] =
  orientation === "landscape"
    ? [overviewStripsExt, stripsExt]
    : [stripsExt, overviewStripsExt];
const buttonsWidth = 500;
const indicatorPadding = 5;
const indicatorMinHeight = 2;
const indicatorYFunction = d3
  .scaleBand()
  .domain([...Array(maxNumOverviews).keys()])
  .range([indicatorPadding, overviewExt]);
const indicatorH = Math.max(
  indicatorMinHeight,
  overviewExt / maxNumOverviews - indicatorPadding
);
const indicatorShader = d3
  .scaleLinear()
  .domain([...Array(maxNumOverviews).keys()])
  .range(["black", "gray"]);

const splitIndicatorSize =
  Math.max(indicatorMinHeight, overviewExt / maxNumOverviews) / 2;

const buttonTreeIndicatorSize = 10;
const buttonTreeClass = "buttonTreeElement";
const buttonTreeIDPrefix = "button_";
const rootButtonClassSuffix = "root";

const activeNodeClass = "active-node";
const activeSiblingClass = "active-sibling";
const activeRelativeClass = "active-relative";
const activePredecClass = "active-predec";
const defaultBrushNodeClass = "O0";
const defaultButtonNodeClass = "buttonTreeElement";
const activeBrushStrokeColor = "gold";

const parentBrushPlaceholderID = -1;
const workbenchBrushSortingOrder = "inorder";
//const margins = {
//  top: 0, //former 20
//  right: 0,
//  left: 0, //former 40
//  //overviewDetail: 20, //between overview and detail window - obsolete with grid
//}; //margins
//const tokenExt = canvasWidth - margins.left - margins.right;
//const extraWidth = 100; //?

const ds_StdDevFactor = 0.7; //dropshadow standard deviation
const overlapMargin = 10; //prevent right/left borders for cut annos
const minimalBrush = 5; //smallest brush (# overview-units) allowed when zooming
//endregion

//region token-related constants
const lowerTokenThreshold = 7; //minimal tokenExt of a non-annotated token
const magFactor = 0.7; //magnification factor for annotated tokens, in [0,1]
const xScaleTokenText = d3.scaleBand().range([0, tokenExt]);
//endregion

//region term-related constans
const xScaleTerms = d3.scaleBand().range([0, tokenExt]);
const minTermWidth = 20;
const numOfTerms = Math.floor(tokenExt / minTermWidth);
const gthSpacer = 4; //gap on top of the tool
const globalTermHeight = wordViewExt - gthSpacer;
const termIndicatorHeight = wordViewExt + globalTermHeight + 9;
const termTickLength = 5; //length of the termIndicator-ticks
const indConnector = 10; //length of the vertical connector-line
const termFontSize = 12;
const termFrameTicks = (minTermWidth - termFontSize - 2) / 2; //length of the frame-remainder with gap
const textDisplacement = 5;
const termFreeze = false;
//endregion

//region annotation-related constants
const annoMaxHPadding = 10; //distance of an anno to the token-border (upper bound)
const annoHPaddingFactor = 0.3; //proportion of a tokenwidth to be used as padding
const minTypeHeight = 3; //minimal height of a non-reduced type-bar
const numOfTypes = typeArray.length; //number of annotation types in the project
const annoHeight = minTypeHeight * numOfTypes; //height of an annotation-bar
const shortAnnoHeight = 5; //height of an annotation-bar in compressed mode (atomic)
const shortAnnoHeight_sa = 5; //height of an annotation-bar in compressed mode (semiaggregated)
const maxLevelsCompUncomp = 3; //max. number of overlapping annos separated for type
const annoMinVPadding = 4; //minimal distance between the annotation layers of a user
const annoMinVPadding2 = 2; //minimal distance between the pseudoChunk layers of a user
const userHeight =
  (maxLevelsCompUncomp + 1) * annoMinVPadding +
  maxLevelsCompUncomp * annoHeight; //height of a user layer
const freeSpace = 0.2; //percentage of userHeight that should be left free in (semi-)aggregated mode
const spaceForAnnos = userHeight * (1 - freeSpace); //usable height in (semi-)aggregated mode
const maxLevelsSupercompComp = Math.floor(
  (userHeight - annoMinVPadding) / (annoMinVPadding + shortAnnoHeight)
); //max. number of overlapping annos in compressed mode
const typeStrokeWidth = 1;
const binAnnosHeight = 1; //height of annos cut by bin
const limitBinAnnos = 3; //maximal number of annos cut by bin to be displayed singularly
const maxLevelsSupercompCompAgg = Math.min(
  limitBinAnnos,
  Math.floor(
    (spaceForAnnos - annoMinVPadding2) / (annoMinVPadding2 + binAnnosHeight)
  )
); //maximal displayable lBA
//endregion

//region bin-related constants
const xScaleTokens_Bins = d3.scaleBand().range([0, tokenExt]);
//endregion

const minWindowSize = 150;

//region JENA: slider related constants
var sliderWidth = 0;
var sliderHeight = 0;
var sliderHandleWidth = 0;
//endregion
//endregion

//region auxilliary functions
function defineShadowAndGradient(chart, dist) {
  var filterDefs = chart.e.detail.append("defs");
  var filter = filterDefs
    .append("filter")
    .attr("filterUnits", "userSpaceOnUse")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", chart.p.tokenExt)
    .attr("height", chart.p.userHeight + dist)
    .attr("id", "dropshadow");

  filter
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", "0, " + dist * ds_StdDevFactor)
    .attr("result", "blur");

  filter
    .append("feOffset")
    .attr("in", "blur")
    .attr("dx", 0)
    .attr("dy", dist * (1 - ds_StdDevFactor))
    .attr("result", "offsetBlur");

  var feMerge = filter.append("feMerge");

  feMerge.append("feMergeNode").attr("in", "offsetBlur");

  feMerge.append("feMergeNode").attr("in", "SourceGraphic");
}

function addOverviewCollapse(chart, overviewID) {
  let collapseObject = drawOverviewCollapse(chart, overviewID);
  chart.overviews[overviewID]["collapse"]["object"] =
    collapseObject["collapse"];
  chart.overviews[overviewID]["collapse"]["label"] = collapseObject["label"];
  chart.overviews[overviewID]["collapse"]["isDrawn"] = true;
}

function drawOverviewBackground(chart, overviewID) {
  let backgroundObject = drawCompleteOverviewBackground(
    chart.overviews[overviewID]["stripGroup"]
  );
  chart.overviews[overviewID]["background"] = backgroundObject["background"];
  chart.overviews[overviewID]["backgroundRects"] = backgroundObject["rects"];
  chart.overviews[overviewID]["slider"]["svg"] = backgroundObject["slider"];
}

function initializeOverviews(numOverviews) {
  let newOverviewObject = {};
  for (let i = 0; i < numOverviews; i++) {
    const overviewID = i;
    newOverviewObject[overviewID] = {
      drawn: false,
      stripGroup: "", //replaces chart.overview
      //origin: computeOverviewOrigin(overviewID), //replaces overviewYPos
      brushes: new Array(maxNumBrushes).fill(null),
      brushGroup: new Array(maxNumBrushes).fill(null), //replaces overviewBrush
      splits: new Array(maxNumBrushes - 1).fill(null),
      background: "",
      backgroundRects: "",
      slider: {
        svg: "",
        object: "",
      },
      collapse: {
        isDrawn: false,
        object: "",
        label: "",
      },
    };
  }

  return newOverviewObject;
}

function resetOverviews(chart) {
  d3.selectAll(".overview_group").remove();
  chart.overviews = initializeOverviews(maxNumOverviews);
}

function renderOverview(chart, overviewID) {
  if (chart.overviews[overviewID]["stripGroup"].length === 0) {
    drawStripGroup(chart, overviewID);
    drawOverviewBackground(chart, overviewID);
  }
  if (chart.overviews[overviewID]["collapse"]["isDrawn"] === true) {
    removeCollapseAndDrawBackground(chart, overviewID);
  }
}

export function clearOverviewStrips(chart) {
  initializeSliders(chart);
  resetOverviews(chart);

  let configKey = "0";
  let overviewDepth = 0;

  for (
    overviewDepth;
    overviewDepth < chart.p.maxNumOverviews;
    overviewDepth++
  ) {
    let configData = chart.overviewConfig[configKey];

    if (!configData || configData["num_active_partitions"] === 0) {
      break;
    }

    renderOverview(chart, overviewDepth);

    if (overviewDepth <= 1) {
      drawHistogram(chart, [0, chart.p.tokenExt], 0);
    }
    if (overviewDepth > 1) {
      if (
        chart.overviews[overviewDepth - 1] &&
        chart.overviews[overviewDepth - 1]["backgroundRects"]
      ) {
        const activePartition = getActiveBrushInOverview(
          chart,
          overviewDepth - 2
        );
        const parentBrushKey = getBrushConfigKey(
          chart,
          overviewDepth - 2,
          activePartition
        );
        let convertedBrushData = cascadingProjection(chart, parentBrushKey);
        drawHistogram(chart, convertedBrushData[1], overviewDepth - 1);
      }
    }

    let partitions = configData["last_brush_config"];

    Object.keys(partitions).forEach((partKey, idx) => {
      let brushKey = partitions[partKey]["brushKey"];
      let stored = getBrushState(chart, brushKey);
      let brushData = {
        brushNr: partKey,
        overlay: stored["overlay"],
        selection: stored["selection"],
        /* overlay: partitions[partKey]["overlay"],
        selection: partitions[partKey]["selection"], */
      };
      installBrush(chart, overviewDepth, brushData);

      let splitPos = stored["overlay"][1] + 1;
      //let splitPos = partitions[partKey]["overlay"][1] + 1;
      if (splitPos < chart.p.tokenExt)
        bindSliderToBrushes(chart, splitPos, overviewDepth, idx);
    });

    let currNumSliders = configData["num_active_partitions"] - 1;
    for (let i = chart.p.maxNumSliders - 1; i >= currNumSliders; i--) {
      bindSliderToBrushes(chart, chart.p.tokenExt, overviewDepth, i);
    }

    configKey = configKey + "_" + configData["active_partition"];
  }

  if (overviewDepth < chart.p.maxNumOverviews) {
    addInitialCollapseOverview(chart, overviewDepth);
  }

  drawButtonTree(chart);
  //redrawCurrentActivation(chart);
}
//endregion

//region main functions
export function initializeChart() {
  const chart = {};
  chart.p = {
    //parameters that should be available with the chart
    //margins,
    annoHPaddingFactor,
    annoHeight,
    annoMaxHPadding,
    annotatorBandsExt,
    annotatorExt,
    binAnnosHeight,
    buttonsWidth,
    freeSpace,
    globalTermHeight,
    indConnector,
    lowerTokenThreshold,
    magFactor,
    maxLevelsCompUncomp,
    maxLevelsSupercompComp,
    maxLevelsSupercompCompAgg,
    maxNumOverviews,
    maxNumBrushes,
    maxNumSliders,
    indicatorH,
    indicatorYFunction,
    indicatorShader,
    splitIndicatorSize,
    activeNodeClass,
    activeSiblingClass,
    activeRelativeClass,
    activePredecClass,
    defaultBrushNodeClass,
    defaultButtonNodeClass,
    buttonTreeIndicatorSize,
    buttonTreeClass,
    buttonTreeIDPrefix,
    rootButtonClassSuffix,
    parentBrushPlaceholderID,
    workbenchBrushSortingOrder,
    activeBrushStrokeColor,
    minimalBrush,
    numOfTerms,
    orientation,
    overlapMargin,
    overviewExt,
    shortAnnoHeight,
    shortAnnoHeight_sa,
    sliderHandleWidth,
    sliderHeight,
    sliderWidth,
    spaceForAnnos,
    termFontSize,
    termFrameTicks,
    termFreeze,
    termIndicatorHeight,
    termTickLength,
    textDisplacement,
    tokenExt,
    typeStrokeWidth,
    userHeight,
    wordViewConnectorsExt,
    wordViewExt,
    xScaleTerms,
    xScaleTokenText,
    xScaleTokens_Bins,
  };

  chart.e = {}; //the property storing all svg-elements

  //region annoWindow-initialisation
  chart.e.annoWindow = d3
    .select("body")
    .append("svg")
    .attr("id", "annoWindow_s")
    //set the viewport-width explicitly (safer)
    .attr("width", annoWindowWidth)
    .attr("viewBox", `0 0 ${annoWindowWidth} ${annoWindowHeight}`);
  if (orientation === "portrait") {
    let aRotLength = Math.min(annoWindowWidth, annoWindowHeight) / 2;
    chart.e.annoWindow = chart.e.annoWindow
      .append("g")
      .attr("transform", `rotate (90, ${aRotLength}, ${aRotLength})`);
  }

  chart.e.annoWindow
    .append("defs")
    .append("clipPath") //define a mask for the detail window
    .attr("id", "clipD")
    .append("rect")
    .attr("width", tokenExt)
    .attr("height", annotatorExt);

  //chart.svg.append("defs").append("clipPath") //define a mask for the overview window
  //    .attr("id", "clipO")
  //    .append("rect")
  //    .attr("tokenExt", tokenExt)
  //    .attr("height", overviewExt);

  chart.e.drag = chart.e.annoWindow.append("g").attr("id", "drag_g");

  chart.e.detail = chart.e.annoWindow
    .append("g") //the detail window (with clip path) moved for margin
    .attr("id", "detail_g")
    //.attr("transform", "translate(" + margins.left + "," + margins.top + ")")
    .attr("clip-path", "url(#clipD)");

  chart.e.detail
    .append("rect") //a background-rect for the detail-window
    .attr("width", tokenExt)
    .attr("height", annotatorExt)
    .attr("id", "detailBg_r");

  //the groups of the aggregated tokens/bins (background), the texts & connecting polygons
  chart.e.detailBackground = chart.e.detail
    .append("g")
    .attr("id", "detailBg_g");
  chart.e.detailBgTokens_Bins = chart.e.detailBackground
    .append("g")
    .attr("id", "detailBgTB_g");
  //.attr("transform", `translate(0, ${wordViewExt + wordViewConnectorsExt})`);
  //chart.tokenPolygons = chart.e.detailBackground.append("g").attr("id", "tokenPol_g")
  //    .attr("transform", `translate(0, ${wordViewExt})`);
  chart.terms = chart.e.detailBackground.append("g").attr("id", "terms_g");

  ////a rect as listener for double-clicks
  //chart.e.termNav = chart.terms.append("rect")
  //    .attr("x", 0)
  //    .attr("y", chart.p.wordViewExt)
  //    .attr("tokenExt", chart.p.tokenExt)
  //    .attr("height", chart.p.wordViewConnectorsExt)
  //    .style("fill", "none")
  //    .style("pointer-events", "visible");

  //the group of all user tokens/annos (foreground)
  chart.detailForeground = chart.e.detail
    .append("g")
    .attr("id", "detailFG")
    .attr("transform", `translate(0, ${wordViewExt + wordViewConnectorsExt})`);
  //endregion

  chart.e.overviewStrips = d3
    .select("body")
    .append("svg")
    .attr("id", "overviewStrips_s")
    .attr("width", overviewStripsWidth)
    .attr("viewBox", `0 0 ${overviewStripsWidth} ${overviewStripsHeight}`);
  if (orientation === "portrait") {
    var oSRotLength = Math.min(overviewStripsWidth, overviewStripsHeight) / 2;
    chart.e.overviewStrips = chart.e.overviewStrips
      .append("g")
      .attr("transform", `rotate (90, ${oSRotLength}, ${oSRotLength})`);
  }
  //endregion

  //region overview-initialisation MB ?
  chart.overviews = initializeOverviews(maxNumOverviews);

  chart.overviewConfig = {};
  chart.overviewConfig["0"] = {
    num_active_partitions: 0,
    active_partition: 0,
    last_brush_config: {},
    last_slider_config: {},
  };

  chart.brushRanges = {};

  chart.textViews = {};

  chart.brushFamilyMap = {};

  chart.indicatorMap = {};

  chart.buttonList = {};

  chart.activeNodes = {};

  chart.workbench = {
    strip: "",
    workBenchBrushes: {},
    numActive: 0,
    linkedKeys: [],
  };

  chart.nodeActivityMode = "overview";

  return chart;
}

export function fillChart(chart, rawData) {
  //get the data in the appropriate form and append to chart
  var data = preprocessData.cleanUpData(rawData, false);
  var users = preprocessData.computeUsers(data),
    tokens = preprocessData.computeTokens(data),
    [annos, chunks] = preprocessData.computeAnnosAndChunks(data);

  preprocessData.updateTokensWithAnnos(tokens, annos); //necessary since annos are computed after tokens

  var bins = preprocessData.computeBins(chart.p.tokenExt, tokens),
    binMaxima = preprocessData.computeBinMaxima(minWindowSize, tokens);
  var spans = [];
  var spanIDTable = {};

  chart.d = {
    users,
    tokens,
    annos,
    chunks,
    bins,
    binMaxima,
    spans,
    spanIDTable,
  };

  preprocessData.computeTerms(chart);

  //the groups for the users, position in array codes succession in chart from top to bottom
  var users = chart.d.users;
  var l = users.length;
  var dist = (annotatorBandsExt - l * userHeight) / (l + 1);

  defineShadowAndGradient(chart, dist);

  chart.userLayers = chart.detailForeground
    .selectAll("g")
    .data(users)
    .enter()
    .append("g")
    .attr("id", function (d) {
      return "userLayerG" + d;
    })
    .attr("transform", function (d, i) {
      var offset = dist * (i + 1) + i * userHeight;
      return "translate(" + 0 + "," + offset + ")";
    });

  //background-rects for each user-layer
  chart.userLayers
    .append("rect")
    .attr("x", 0)
    .attr("width", chart.p.tokenExt)
    .attr("y", 0)
    .attr("height", chart.p.userHeight)
    .attr("class", "userLayerBG")
    .attr("filter", "url(#dropshadow)");

  //the groups for the token/bin-rects per user
  chart.userTokens_Bins = chart.userLayers.append("g").attr("id", function (d) {
    return "userTokens_BinsG" + d;
  });

  //the groups for the anno/token-marks per user
  chart.userAnnos = chart.userLayers.append("g").attr("id", function (d) {
    return "userAnnosG" + d;
  });

  //the groups for the atomic frames per user
  chart.userAtomicFrames = chart.userLayers
    .append("g")
    .attr("id", function (d) {
      return "userAtomicFrames" + d;
    });

  //the groups for the anno-chunks (g) per user
  chart.chunks = chart.userLayers.append("g").attr("id", function (d) {
    return "chunksG" + d;
  });

  chart.userLayers
    .append("rect")
    .attr("x", 0)
    .attr("width", chart.p.tokenExt)
    .attr("y", 0)
    .attr("height", chart.p.userHeight)
    .attr("stroke-dasharray", `${chart.p.tokenExt}, ${chart.p.userHeight}`)
    .attr("class", "userLayerBG_stroke");
}

//export function computeOverviewOrigin(pos) {
//  return pos * 3 * margins.overviewDetail;
//}

export function drawStripGroup(chart, overviewID) {
  //let yShift = computeOverviewOrigin(pos);
  const pos = overviewID;
  const id = "overview_group_" + overviewID;
  chart.overviews[overviewID]["stripGroup"] = chart.e.overviewStrips
    .append("g") //transform-group for stacking the overview strips at the right positions
    .attr("id", id)
    .attr("class", "overview_group")
    .attr(
      "transform",
      `translate (0, ${pos * (overviewExt + sliderSpace)} )`
      //"translate(" +
      //  margins.left +
      //  "," +
      //  (margins.top + detailHeight + margins.overviewDetail + yShift) +
      //  ")"
    );
}

export function removeWorkbenchBrushViaBrushKey(chart, brushKey) {
  const workbenchIndex = chart.workbench["linkedKeys"].indexOf(brushKey);
  if (workbenchIndex > -1) {
    removeWorkbenchBrush(chart, workbenchIndex);
  }
}

function removeWorkbenchBrush(chart, workbenchID) {
  chart.workbench["linkedKeys"].splice(workbenchID, 1);
  chart.workbench["numActive"] = chart.workbench["numActive"] - 1;
  redrawWorkbench(chart);
  if (chart.nodeActivityMode === "workbench") {
    addMultipleTextviews(chart, chart.workbench["linkedKeys"]);
  }
}

export function addWorkBenchbrush(chart, linkedBrushKey) {
  drawWorkbenchStrip(chart);
  const sameSubtreeNodePos = isPartOfSubtree(chart, linkedBrushKey);
  if (sameSubtreeNodePos === -1) {
    chart.workbench["linkedKeys"].push(linkedBrushKey);
    chart.workbench["numActive"] = chart.workbench["numActive"] + 1;
  } else {
    oldKey = chart.workbench["linkedKeys"][sameSubtreeNodePos];
    chart.workbench["linkedKeys"][sameSubtreeNodePos] = linkedBrushKey;
  }

  if (chart.p.workbenchBrushSortingOrder === "inorder") {
    chart.workbench["linkedKeys"] = sortBrushKeysInorder(
      chart.workbench["linkedKeys"]
    );
  } else {
    chart.workbench["linkedKeys"] = sortBrushKeysLevelorder(
      chart.workbench["linkedKeys"]
    );
  }

  for (
    let workBenchBrushID = 0;
    workBenchBrushID < chart.workbench["numActive"];
    workBenchBrushID++
  ) {
    const linkedKey = chart.workbench["linkedKeys"][workBenchBrushID];
    drawWorkBenchBrush(chart, workBenchBrushID, linkedKey);
  }

  if (chart.nodeActivityMode === "workbench") {
    addMultipleTextviews(chart, chart.workbench["linkedKeys"]);
  }
  redrawCurrentActivation(chart);
}

export function drawWorkBenchBrush(chart, workBenchBrushID, linkedBrushKey) {
  const workBenchYScale = d3
    .scaleBand()
    .domain(d3.range(chart.workbench["numActive"]))
    .rangeRound([0, tokenExt]);

  const y = workBenchYScale(workBenchBrushID);
  const height = workBenchYScale.bandwidth();
  //console.log(`brush:${workBenchBrushID}, y:${y}, height:${height}`);

  const linkedBrushData = getBrushState(chart, linkedBrushKey);
  const linkedBrushRefL =
    linkedBrushData["overlay"][1] - linkedBrushData["overlay"][0];
  const linkedBrushX1 =
    linkedBrushData["selection"][0] - linkedBrushData["overlay"][0];
  const linkedBrushX2 =
    linkedBrushData["selection"][1] - linkedBrushData["overlay"][0];

  const convertedSelectionRange = projection(linkedBrushRefL, height, y, [
    linkedBrushX1,
    linkedBrushX2,
  ]);

  const brushClass = chart.activeNodes[linkedBrushKey]
    ? chart.activeNodes[linkedBrushKey]
    : "O0";

  chart.workbench["workBenchBrushes"][workBenchBrushID] = {
    linkedBrushKey,
    objects: {
      brushGroup: "",
      brush: "",
      background: "",
      rects: "",
    },
  };

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
    "background"
  ] = chart.workbench["strip"]
    .append("rect")
    .attr("class", "overviewBg_r")
    .attr("x", y)
    .attr("y", 0)
    .attr("width", height)
    .attr("height", overviewExt);

  if (y > 0) {
    //y + height < chart.p.tokenExt - 1
    /* chart.workbench["strip"]
      .append("circle")
      .attr("class", "workbenchIndicator")
      .attr("cx", y - 1)
      .attr("cy", overviewExt / 2 - 5)
      .attr("r", 10)
      .attr("fill", "black"); */
    chart.workbench["strip"]
      .append("rect")
      .attr("class", "workbenchIndicator")
      .attr("x", y - 2)
      .attr("y", 0)
      .attr("width", 4)
      .attr("height", overviewExt)
      .attr("fill", "gray");
  }

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
    "rects"
  ] = chart.workbench["strip"].append("g");

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
    "brushGroup"
  ] = chart.workbench["strip"]
    .append("g")
    .attr("id", "workbenchBrush_" + linkedBrushKey)
    .attr("class", "O0");

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"]["brush"] = d3
    .brushX()
    .extent([
      [y, 0],
      [y + height, overviewExt],
    ])
    .on("end", () => {
      const wbX = parseInt(
        chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
          "brushGroup"
        ]
          .select(".selection")
          .attr("x")
      );
      const wbW =
        wbX +
        parseInt(
          chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
            "brushGroup"
          ]
            .select(".selection")
            .attr("width")
        );
      const refBrushData = getBrushState(chart, linkedBrushKey);
      const refBrushL = refBrushData["overlay"][1] - refBrushData["overlay"][0];
      const refBrushX = refBrushData["overlay"][0];

      const transformedWB = projection(height, refBrushL, refBrushX, [
        wbX - y,
        wbW - y,
      ]);
      updateLinkedBrush(chart, linkedBrushKey, {
        overlay: refBrushData["overlay"],
        selection: transformedWB,
      });
      updateTextview(chart, linkedBrushKey);
      if (chart.nodeActivityMode === "workbench") {
        updateAnnoViewRange(chart, linkedBrushKey, true);
      }
      //clearOverviewStrips(chart);
    });

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
    "brushGroup"
  ].on("click", () => workbenchBrushOnClick(chart, linkedBrushKey));

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
    "brushGroup"
  ].on("contextmenu", () => {
    workbenchContextMenu(
      chart,
      chart.workbench["strip"],
      workBenchBrushID,
      y + height / 2 - 75,
      0
    ); //(y_part + h_part) / 2
    d3.event.preventDefault();
  });

  chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"]["brushGroup"]
    .call(
      chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"]["brush"]
    )
    .call(
      chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"]["brush"]
        .move,
      [convertedSelectionRange[0], convertedSelectionRange[1]]
      //[y, y + height]
    );

  if (chart.p.orientation === "portrait") {
    chart.workbench["workBenchBrushes"][workBenchBrushID]["objects"][
      "brushGroup"
    ]
      .selectAll(".handle")
      .attr("cursor", "ns-resize");
  }
}

export function updateLinkedBrush(chart, brushKey, newBrushData) {
  const split = brushKey.split("_");
  split.shift();
  const overviewDepth = split.length - 1;
  const partitionKey = split[split.length - 1];

  setBrushState(chart, brushKey, newBrushData);
  if (!d3.select("#brush_" + brushKey).empty()) {
    const brush = chart.overviews[overviewDepth]["brushes"][partitionKey];
    const brushObj = chart.overviews[overviewDepth]["brushGroup"][partitionKey];
    brushObj.call(brush.move, newBrushData["selection"]);
  }
  cascadingBrushIndicatorUpdate(chart, overviewDepth, partitionKey, brushKey);
  ascendingBrushIndicatorUpdate(chart, overviewDepth, partitionKey, brushKey);
  ascendingButtonIndicatorUpdate(chart, overviewDepth, partitionKey, brushKey);
  drawRootButtonTreeNodeIndicators(chart);
}

export function redrawWorkbench(chart) {
  drawWorkbenchStrip(chart);
  let keys = chart.workbench["linkedKeys"];
  keys.forEach((linkedKeys, idx) => {
    //let brushKey = chart.workbench["workBenchBrushes"][wbKey]["linkedBrushKey"];
    drawWorkBenchBrush(chart, idx, linkedKeys);
  });
}

export function drawWorkbenchStrip(chart) {
  const pos = stripsExt - overviewExt;
  const id = "workbench_strip";

  if (!d3.select("#" + id).empty()) {
    d3.select("#" + id).remove();
  }

  if (!d3.selectAll(".workbenchBrush").empty()) {
    d3.selectAll(".workbenchBrush").remove();
  }

  chart.workbench["strip"] = chart.e.overviewStrips
    .append("g") //transform-group for stacking the overview strips at the right positions
    .attr("id", id)
    .attr("class", "overview_group")
    .attr(
      "transform",
      `translate (0, ${pos} )`
      //"translate(" +
      //  margins.left +
      //  "," +
      //  (margins.top + detailHeight + margins.overviewDetail + yShift) +
      //  ")"
    );
}

function drawOverviewCollapse(chart, overviewID) {
  const overview = chart.overviews[overviewID]["stripGroup"];
  const expandBtnW = 40;
  const expandBtnH = 30;
  const labelSize = 16;
  return {
    collapse: overview
      .append("rect")
      .attr("class", "overview_collapse")
      .attr("x", tokenExt / 2 - expandBtnW / 2)
      .attr("y", 0)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("width", expandBtnW)
      .attr("height", expandBtnH)
      .attr("fill", "black")
      .on("click", function () {
        expandCollapsedOverview(chart, overviewID);
      }),

    label: overview
      .append("text")
      .attr("x", tokenExt / 2 - expandBtnW / 2 + 15)
      .attr("y", expandBtnH / 2 + 5)
      .attr("fill", "white")
      .style("font-size", labelSize + "px")
      .style("font-weight", "bold")
      .text("+"),
  };
}

export function drawCompleteOverviewBackground(overview) {
  return {
    background: overview
      .append("rect")
      .attr("class", "overviewBg_r")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", tokenExt)
      .attr("height", overviewExt),
    //.attr("id", backgroundID),

    rects: overview.append("g"),
    slider: overview //MB TODO replace by group
      .append("svg")
      .attr("width", tokenExt + 40)
      .attr("height", overviewExt + 40 * maxNumOverviews),
  };
}

export function drawInitialOverview(chart) {
  drawStripGroup(chart, 0);
  drawOverviewBackground(chart, 0);
  drawInitialBars(chart);

  initTextArea(chart, "0_0");

  installZoom(chart); //MB currently defucnt

  initializeViewAssignment(chart, maxNumTextViews);

  installBrush(chart, 0, {
    brushNr: 0,
    overlay: [0, chart.p.tokenExt],
    selection: [0, chart.p.tokenExt],
  });
  initializeSliders(maxNumOverviews, maxNumSliders);
  for (let i = maxNumSliders - 1; i >= 0; i--) {
    bindSliderToBrushes(chart, chart.p.tokenExt, 0, i);
  }
  initializeStates(chart);
}

export function addInitialCollapseOverview(chart, overviewID) {
  if (overviewID >= maxNumOverviews) return 0;
  //TO DO: CHECK IF ALREADY INITIALIZED/COLLAPSED
  drawStripGroup(chart, overviewID);
  addOverviewCollapse(chart, overviewID);
}

export function removeCollapseAndDrawBackground(chart, overviewID) {
  chart.overviews[overviewID]["collapse"]["object"].remove();
  chart.overviews[overviewID]["collapse"]["label"].remove();
  chart.overviews[overviewID]["collapse"]["isDrawn"] = false;
  drawOverviewBackground(chart, overviewID);
}

export function expandCollapsedOverview(chart, overviewID) {
  removeCollapseAndDrawBackground(chart, overviewID);

  /* if (overviewID === 1) {
    drawSecondOverviewBars(
      chart,
      [0, chart.d.bins.length],
      [0, chart.d.tokens.length]
    );
  }
  if (overviewID === 2) {
    drawThirdOverviewBars(
      chart,
      [0, chart.d.bins.length],
      [0, chart.d.tokens.length]
    );
  } */

  addOverviewConfig(chart, overviewID);
  installBrush(chart, overviewID, {
    brushNr: 0,
    overlay: [0, chart.p.tokenExt],
    selection: [0, chart.p.tokenExt],
  });
  for (let i = maxNumSliders - 1; i >= 0; i--) {
    bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, i);
  }

  addInitialCollapseOverview(chart, overviewID + 1);

  const activePartition = getActiveBrushInOverview(chart, overviewID - 1);
  const parentBrushKey = getBrushConfigKey(
    chart,
    overviewID - 1,
    activePartition
  );
  //let parentBrushData = getBrushState(chart, parentBrushKey);
  let convertedBrushData = cascadingProjection(chart, parentBrushKey);
  drawHistogram(chart, convertedBrushData[1], overviewID);
}

function addOverviewConfig(chart, overviewNr) {
  let overviewConfigKey = "0";
  for (let i = 0; i < overviewNr && i < maxNumOverviews; i++) {
    const active = chart.overviewConfig[overviewConfigKey]["active_partition"];
    overviewConfigKey += "_" + active;
  }
  //overviewConfigKey += String(overviewNr);

  chart.overviewConfig[overviewConfigKey] = {
    num_active_partitions: 0,
    active_partition: 0,
    last_brush_config: {},
    last_slider_config: {},
  };
}

function getOverviewConfigKey(chart, overviewNr) {
  let overviewConfigKey = "0";
  for (let i = 0; i < overviewNr && i < maxNumOverviews; i++) {
    const active = chart.overviewConfig[overviewConfigKey]["active_partition"];
    overviewConfigKey += "_" + active;
  }
  //overviewConfigKey += String(overviewNr);

  return overviewConfigKey;
}

export function getOverviewPartitionConfig(chart, overviewNr) {
  let overviewConfigKey = getOverviewConfigKey(chart, overviewNr);

  return chart.overviewConfig[overviewConfigKey];
}

export function setOverviewPartitionConfig(chart, overviewNr, partitionInfo) {
  let overviewConfigKey = getOverviewConfigKey(chart, overviewNr);

  chart.overviewConfig[overviewConfigKey] = partitionInfo;
}

export function setOverviewPartitionConfigViaPath(
  chart,
  overviewNr,
  path,
  partitionInfo
) {
  let overviewConfigKey = "";
  for (let i = 0; i < path.length; i++) {
    overviewConfigKey += path[i] + "_";
  }
  overviewConfigKey += String(overviewNr);

  chart.overviewConfig[overviewConfigKey] = partitionInfo;
}

export function updateOverviewConfig(chart, newOverviewConfig) {
  chart.overviewConfig = newOverviewConfig;
}

export function getActiveBrushesInOverview(chart, overviewNr) {
  let overviewConfigKey = getOverviewConfigKey(chart, overviewNr);
  let activeKeyData =
    chart.overviewConfig[overviewConfigKey]["last_brush_config"];
  let activeBrushKeys = Array.from(Object.keys(activeKeyData));
  activeBrushKeys = activeBrushKeys.map((key) => overviewConfigKey + "_" + key);

  return activeBrushKeys;
}

export function getActiveBrushInOverview(chart, overviewNr) {
  let overviewConfigKey = getOverviewConfigKey(chart, overviewNr);
  let activePartition =
    chart.overviewConfig[overviewConfigKey]["active_partition"];

  return activePartition;
}

export function getBrushConfigKey(chart, overviewNr, brushPartition) {
  let brushConfigKey = "0";
  for (let i = 0; i < overviewNr && i < maxNumOverviews; i++) {
    const active = chart.overviewConfig[brushConfigKey]["active_partition"];
    brushConfigKey += "_" + active;
  }
  brushConfigKey += "_" + String(brushPartition);

  return brushConfigKey;
}

export function getBrushPartitionFromKey(brushKey) {
  const split = brushKey.split("_");
  return split[split.length - 1];
}

export function getBrushStateWithoutKey(chart, overviewNr, brushPartition) {
  let brushConfigKey = getBrushConfigKey(chart, overviewNr, brushPartition);
  let brushData = chart.brushRanges[brushConfigKey];

  return brushData;
}

export function setBrushStateWithoutKey(
  chart,
  overviewNr,
  brushPartition,
  brushData
) {
  let brushConfigKey = getBrushConfigKey(chart, overviewNr, brushPartition);
  chart.brushRanges[brushConfigKey] = brushData;
}

export function getBrushState(chart, brushConfigKey) {
  let brushData = chart.brushRanges[brushConfigKey];

  return brushData;
}

export function setBrushState(chart, brushConfigKey, brushData) {
  chart.brushRanges[brushConfigKey] = brushData;
}

export function addBrushToFamilyMap(chart, overviewNr, brushPartition) {
  let parentBrushID = chart.p.parentBrushPlaceholderID;
  if (overviewNr > 0) {
    let parentOverviewConfig = getOverviewPartitionConfig(
      chart,
      overviewNr - 1
    );
    let parentBrushPartition = parentOverviewConfig["active_partition"];
    parentBrushID = getBrushConfigKey(
      chart,
      overviewNr - 1,
      parentBrushPartition
    );
  }
  let brushID = getBrushConfigKey(chart, overviewNr, brushPartition);

  if (!chart.brushFamilyMap[brushID]) {
    chart.brushFamilyMap[brushID] = {
      parent: parentBrushID,
      siblings: new Set([]),
      children: new Set([]),
    };
  }
}

export function addChildBrushToFamilyMap(chart, overviewNr, brushPartition) {
  if (overviewNr === 0) {
    return 0;
  }
  let parentOverviewConfig = getOverviewPartitionConfig(chart, overviewNr - 1);
  let parentBrushPartition = parentOverviewConfig["active_partition"];
  let parentBrushID = getBrushConfigKey(
    chart,
    overviewNr - 1,
    parentBrushPartition
  );
  let childBrushID = getBrushConfigKey(chart, overviewNr, brushPartition);

  chart.brushFamilyMap[parentBrushID]["children"].add(childBrushID);
}

export function addSiblingBrushToFamilyMap(chart, overviewNr, brushPartition) {
  let overviewConfig = getOverviewPartitionConfig(chart, overviewNr);
  let num_active_partitions = overviewConfig["num_active_partitions"];

  let brushID = getBrushConfigKey(chart, overviewNr, brushPartition);

  for (let i = 0; i < num_active_partitions; i++) {
    if (i != brushPartition) {
      let siblingPartition = i;
      let siblingID = getBrushConfigKey(chart, overviewNr, siblingPartition);

      chart.brushFamilyMap[brushID]["siblings"].add(siblingID);
      chart.brushFamilyMap[siblingID]["siblings"].add(brushID);
    }
  }
  //console.log(chart.brushFamilyMap);
}

export function getFamilyOfBrush(chart, brushID) {
  let familyData = chart.brushFamilyMap[brushID];
  if (!familyData) {
    /* console.log(chart.brushFamilyMap);
    console.log(brushID); */
  }

  return familyData;
}

export function getBrushIndicators(chart, brushID) {
  let indicatorData = chart.indicatorMap[brushID];

  return indicatorData;
}

export function setBrushIndicators(chart, brushID, indicatorData) {
  chart.indicatorMap[brushID] = indicatorData;
}

export function setButtonRefInList(chart, brushKey, buttonRef) {
  chart.buttonList[brushKey] = buttonRef;
}

export function getButtonRefFromList(chart, brushKey) {
  return chart.buttonList[brushKey];
}
//endregion

export function redrawCurrentActivation(chart) {
  const currActiveNodes = Object.keys(chart.activeNodes);
  if (currActiveNodes.length === 0) return;

  let currentlyActive;
  currActiveNodes.forEach((nodeID) => {
    if (chart.activeNodes[nodeID] === chart.p.activeNodeClass) {
      currentlyActive = nodeID;
    }
  });

  if (currentlyActive) colorActiveTree(chart, -1, currentlyActive, true);
}

export function colorActiveTree(
  chart,
  overviewNr,
  brushPartitionKey,
  partitionIsKey = false
) {
  const selectorPrefix = "#brush_";
  const buttonSelectorPrefix = "#button_";
  const workbenchSelectorPrefix = "#workbenchBrush_";

  resetActiveTree(chart);

  const activityMode = chart.nodeActivityMode;

  const newActiveNodeSet = {};

  const activeBrushKey = !partitionIsKey
    ? getBrushConfigKey(chart, overviewNr, brushPartitionKey)
    : brushPartitionKey;

  const activeBrush = d3.select(selectorPrefix + activeBrushKey);
  if (activeBrush.empty()) return;
  activeBrush.attr("class", chart.p.activeNodeClass);
  newActiveNodeSet[activeBrushKey] = chart.p.activeNodeClass;

  const refButton = d3.select(buttonSelectorPrefix + activeBrushKey);
  if (!refButton.empty()) refButton.attr("class", chart.p.activeNodeClass);

  const refWBBrush = d3.select(workbenchSelectorPrefix + activeBrushKey);
  if (!refWBBrush.empty()) refWBBrush.attr("class", chart.p.activeNodeClass);

  const familyData = getFamilyOfBrush(chart, activeBrushKey);
  if (familyData) {
    if (activityMode === "overview") {
      const siblings = familyData["siblings"];
      siblings.forEach((siblingKey) => {
        let siblingBrush = d3.select(selectorPrefix + siblingKey);
        siblingBrush.attr("class", chart.p.activeSiblingClass);
        newActiveNodeSet[siblingKey] = chart.p.activeSiblingClass;

        let refButton = d3.select(buttonSelectorPrefix + siblingKey);
        if (!refButton.empty())
          refButton.attr("class", chart.p.activeSiblingClass);

        let refWBBrush = d3.select(workbenchSelectorPrefix + siblingKey);
        if (!refWBBrush.empty())
          refWBBrush.attr("class", chart.p.activeSiblingClass);
      });
    }

    const children = familyData["children"];
    children.forEach((childKey) => {
      let childBrush = d3.select(selectorPrefix + childKey);
      childBrush.attr("class", chart.p.activeRelativeClass);
      newActiveNodeSet[childKey] = chart.p.activeRelativeClass;

      let refButton = d3.select(buttonSelectorPrefix + childKey);
      if (!refButton.empty())
        refButton.attr("class", chart.p.activeRelativeClass);

      let refWBBrush = d3.select(workbenchSelectorPrefix + childKey);
      if (!refWBBrush.empty())
        refWBBrush.attr("class", chart.p.activeRelativeClass);
    });

    const parent = familyData["parent"];
    const predecStack = [parent];

    while (predecStack.length > 0) {
      let nextPredec = predecStack.shift();
      let predecBrush = d3.select(selectorPrefix + nextPredec);

      if (!predecBrush.empty()) {
        predecBrush.attr("class", chart.p.activePredecClass);
        newActiveNodeSet[nextPredec] = chart.p.activePredecClass;

        let refButton = d3.select(buttonSelectorPrefix + nextPredec);
        if (!refButton.empty())
          refButton.attr("class", chart.p.activePredecClass);

        let refWBBrush = d3.select(workbenchSelectorPrefix + nextPredec);
        if (!refWBBrush.empty())
          refWBBrush.attr("class", chart.p.activePredecClass);

        let predecFamilyData = getFamilyOfBrush(chart, nextPredec);
        if (predecFamilyData) {
          let predecSiblings = predecFamilyData["siblings"];
          predecSiblings.forEach((predecSiblingKey) => {
            let predecSiblingBrush = d3.select(
              selectorPrefix + predecSiblingKey
            );
            predecSiblingBrush.attr("class", chart.p.activeRelativeClass);
            newActiveNodeSet[predecSiblingKey] = chart.p.activeRelativeClass;

            refButton = d3.select(buttonSelectorPrefix + predecSiblingKey);
            if (!refButton.empty())
              refButton.attr("class", chart.p.activeRelativeClass);

            let refWBBrush = d3.select(
              workbenchSelectorPrefix + predecSiblingKey
            );
            if (!refWBBrush.empty())
              refWBBrush.attr("class", chart.p.activeRelativeClass);
          });

          if (predecFamilyData["parent"])
            predecStack.push(predecFamilyData["parent"]);
        }
      }
    }
  }

  if (activityMode === "workbench") {
    const workbenchSiblingIDs = chart.workbench["linkedKeys"];
    if (workbenchSiblingIDs.length > 0) {
      let relativeStack = [];
      workbenchSiblingIDs.forEach((siblingKey) => {
        if (siblingKey === activeBrushKey) return;
        let siblingBrush = d3.select(selectorPrefix + siblingKey);
        if (!siblingBrush.empty()) {
          siblingBrush.attr("class", chart.p.activeSiblingClass);
        }
        newActiveNodeSet[siblingKey] = chart.p.activeSiblingClass;

        let refButton = d3.select(buttonSelectorPrefix + siblingKey);
        if (!refButton.empty())
          refButton.attr("class", chart.p.activeSiblingClass);

        let refWBBrush = d3.select(workbenchSelectorPrefix + siblingKey);
        if (!refWBBrush.empty())
          refWBBrush.attr("class", chart.p.activeSiblingClass);

        let familyData = getFamilyOfBrush(chart, siblingKey);
        if (familyData) {
          /* if (familyData["siblings"].size > 0)
            relativeStack = relativeStack.concat(
              Array.from(familyData["siblings"])
            ); */
          let predec = familyData["parent"];
          while (predec && predec !== chart.p.parentBrushPlaceholderID) {
            relativeStack.push(predec);
            familyData = getFamilyOfBrush(chart, predec);
            if (!familyData) break;
            predec = familyData["parent"];
          }
        }
      });
      relativeStack.forEach((relative) => {
        console.log(relative);
        let relativeBrush = d3.select(selectorPrefix + relative);
        if (!relativeBrush.empty()) {
          relativeBrush.attr("class", chart.p.activeRelativeClass);
        }
        newActiveNodeSet[relative] = chart.p.activeRelativeClass;

        let refButton = d3.select(buttonSelectorPrefix + relative);
        if (!refButton.empty())
          refButton.attr("class", chart.p.activeRelativeClass);

        let refWBBrush = d3.select(workbenchSelectorPrefix + relative);
        if (!refWBBrush.empty())
          refWBBrush.attr("class", chart.p.activeRelativeClass);
      });
    }
  }

  chart.activeNodes = newActiveNodeSet;
}

function resetActiveTree(chart) {
  const selectorPrefix = "#brush_";
  const buttonSelectorPrefix = "#button_";
  const workbenchSelectorPrefix = "#workbenchBrush_";

  const currActiveNodes = Object.keys(chart.activeNodes);

  if (currActiveNodes.length > 0) {
    currActiveNodes.forEach((nodeID) => {
      const brushNode = d3.select(selectorPrefix + nodeID);
      if (!brushNode.empty())
        brushNode.attr("class", chart.p.defaultBrushNodeClass);

      const buttonNode = d3.select(buttonSelectorPrefix + nodeID);
      if (!buttonNode.empty())
        buttonNode.attr("class", chart.p.defaultButtonNodeClass);

      const wbNode = d3.select(workbenchSelectorPrefix + nodeID);
      if (!wbNode.empty()) wbNode.attr("class", chart.p.defaultButtonNodeClass);
    });
  }
}

export function isPartOfSubtree(chart, newLink) {
  const workBenchLinkedBrushesList = chart.workbench["linkedKeys"];
  const len = workBenchLinkedBrushesList.length;
  if (len < 1) return -1;

  let result = false;
  let sameSubTreeID = -1;
  let newLinkSplit = newLink.split("_");
  for (let i = 0; i < len; i++) {
    let linkedKeySplit = workBenchLinkedBrushesList[i].split("_");
    let min_length = Math.min(linkedKeySplit.length, newLinkSplit.length);
    for (let j = 0; j < min_length; j++) {
      if (linkedKeySplit[j] !== newLinkSplit[j]) {
        result = false;
        break;
      }
      result = true;
    }
    if (result === true) {
      sameSubTreeID = i;
      break;
    }
  }
  return sameSubTreeID;
}

export function getLinkedBrushKey(chart, workbenchID) {
  if (!workbenchID || workbenchID <= -1) return -1;
  return chart.workbench["linkedKeys"][workbenchID];
}

function workbenchContextMenu(chart, group, workbenchID, x, y) {
  const menuWidth = 150;
  const menuHeight = 30;
  const fontSize = 12;
  const roundness = 6;

  if (!d3.select("#workbenchContextMenu").empty()) {
    d3.select("#workbenchContextMenu").remove();
    d3.select("#workbenchContextMenuText").remove();
  }
  let menu = group
    .append("rect")
    .attr("id", "workbenchContextMenu")
    .attr("x", x)
    .attr("y", y)
    .attr("rx", roundness)
    .attr("ry", roundness)
    .attr("width", menuWidth)
    .attr("height", menuHeight)
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("fill", "white")
    .attr("cursor", "pointer")
    .on("click", () => {
      //addWorkBenchbrush(chart, brushKey);
      removeWorkbenchBrush(chart, workbenchID);
      menu.remove();
      text.remove();
    });

  let text = group
    .append("text")
    .attr("id", "workbenchContextMenuText")
    .attr("x", x + menuWidth / 2)
    .attr("y", y + menuHeight / 2 + fontSize / 2)
    .attr("font-size", fontSize)
    .attr("cursor", "pointer")
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .text("Remomve from Workbench")
    .on("click", () => {
      removeWorkbenchBrush(chart, workbenchID);
      menu.remove();
      text.remove();
    });

  setTimeout(() => {
    menu.remove();
    text.remove();
  }, 5000);
}

export function isButtonAssignedToWorkbench(chart, brushKey) {
  const linkedKeys = chart.workbench["linkedKeys"];
  let isAssigned = false;
  linkedKeys.forEach((link) => {
    if (link === brushKey) isAssigned = true;
  });

  return isAssigned;
}

const workbenchBrushOnClick = (chart, linkedBrushKey) => {
  chart.nodeActivityMode = "workbench";
  //if (buttonID.includes("root")) return;
  let configData = chart.overviewConfig;

  let key = linkedBrushKey.split("_");

  const overviewDepth = key[0];

  while (key.length > 1) {
    let partitionKey = key.pop();
    let strippedOverviewKey = key.join("_");

    configData[strippedOverviewKey]["active_partition"] = partitionKey;
  }

  updateOverviewConfig(chart, configData);
  clearOverviewStrips(chart);
  colorActiveTree(chart, overviewDepth, linkedBrushKey, true);
  //updateAnnoViewRange(chart, linkedBrushKey, true);
  setAnnotationWindows(chart, chart.workbench["linkedKeys"]);
  addMultipleTextviews(chart, chart.workbench["linkedKeys"]);
  //resetTextviews(chart);
  //chart.workbench["linkedKeys"].forEach((key) => addTextview(chart, key));
};

function sortBrushKeysInorder(brushKeyList) {
  brushKeyList.sort();
  return brushKeyList;
}

function sortBrushKeysLevelorder(brushKeyList) {
  const lengthDict = {};
  brushKeyList.forEach((key) => {
    let n = key.length;
    let list = lengthDict[n];
    if (list) {
      list.push(key);
      list.sort();
    } else {
      list = [key];
    }
    lengthDict[n] = list;
  });

  let sortedLenKeyList = Array.from(Object.keys(lengthDict)).sort();
  let sortedList = [];
  sortedLenKeyList.forEach((lenKey) => {
    sortedList = sortedList.concat(lengthDict[lenKey]);
  });

  return sortedList;
}

export function checkIfBrushIsActiveNode(chart, brushKey) {
  let activeClass = null;
  const activeNodeKeys = Object.keys(chart.activeNodes);
  activeNodeKeys.forEach((activeKey) => {
    if (activeKey === brushKey) {
      const assignedClass = chart.activeNodes[activeKey];
      if (
        assignedClass === chart.p.activeNodeClass ||
        assignedClass === chart.p.activeSiblingClass
      ) {
        activeClass = assignedClass;
      }
    }
  });

  return activeClass;
}
