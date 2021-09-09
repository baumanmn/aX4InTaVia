import * as d3 from "d3";
import $ from "jquery";

//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
import { typeArray } from "./constants.js";
import * as preprocessData from "./preprocessData.js";
//import {computeTerms} from "./preprocessData";

//chart-related constants
// const canvasHeight = window.innerHeight; //height of the canvas
const orientation = "landscape";
const canvasHeight = 600; //height of the canvas
const canvasWidth = orientation === "landscape" ? 1500 : $(window).height();
//const canvasWidth = (orientation === "landscape") ? $(window).width() : $(window).height();

const tokenTextHeight = 110; //height of the token text window
const tokenPolygonHeight = 20; //height of the connecting polygons
const tokenBarHeight = 370; //height of the annotators part of the detail window
//const tokenBarHeight = 100; //height of the annotators part of the detail window
const overviewHeight = 40; //height of the overview window
const margins = {
  top: 20,
  right: 40,
  left: 40,
  overviewDetail: 20, //between overview and detail window
}; //margins
const width = canvasWidth - margins.left - margins.right;
const extraWidth = 100; //?
const detailHeight = tokenTextHeight + tokenPolygonHeight + tokenBarHeight;
const ds_StdDevFactor = 0.7; //dropshadow standard deviation
const overlapMargin = 10; //prevent right/left borders for cut annos
const minimalBrush = 5; //smallest brush (# overview-units) allowed when zooming

//token-related constants
const lowerTokenThreshold = 7; //minimal width of a non-annotated token
const magFactor = 0.7; //magnification factor for annotated tokens, in [0,1]
const xScaleTokenText = d3.scaleBand().range([0, width]);

//term-related constans
const xScaleTerms = d3.scaleBand().range([0, width]);
const minTermWidth = 20;
const numOfTerms = Math.floor(width / minTermWidth);
const gthSpacer = 4; //gap on top of the tool
const globalTermHeight = tokenTextHeight - gthSpacer;
const termIndicatorHeight = tokenTextHeight + globalTermHeight + 9;
const termTickLength = 5; //length of the termIndicator-ticks
const indConnector = 10; //length of the vertical connector-line
const termFontSize = 12;
const termFrameTicks = (minTermWidth - termFontSize - 2) / 2; //length of the frame-remainder with gap
const textDisplacement = 5;
const termFreeze = false;

//annotation-related constants
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

//bin-related constants
const xScaleTokens_Bins = d3.scaleBand().range([0, width]);

//auxilliary functions
function defineShadowAndGradient(chart, dist) {
  var filterDefs = chart.detail.append("defs");
  var filter = filterDefs
    .append("filter")
    .attr("filterUnits", "userSpaceOnUse")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", chart.p.width)
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

//main functions
export function initializeChart() {
  const chart = {};

  chart.p = {
    //parameters that should be available with the chart
    tokenBarHeight,
    tokenPolygonHeight, // added
    tokenTextHeight, // added
    globalTermHeight,
    termTickLength,
    termFrameTicks,
    indConnector,
    textDisplacement,
    termIndicatorHeight,
    termFontSize,
    userHeight,
    width,
    margins,
    lowerTokenThreshold,
    numOfTerms,
    magFactor,
    annoMaxHPadding,
    annoHPaddingFactor,
    annoHeight,
    maxLevelsCompUncomp,
    maxLevelsSupercompComp,
    maxLevelsSupercompCompAgg,
    shortAnnoHeight,
    shortAnnoHeight_sa,
    overviewHeight,
    xScaleTokens_Bins,
    xScaleTokenText,
    xScaleTerms,
    spaceForAnnos,
    typeStrokeWidth,
    detailHeight,
    overlapMargin,
    binAnnosHeight,
    freeSpace,
    minimalBrush,
    orientation,
    termFreeze,
  };

  chart.e = {}; //the property storing all svg-elements

  chart.svg = d3
    .select("body") //the basic svg
    .append("div")
    .style("height", canvasHeight)
    .attr("id", "container")
    .append("svg")
    .attr("id", "tool")
    //.attr("shape-rendering", "auto")
    .attr("width", canvasWidth + extraWidth)
    .attr("height", canvasHeight);

  if (orientation === "portrait")
    chart.svg.attr("transform", "rotate (90) translate(250, -900)");

  chart.svg
    .append("defs")
    .append("clipPath") //define a mask for the detail window
    .attr("id", "clipD")
    .append("rect")
    .attr("width", width)
    .attr("height", detailHeight);

  //chart.svg.append("defs").append("clipPath") //define a mask for the overview window
  //    .attr("id", "clipO")
  //    .append("rect")
  //    .attr("width", width)
  //    .attr("height", overviewHeight);

  chart.drag = chart.svg.append("g").attr("id", "dragGroup");

  chart.detail = chart.svg
    .append("g") //the detail window (with clip path) moved for margin
    .attr("id", "detail_g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")")
    .attr("clip-path", "url(#clipD)");

  chart.detail
    .append("rect") //a background-rect for the detail-window
    .attr("width", width)
    .attr("height", detailHeight)
    .attr("id", "detailBg_r");

  chart.overview = chart.svg
    .append("g") //the overview window (with clip path) moved for margin
    .attr("id", "overview_g")
    .attr(
      "transform",
      "translate(" +
        margins.left +
        "," +
        (margins.top + detailHeight + margins.overviewDetail) +
        ")"
    );
  //.attr("clip-path", "url(#clipO)");

  //the groups of the aggregated tokens/bins (background), the texts & connecting polygons
  chart.detailBackground = chart.detail.append("g").attr("id", "detailBg_g");
  chart.detailBTokens_Bins = chart.detailBackground
    .append("g")
    .attr("id", "detailBgT_g");
  //.attr("transform", `translate(0, ${tokenTextHeight + tokenPolygonHeight})`);
  //chart.tokenPolygons = chart.detailBackground.append("g").attr("id", "tokenPol_g")
  //    .attr("transform", `translate(0, ${tokenTextHeight})`);
  chart.terms = chart.detailBackground.append("g").attr("id", "terms_g");

  ////a rect as listener for double-clicks
  //chart.e.termNav = chart.terms.append("rect")
  //    .attr("x", 0)
  //    .attr("y", chart.p.tokenTextHeight)
  //    .attr("width", chart.p.width)
  //    .attr("height", chart.p.tokenPolygonHeight)
  //    .style("fill", "none")
  //    .style("pointer-events", "visible");

  //the group of all user tokens/annos (foreground)
  chart.detailForeground = chart.detail
    .append("g")
    .attr("id", "detailFG")
    .attr("transform", `translate(0, ${tokenTextHeight + tokenPolygonHeight})`);

  //background for overview
  chart.overview
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", overviewHeight)
    .attr("id", "overviewBg_r");

  //the group of the agggregated tokens/bins (brushable), with clip-path
  chart.overviewRects = chart.overview.append("g").attr("id", "overviewR_r");

  return chart;
}

export function fillChart(chart, rawData) {
  //get the data in the appropriate form and append to chart
  //TODO true to false
  var data = preprocessData.cleanUpData(rawData, false);
  var users = preprocessData.computeUsers(data),
    tokens = preprocessData.computeTokens(data),
    [annos, chunks] = preprocessData.computeAnnosAndChunks(data);

  preprocessData.updateTokensWithAnnos(tokens, annos); //necessary since annos are computed after tokens

  var bins = preprocessData.computeBins(chart.p.width, tokens),
    binMaxima = preprocessData.computeBinMaxima(chart.p.width, tokens);

  chart.d = {
    users,
    tokens,
    annos,
    chunks,
    bins,
    binMaxima,
  };

  preprocessData.computeTerms(chart);

  //the groups for the users, position in array codes succession in chart from top to bottom
  var users = chart.d.users;
  var l = users.length;
  var dist = (tokenBarHeight - l * userHeight) / (l + 1);

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
    .attr("width", chart.p.width)
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
    .attr("width", chart.p.width)
    .attr("y", 0)
    .attr("height", chart.p.userHeight)
    .attr("stroke-dasharray", `${chart.p.width}, ${chart.p.userHeight}`)
    .attr("class", "userLayerBG_stroke");
}
