import * as d3 from "d3";
import { typeColors } from "./constants.js";

//import * as d3 from "../node_modules/d3/build/d3.js";
//import * as d3 from "../node_modules/d3";

const typeAlphaTrans = 0.5;

export function BGTokenAtomic(v) {
  return d3.interpolateLab("white", "black")(v);
}

export function localTerms(v) {
  return d3.interpolateLab("white", "black")(v);
}

export function userToken_Bin(v) {
  return d3.interpolateLab("white", "gray")(v);
}

export function BGBin(v) {
  return d3.interpolateLab("white", "black")(v);
}

export function userBin(v) {
  return d3.interpolateLab("mistyrose", "tomato")(v);
}

export function typeRect(type, transparent) {
  var typeAlpha = transparent ? typeAlphaTrans : 1;

  //colorbrewer 8-class dark2
  //["#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e","#e6ab02","#a6761d","#666666"]
  //switch (type) {
  //    case "PER":
  //        return "#d95f02";
  //    case "LOC":
  //        return "#7570b3";
  //    case "ORG":
  //        return "#e7298a";
  //    case "EVT":
  //        return "#66a61e";
  //    case "WRK":
  //        return "#e6ab02";
  //    case "CNC":
  //        return "#a6761d";
  //    default:
  //        return "black";
  //}

  //colorbrewer 9-class set1
  [
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#ffff33",
    "#a65628",
    "#f781bf",
    "#999999",
  ];
  switch (type) {
    case "PER":
      //return "#e41a1c";
      return "rgba(" + typeColors.PER + ", " + typeAlpha + ")";
    case "LOC":
      //return "#377eb8";
      return "rgba(" + typeColors.LOC + ", " + typeAlpha + ")";
    case "ORG":
      //return "#4daf4a";
      return "rgba(" + typeColors.ORG + ", " + typeAlpha + ")";
    case "EVT":
      //return "#ff7f00";
      return "rgba(" + typeColors.EVT + ", " + typeAlpha + ")";
    case "WRK":
      //return "#a65628";
      return "rgba(" + typeColors.WRK + ", " + typeAlpha + ")";
    case "WVL":
      //return "#f781bf";
      return "rgba(" + typeColors.WVL + ", " + typeAlpha + ")";
    case "CNC":
      //return "#984ea3";
      return "rgba(" + typeColors.CNC + ", " + typeAlpha + ")";
    default:
      return typeColors.default;

    //tableau 10
  }

  ////colorbrewer 9-class set3
  //["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33","#a65628","#f781bf","#999999"]
  //switch (type) {
  //    case "PER":
  //        //return "#e41a1c";
  //        return "rgba(128, 177, 211, " + typeAlpha + ")";
  //    case "LOC":
  //        //return "#377eb8";
  //        return "rgba(190, 186, 218, " + typeAlpha + ")";
  //    case "ORG":
  //        //return "#4daf4a";
  //        return "rgba(251, 128, 114, " + typeAlpha + ")";
  //    case "EVT":
  //        //return "#ff7f00";
  //        return "rgba(252, 205, 229, " + typeAlpha + ")";
  //    case "WRK":
  //        //return "#a65628";
  //        return "rgba(179, 222, 105, " + typeAlpha + ")";
  //    case "WVL":
  //        //return "#f781bf";
  //        return "rgba(255 , 237, 111, " + typeAlpha + ")";
  //    case "CNC":
  //        return "yellow";
  //    default:
  //        return "black";
  //
  //}
}
