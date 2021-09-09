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
// if bin do  not exist return -1
export function getBinIdByTokenID(tokenId) {
  var l = chart.d.binRange[0];
  var r = chart.d.binRange[1];
  while (l <= r) {
    var m = Math.floor((l + r) / 2);
    var tokensPerBin = chart.d.detailBins[m].tokens.length;
    if (chart.d.detailBins[m].tokens[tokensPerBin - 1].id < tokenId) {
      l = m + 1;
    } else if (chart.d.detailBins[m].tokens[0].id > tokenId) {
      r = m - 1;
    } else return m;
  }
  return -1;
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

export function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (var i = arr1.length; i--; ) {
    if (arr1[i] !== arr2[i]) return false;
  }

  return true;
}

export function removeArrayDuplicates(arr) {
  arr = arr.filter((item, index) => {
    // Remove Array Duplicates
    return arr.indexOf(item) === index;
  });
  return arr;
}
