//region imports
import * as d3 from "d3";
import $ from "jquery"; //Jena
//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
import { typeArray } from "./constants.js";
import * as preprocessData from "./preprocessData.js";
import { initTextArea, updateTextArea } from "./textArea";
import {
  installZoom,
  installBrush,
  initializeViewAssignment,
} from "./brushSetup.js";
import {
  drawInitialBars,
  drawSecondOverviewBars,
  drawThirdOverviewBars,
} from "./drawBars.js";
import { initializeSliders, bindSliderToBrushes } from "./slider";
import { initializeStates } from "./overviewState.js";
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
const annoWindowExt = tokenExt + annotatorIdExtension;
const annotatorExt = wordViewExt + wordViewConnectorsExt + annotatorBandsExt;
const [annoWindowWidth, annoWindowHeight] =
  orientation === "landscape"
    ? [annoWindowExt, annotatorExt]
    : [annotatorExt, annoWindowExt];

/**
 * OVERVIEW RELATED CONSTANTS
 */
const maxNumOverviews = 5;
const maxNumBrushes = 3;
const maxNumSliders = maxNumBrushes - 1;
const maxNumTextViews = maxNumBrushes;

const overviewExt = 40; //height of an overview strip
const sliderSpace = 15; //space for sliders
const overviewHandleExt = 40; //space for the handles
const overviewStripsExt = tokenExt + overviewHandleExt;
const stripsExt = maxNumOverviews * (overviewExt + sliderSpace);
const [overviewStripsWidth, overviewStripsHeight] =
  orientation === "landscape"
    ? [overviewStripsExt, stripsExt]
    : [stripsExt, overviewStripsExt];
const buttonsWidth = 500;

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
  chart.overviews[overviewID]["collapse"].object = collapseObject["collapse"];
  chart.overviews[overviewID]["collapse"].label = collapseObject["label"];
}

function drawOverviewBackground(chart, overviewID) {
  let backgroundObject = drawCompleteOverviewBackground(
    chart.overviews[overviewID]["stripGroup"]
  );
  chart.overviews[overviewID]["background"] = backgroundObject["background"];
  chart.overviews[overviewID]["backgroundRects"] = backgroundObject["rects"];
  chart.overviews[overviewID]["slider"]["svg"] = backgroundObject["slider"];
}

function addOverview(chart, overviewID) {
  chart.overviews[overviewID] = {
    stripGroup: drawStripGroup(chart, overviewID), //replaces chart.overview
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
      object: "",
      label: "",
    },
  };
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
    maxNumOverviews, //added by Jena
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
  chart.overviews = {};

  chart.overviewConfig = {};

  for (let i = 0; i < maxNumBrushes; i++) {
    let overviewConfigKey = String(i);
    chart.overviewConfig[overviewConfigKey] = {
      num_active_partitions: 0,
      active_partition: 0,
      last_brush_config: {},
      last_slider_config: {},
    };
  }

  chart.brushConfig = {};

  chart.textViews = {};

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

export function drawStripGroup(chart, pos) {
  //let yShift = computeOverviewOrigin(pos);
  return (
    chart.e.overviewStrips
      .append("g") //transform-group for stacking the overview strips at the right positions
      //.attr("id", id)
      .attr(
        "transform",
        `translate (0, ${pos * (overviewExt + sliderSpace)} )`
        //"translate(" +
        //  margins.left +
        //  "," +
        //  (margins.top + detailHeight + margins.overviewDetail + yShift) +
        //  ")"
      )
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
  addOverview(chart, 0);
  drawOverviewBackground(chart, 0);
  drawInitialBars(chart);

  initTextArea(chart);

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
  addOverview(chart, overviewID);
  addOverviewCollapse(chart, overviewID);
}

export function expandCollapsedOverview(chart, overviewID) {
  chart.overviews[overviewID].collapse.object.remove();
  chart.overviews[overviewID].collapse.label.remove();
  drawOverviewBackground(chart, overviewID);

  if (overviewID === 1) {
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
  }

  addOverviewConfig(chart, overviewID);
  installBrush(chart, overviewID, {
    brushNr: 0,
    overlay: [0, chart.p.tokenExt],
    selection: [0, chart.p.tokenExt],
  });
  for (let i = maxNumSliders - 1; i >= 0; i--) {
    bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, i);
  }
  /*   bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, 1);
  bindSliderToBrushes(chart, chart.p.tokenExt, overviewID, 0); */

  addInitialCollapseOverview(chart, overviewID + 1);
}

function addOverviewConfig(chart, overviewNr) {
  let overviewConfigKey = "";
  for (let i = 0; i < overviewNr && i < maxNumOverviews; i++) {
    const active = chart.overviewConfig[String(i)]["active_partition"];
    overviewConfigKey += active + "_";
  }
  overviewConfigKey += String(overviewNr);

  console.log(chart.overviewConfig);
  console.log(overviewConfigKey);

  chart.overviewConfig[overviewConfigKey] = {
    num_active_partitions: 0,
    active_partition: 0,
    last_brush_config: {},
    last_slider_config: {},
  };
}

export function getOverviewPartitionConfig(chart, overviewNr) {
  let overviewConfigKey = "";
  for (let i = 0; i < overviewNr && i < maxNumOverviews; i++) {
    const active = chart.overviewConfig[String(i)]["active_partition"];
    overviewConfigKey += active + "_";
  }
  overviewConfigKey += String(overviewNr);

  return chart.overviewConfig[overviewConfigKey];
}

export function setOverviewPartitionConfig(chart, overviewNr, partitionInfo) {
  let overviewConfigKey = "";
  for (let i = 0; i < overviewNr && i < maxNumOverviews; i++) {
    const active = chart.overviewConfig[String(i)]["active_partition"];
    overviewConfigKey += active + "_";
  }
  overviewConfigKey += String(overviewNr);

  chart.overviewConfig[overviewConfigKey] = partitionInfo;
  console.log(chart.overviewConfig);
}
//endregion
