import * as d3 from "d3";

var chart;

export function initElemrntAddres(globalChart) {
  chart = globalChart;
}

export function ElemAddress(type, id, user = false) {
  this.type = type;
  this.id = id;
  this.user = user;
}

ElemAddress.prototype.getElement = function () {
  var element = {};
  switch (this.type) {
    case "HeadToken": {
      var className = ".idt" + this.id;
      element = d3.select(".bgToken_g" + className);
      break;
    }
    case "HeadTerm": {
      var termId = ".id" + this.id;
      element = d3.select(".activeTermRect" + termId);
      break;
    }
    case "HeadTermIndicator": {
      var indicatorID = ".id" + this.id;
      element = d3.select(".textIndicator_g" + indicatorID);
      break;
    }
    case "ChartToken": {
      var tokenId = ".idu" + this.user + "_t" + this.id;
      element = d3.select(".bgTokenUsr" + tokenId);
      break;
    }
    case "ChartBin": {
      var binClassName = ".idu" + this.user + "_b" + this.id;
      element = d3.select(".bgBinUsr.aggregated" + binClassName);
      break;
    }
    case "ChartAnno": {
      var annoId = ".idu" + this.user + "_a" + this.id;
      element = d3.select(".chunk > " + annoId);
      break;
    }
    case "SAChartBackground": {
      var className = ".idt" + this.id;
      element = d3.select(".bgToken" + className);
      break;
    }
    case "AChartBackground": {
      var className = ".idb" + this.id;
      element = d3.select(".bgBin" + className);
      break;
    }
    case "TextToken": {
      element = d3.select("#tx_t_" + this.id);
      break;
    }
    case "TextWhiteSpace": {
      element = d3.select("#tx_w_" + this.id);
      break;
    }
    case "TextChunk": {
      var className = "text_user" + this.user + "_c" + this.id;
      element = d3.selectAll("." + className);
      break;
    }
    case "TextAnno": {
      var annoData = chart.d.annos["user" + this.user][this.id];
      var elementIds = "";
      for (var i = annoData.tokens.first; i <= annoData.tokens.last - 1; i++) {
        elementIds = elementIds + "#tx_t_" + i + ", " + "#tx_w_" + i + ", ";
      }
      elementIds = elementIds + "#tx_t_" + annoData.tokens.last;
      element = d3.selectAll(elementIds);
      break;
    }

    default: {
      console.error("there is no element type: " + this.type);
    }
  }

  return element;
};

ElemAddress.prototype.getShortName = function () {
  var name;
  if (this.user) {
    name = this.type + "_" + this.id + "_" + this.user;
  } else {
    name = this.type + "_" + this.id;
  }
  return name;
};
