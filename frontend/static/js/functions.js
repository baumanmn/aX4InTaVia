import * as d3 from "d3";
import { extractChunks } from "./drawBars.js";
import { typeRect } from "./colorMaps";
import { indicateToken_Bin } from "./indicator";
import { ElemAddress } from "./elemAddress";
import { StateController } from "./stateController";
import { scrollToTarget } from "./textArea";

var chart;

export function initFunctions(globalChart) {
  chart = globalChart;
}

// get Bin id by token id
// JENA: changed last case: function falsely returned -1 if given token was in the last bin, function now returns the last bin if not found
export function getBinIdByTokenID(tokenId) {
  var l = chart.d.binRange[0];
  var r = chart.d.binRange[1];
  // console.log("left bins: ");
  // console.log(chart.d.detailBins[l]);
  // console.log("right bins: ");
  // console.log(chart.d.detailBins[r]);
  // console.log("left tokens: ");
  // console.log(chart.d.detailBins[l].tokens);
  // console.log("right tokens: ");
  // console.log(chart.d.detailBins[r].tokens);
  while (l <= r) {
    var m = Math.floor((l + r) / 2);
    var tokensPerBin = chart.d.detailBins[m].tokens.length;
    if (chart.d.detailBins[m].tokens[tokensPerBin - 1].id < tokenId) {
      l = m + 1;
    } else if (chart.d.detailBins[m].tokens[tokensPerBin - 1].id > tokenId) {
      r = m - 1;
    } else return m;
  }
  return r;
  //return -1;
}

//if term dose not exist return  -1
export function getTermIdByText(text) {
  var id = -1;
  if (chart.d.terms["st_" + text]) {
    id = chart.d.terms["st_" + text].id;
  }
  return id;
}

//if term dose not exist return  -1
export function getTermIdByTokenId(id) {
  var text = chart.d.tokens[id].stem;
  var id = -1;
  if (chart.d.terms["st_" + text]) {
    id = chart.d.terms["st_" + text].id;
  }
  return id;
}
