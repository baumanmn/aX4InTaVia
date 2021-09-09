import { ElemAddress } from "./elemAddress";
import * as d3 from "d3";
import { typeRect } from "./colorMaps";
import { getBinIdByTokenID, getTermIdByTokenId } from "./functions";

var chart;

export function initStateController(globalChart) {
  chart = globalChart;
  console.log(chart);
}

export var StateController = (function () {
  var hovered = [];
  var clicked = [];
  var blocked = [];
  var temp = [];
  var clickSource = 0;
  var binTokens = [];
  var binBackgrounds = [];

  function storePossiblyClickedElements() {
    temp = hovered.slice(0);
  }

  function refreshClickedElements(chart) {
    if (chart.d.clickFlag) {
      var newClickList = clicked.slice(0);
    } else {
      var tempStorage = clicked.slice(0);
      deactivatedClickedElements();
      var newClickList = [];
      switch (chart.modeDetail) {
        case "atomic": {
          for (var i = 0; i < tempStorage.length; i++) {
            var elemAddress = elemShotNameToElementAddress(tempStorage[i]);
            if (
              elemAddress.type === "TextToken" ||
              elemAddress.type === "HeadToken" ||
              elemAddress.type === "ChartAnno" ||
              elemAddress.type === "TextChunk" ||
              elemAddress.type === "TextAnno" ||
              elemAddress.type === "ChartToken"
            ) {
              newClickList.push(tempStorage[i]);
            } else if (elemAddress.type === "SAChartBackground") {
              var headToken = new ElemAddress("HeadToken", elemAddress.id);
              newClickList.push(headToken.getShortName());
            }
          }
          binTokens.forEach(function (token) {
            newClickList.push(token.getShortName());
            chart.d.tokens[token.id].annos["user" + token.user].forEach(
              function (anno) {
                newClickList.push(
                  new ElemAddress(
                    "ChartAnno",
                    anno.id,
                    token.user
                  ).getShortName()
                );
              }
            );
          });
          binBackgrounds.forEach(function (token) {
            var headToken = new ElemAddress("HeadToken", token.id);
            newClickList.push(headToken.getShortName());
          });
          // newClickList = tempStorage.slice(0);
          break;
        }
        case "semiAggregated": {
          for (var i = 0; i < tempStorage.length; i++) {
            var elemAddress = elemShotNameToElementAddress(tempStorage[i]);
            if (
              elemAddress.type === "TextToken" ||
              elemAddress.type === "ChartAnno" ||
              elemAddress.type === "TextChunk" ||
              elemAddress.type === "TextAnno" ||
              elemAddress.type === "HeadTerm" ||
              elemAddress.type === "HeadTermIndicator" ||
              elemAddress.type === "SAChartBackground" ||
              elemAddress.type === "ChartToken"
            ) {
              newClickList.push(tempStorage[i]);
            } else if (elemAddress.type === "HeadToken") {
              var backgroundToken = new ElemAddress(
                "SAChartBackground",
                elemAddress.id
              );
              newClickList.push(backgroundToken.getShortName());
              var termId = getTermIdByTokenId(elemAddress.id);
              var headTerm = new ElemAddress("HeadTerm", termId);
              newClickList.push(headTerm.getShortName());
              if (clickSource.type === "HeadTerm") {
                var HeadTermIndicator = new ElemAddress(
                  "HeadTermIndicator",
                  termId
                );
                newClickList.push(HeadTermIndicator.getShortName());
              }
            }
          }
          binTokens.forEach(function (token) {
            newClickList.push(token.getShortName());
            chart.d.tokens[token.id].annos["user" + token.user].forEach(
              function (anno) {
                newClickList.push(
                  new ElemAddress(
                    "ChartAnno",
                    anno.id,
                    token.user
                  ).getShortName()
                );
              }
            );
          });
          binBackgrounds.forEach(function (token) {
            var headToken = new ElemAddress("SAChartBackground", token.id);
            newClickList.push(headToken.getShortName());
          });
          break;
        }
        case "aggregated": {
          for (var i = 0; i < tempStorage.length; i++) {
            var elemAddress = elemShotNameToElementAddress(tempStorage[i]);
            if (
              elemAddress.type === "ChartAnno" ||
              elemAddress.type === "TextChunk" ||
              elemAddress.type === "TextAnno" ||
              elemAddress.type === "TextToken" ||
              elemAddress.type === "HeadTermIndicator" ||
              elemAddress.type === "HeadTerm"
            ) {
              newClickList.push(tempStorage[i]);
            } else if (elemAddress.type === "ChartToken") {
              newClickList.push(tempStorage[i]);
              var chartBin = new ElemAddress(
                "ChartBin",
                getBinIdByTokenID(elemAddress.id),
                elemAddress.user
              );
              newClickList.push(chartBin.getShortName());
            } else if (elemAddress.type === "SAChartBackground") {
              newClickList.push(tempStorage[i]);
              var AChartBackground = new ElemAddress(
                "AChartBackground",
                getBinIdByTokenID(elemAddress.id)
              );
              newClickList.push(AChartBackground.getShortName());
            } else if (elemAddress.type === "HeadToken") {
              newClickList.push(tempStorage[i]);
              var AChartBackground = new ElemAddress(
                "AChartBackground",
                getBinIdByTokenID(elemAddress.id)
              );
              newClickList.push(AChartBackground.getShortName());
              var termId = getTermIdByTokenId(elemAddress.id);
              var headTerm = new ElemAddress("HeadTerm", termId);
              newClickList.push(headTerm.getShortName());
              if (clickSource.type === "HeadTerm") {
                var HeadTermIndicator = new ElemAddress(
                  "HeadTermIndicator",
                  termId
                );
                newClickList.push(HeadTermIndicator.getShortName());
              }
            }
          }
          binTokens.forEach(function (token) {
            var chartBin = new ElemAddress(
              "ChartBin",
              getBinIdByTokenID(token.id),
              token.user
            );
            newClickList.push(chartBin.getShortName());
          });
          binBackgrounds.forEach(function (token) {
            var AChartBackground = new ElemAddress(
              "AChartBackground",
              getBinIdByTokenID(token.id)
            );
            newClickList.push(AChartBackground.getShortName());
          });
          break;
        }
      }
    }
    for (var i = 0; i < newClickList.length; i++) {
      var elemAddress = elemShotNameToElementAddress(newClickList[i]);
      clickElement(elemAddress);
    }
  }

  function clickHoveredElements(soursElement, data = false) {
    if (clicked.length == 0) {
      clickSource = soursElement;
      if (chart.modeDetail === "aggregated") {
        switch (clickSource.type) {
          case "ChartBin": {
            chart.d.detailBins[soursElement.id].tokens.forEach(function (
              token
            ) {
              binBackgrounds.push(new ElemAddress("HeadToken", token.id));
              binTokens.push(
                new ElemAddress("ChartToken", token.id, soursElement.user)
              );
            });
            break;
          }
          case "AChartBackground": {
            chart.d.detailBins[soursElement.id].tokens.forEach(function (
              token
            ) {
              binBackgrounds.push(new ElemAddress("HeadToken", token.id));
              chart.d.users.forEach(function (user) {
                binTokens.push(new ElemAddress("ChartToken", token.id, user));
              });
            });
            break;
          }
          case "TextToken": {
            binBackgrounds.push(new ElemAddress("HeadToken", soursElement.id));
            chart.d.users.forEach(function (user) {
              binTokens.push(
                new ElemAddress("ChartToken", soursElement.id, user)
              );
            });
            break;
          }
          case "HeadTerm": {
            data.localTokens.forEach(function (token) {
              binBackgrounds.push(new ElemAddress("HeadToken", token.id));
              chart.d.users.forEach(function (user) {
                binTokens.push(new ElemAddress("ChartToken", token.id, user));
              });
            });
            break;
          }
          default: {
            console.error(
              "Tere is no click sourse with name:" + clickSource.type
            );
          }
        }
      }
      for (var i = 0; i < temp.length; i++) {
        var elemAddress = elemShotNameToElementAddress(temp[i]);
        clickElement(elemAddress, true);
      }
    } else {
      clickSource = 0;
      binTokens = [];
      binBackgrounds = [];
      deactivatedClickedElements();
    }
  }

  function isClicked(elemAddress) {
    var shortName = elemAddress.getShortName();
    var index = clicked.indexOf(shortName);
    if (index === -1) {
      return false;
    } else {
      return true;
    }
  }

  function isBlocked(elemAddress) {
    var shortName = elemAddress.getShortName();
    var index = blocked.indexOf(shortName);
    if (index === -1) {
      return false;
    } else {
      return true;
    }
  }

  function addToHoveredList(elemAddres, mod = true) {
    if (!chart.d.shortlens) {
      var shortName = elemAddres.getShortName();
      if (mod) {
        if (!hovered.includes(shortName)) {
          hovered.push(shortName);
          return true;
        } else {
          return false;
        }
      } else {
        var index = hovered.indexOf(shortName);
        if (index > -1) {
          hovered.splice(index, 1);
          return true;
        } else {
          return false;
        }
      }
    }
  }

  function addToBlockedList(elemAddres, mod = true) {
    var shortName = elemAddres.getShortName();
    if (mod) {
      if (!blocked.includes(shortName)) {
        blocked.push(shortName);
      }
    } else {
      var index = blocked.indexOf(shortName);
      if (index > -1) {
        blocked.splice(index, 1);
      }
    }
  }

  function addToClickedList(elemAddres, mod = true) {
    var shortName = elemAddres.getShortName();
    if (mod) {
      if (!clicked.includes(shortName)) {
        clicked.push(shortName);
        return true;
      } else {
        return false;
      }
    } else {
      var index = clicked.indexOf(shortName);
      if (index > -1) {
        clicked.splice(index, 1);
        return true;
      } else {
        return false;
      }
    }
  }

  function elemShotNameToElementAddress(shortName) {
    var elemParams = shortName.split("_");
    var elemAddress;
    if (elemParams.length === 3) {
      elemAddress = new ElemAddress(
        elemParams[0],
        elemParams[1],
        elemParams[2]
      );
    } else {
      elemAddress = new ElemAddress(elemParams[0], elemParams[1]);
    }
    return elemAddress;
  }

  function deactivatedHoveredElements() {
    var tempStorage = hovered.slice(0);
    var length = tempStorage.length;
    for (var i = 0; i < length; i++) {
      var elemAddress = elemShotNameToElementAddress(tempStorage[i]);
      highlightElement(elemAddress, false);
    }
  }

  function deactivatedClickedElements() {
    var tempStorage = clicked.slice(0);
    var length = tempStorage.length;
    for (var i = 0; i < length; i++) {
      var elemAddress = elemShotNameToElementAddress(tempStorage[i]);
      clickElement(elemAddress, false);
    }
  }

  function highlightElement(elemAddress, mod = true) {
    if (!isClicked(elemAddress) && !isBlocked(elemAddress)) {
      if (addToHoveredList(elemAddress, mod)) {
        switch (elemAddress.type) {
          case "HeadToken": {
            highlightHeadToken(elemAddress, mod);
            break;
          }
          case "HeadTerm": {
            highlightHeadTerm(elemAddress, mod);
            break;
          }
          case "HeadTermIndicator": {
            highlightHeadTermIndicator(elemAddress, mod);
            break;
          }
          case "ChartToken": {
            highlightChartToken(elemAddress, mod);
            break;
          }
          case "ChartBin": {
            highlightChartBin(elemAddress, mod);

            break;
          }
          case "ChartAnno": {
            highlightChartAnno(elemAddress, mod);
            break;
          }
          case "SAChartBackground": {
            highlightSAChartBackground(elemAddress, mod);
            break;
          }
          case "AChartBackground": {
            highlightAChartBackground(elemAddress, mod);
            break;
          }
          case "TextToken": {
            highlightTextToken(elemAddress, mod);
            break;
          }
          case "TextChunk": {
            highlightTextChunk(elemAddress, mod);
            break;
          }
          case "TextAnno": {
            highlightTextAnno(elemAddress, mod);
            break;
          }
        }
      }
    }
  }

  function clickElement(elemAddress, mod = true) {
    if (addToClickedList(elemAddress, mod)) {
      switch (elemAddress.type) {
        case "HeadToken": {
          highlightHeadToken(elemAddress, mod);
          break;
        }
        case "HeadTerm": {
          highlightHeadTerm(elemAddress, mod);
          break;
        }
        case "HeadTermIndicator": {
          highlightHeadTermIndicator(elemAddress, mod);
          break;
        }
        case "ChartToken": {
          highlightChartToken(elemAddress, mod);
          break;
        }
        case "ChartBin": {
          highlightChartBin(elemAddress, mod);
          break;
        }
        case "ChartAnno": {
          highlightChartAnno(elemAddress, mod);
          break;
        }
        case "SAChartBackground": {
          highlightSAChartBackground(elemAddress, mod);
          break;
        }
        case "AChartBackground": {
          highlightAChartBackground(elemAddress, mod);
          break;
        }
        case "TextToken": {
          highlightTextToken(elemAddress, mod);
          break;
        }
        case "TextChunk": {
          var chunkData =
            chart.d.chunks["user" + elemAddress.user][elemAddress.id];
          var first = chunkData.tokens.first;
          var last = chunkData.tokens.last;
          for (var i = first; i <= last; i++) {
            chart.d.tokenChunks[i].forEach(function (chunk) {
              var chunkAddres = new ElemAddress(
                "TextChunk",
                chunk.id,
                chunk.user
              );
              addToBlockedList(chunkAddres, mod);
            });
          }
          highlightTextChunk(elemAddress, mod);
          break;
        }
        case "TextAnno": {
          var annoData =
            chart.d.annos["user" + elemAddress.user][elemAddress.id];
          var firstToken = annoData.tokens.first;
          var lastToken = annoData.tokens.last;
          for (var i = firstToken; i <= lastToken; i++) {
            chart.d.users.forEach(function (user) {
              chart.d.tokens[i].annos["user" + user].forEach(function (anno) {
                var annoAddres = new ElemAddress("TextAnno", anno.id, user);
                addToBlockedList(annoAddres, mod);
              });
            });
          }
          highlightTextAnno(elemAddress, mod);
          break;
        }
      }
    }
  }

  function highlightTextAnno(elemAddress, mod = true) {
    var elements = elemAddress.getElement();
    var annoData = chart.d.annos["user" + elemAddress.user][elemAddress.id];
    var types = annoData.types;
    var gradient = "white";
    if (mod) {
      // gradient
      gradient = "linear-gradient(";
      types.forEach(function (color) {
        var gradientColor = typeRect(color.type, 1);
        if (gradient === "linear-gradient(") {
          gradient = gradient + gradientColor;
        }
        gradient = gradient + ", " + gradientColor;
      });
      gradient = gradient + ")";
    }
    elements.classed("tx_active_a", mod).style("background", gradient);
  }

  // textIndicator_g activeTerm  semiAggregated id1228
  function highlightHeadTerm(elemAddress, mod = true) {
    if (elemAddress !== -1 && chart.modeDetail !== "atomic") {
      var element = elemAddress.getElement();
      if (!element.empty()) {
        element.classed("activeTerm", mod);
      }
    }
  }

  function highlightHeadTermIndicator(elemAddress, mod = true) {
    if (elemAddress !== -1) {
      var element = elemAddress.getElement();
      element.classed("activeTerm", mod);
    }
  }

  function highlightAChartBackground(elemAddress, mod = true) {
    var element = elemAddress.getElement();
    if (!element.empty()) {
      element.classed("activeAnnoChartToken", mod);
    } else {
      if (mod) {
        if (chart.modeDetail === "aggregated") {
          var binSteps =
            chart.p.width / (chart.d.binRange[1] - chart.d.binRange[0] + 1);
          var x = binSteps * (elemAddress.id - chart.d.binRange[0]);
          var translateHeight =
            chart.p.tokenTextHeight + chart.p.tokenPolygonHeight;
          d3.select("#detailBgT_g")
            .append("rect")
            .classed("noAnnoBgBin", true)
            .attr("id", "noAnno_bg_b" + elemAddress.id)
            .attr("width", binSteps)
            .attr("height", chart.p.tokenBarHeight)
            .attr("transform", "translate(" + x + "," + translateHeight + ")");
        }
      } else {
        d3.selectAll("#noAnno_bg_b" + elemAddress.id).remove();
      }
    }
  }

  function highlightAggregatedChartNotAnnotatedBin(elemAddress, mod) {
    if (mod) {
      if (chart.modeDetail === "aggregated") {
        var binSteps =
          chart.p.width / (chart.d.binRange[1] - chart.d.binRange[0] + 1);
        var x = binSteps * (elemAddress.id - chart.d.binRange[0]);
        // var x = elemAddress.id;
        d3.selectAll("#userTokens_BinsG" + elemAddress.user)
          .append("rect")
          .classed("noAnnoSemiAggregated_t_b", true)
          .attr("id", "noAnno_u" + elemAddress.user + "_b" + elemAddress.id)
          .attr("width", 1)
          .attr("height", chart.p.userHeight)
          .attr("transform", "translate(" + x + "," + 0 + ")");
      }
    } else {
      d3.selectAll(
        "#noAnno_u" + elemAddress.user + "_b" + elemAddress.id
      ).remove();
    }
  }

  function highlightSAChartBackground(elemAddress, mod = true) {
    var element = elemAddress.getElement();
    if (!element.empty() && chart.modeDetail === "semiAggregated") {
      element.classed("activeAnnoChartToken", mod);
    } else {
      if (mod) {
        if (chart.modeDetail === "semiAggregated") {
          var tokenSteps =
            chart.p.width / (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1);
          var x = tokenSteps * (elemAddress.id - chart.d.tokenRange[0]);
          d3.select("#detailBgT_g")
            .append("rect")
            .classed("noAnnoBgToken", true)
            .attr("id", "noAnno_bg_t" + elemAddress.id)
            .attr("width", tokenSteps)
            .attr("height", chart.p.tokenBarHeight)
            .attr("transform", "translate(" + x + "," + 130 + ")");
        }
      } else {
        d3.selectAll("#noAnno_bg_t" + elemAddress.id).remove();
      }
    }
  }

  function highlightChartBin(elemAddress, mod = true) {
    var binAnnoGroupID = ".idu" + elemAddress.user + "_b" + elemAddress.id;
    d3.selectAll(".binAnnos" + binAnnoGroupID)
      .selectAll("*")
      .style("fill", function (d) {
        return typeRect(d.type, !mod);
      });
    var element = elemAddress.getElement();
    if (element.empty()) {
      highlightAggregatedChartNotAnnotatedBin(elemAddress, mod);
    } else {
      element.classed("activeAnnoChartBin", mod);
    }
  }

  function highlightHeadToken(elemAddress, mod = true) {
    var element = elemAddress.getElement();
    if (!element.empty()) {
      if (!element.data()[0].annotated) {
        element.classed("activeNoAnnoChartToken", mod);
      } else {
        element.classed("activeAnnoChartToken", mod);
      }
    }
  }

  function highlightTextToken(elemAddress, mod = true) {
    var token = elemAddress.getElement();
    if (!token.empty()) {
      if (chart.d.tokens[elemAddress.id].annotated) {
        token.classed("activeAnnotatedTextToken", mod);
      } else {
        token.classed("activeTextToken", mod);
      }
      // scrollToTarget(elemAddress.id, "nearest");
    }
  }

  function highlightChartToken(elemAddress, mod = true) {
    var tokenAnnGroupID = ".idu" + elemAddress.user + "_t" + elemAddress.id;
    d3.selectAll(".tokenAnnos" + tokenAnnGroupID)
      .selectAll("*")
      .style("fill", function (d) {
        return typeRect(d.type, !mod);
      });

    var element = elemAddress.getElement();
    if (element.empty()) {
      highlightSemiAggregatedChartNotAnnotatedToken(elemAddress, mod);
    } else {
      element
        .classed("activeNoAnnoChartToken", function (d) {
          return !(d.token.annos["user" + elemAddress.user].length > 0) && mod;
        })
        .classed("activeAnnoChartToken", function (d) {
          return d.token.annos["user" + elemAddress.user].length > 0 && mod;
        });
    }
  }

  function highlightSemiAggregatedChartNotAnnotatedToken(
    elemAddres,
    mod = true
  ) {
    if (!chart.d.shortlens) {
      if (mod) {
        if (chart.modeDetail === "semiAggregated") {
          var tokenSteps =
            chart.p.width / (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1);
          var x = tokenSteps * (elemAddres.id - chart.d.tokenRange[0]);
          d3.select("#userTokens_BinsG" + elemAddres.user)
            .append("rect")
            .classed("noAnnoSemiAggregated_t_b", true)
            .attr("id", "noAnno_u" + elemAddres.user + "_t" + elemAddres.id)
            .attr("width", tokenSteps)
            .attr("height", chart.p.userHeight)
            .attr("transform", "translate(" + x + "," + 0 + ")");
        }
      } else {
        d3.selectAll(
          "#noAnno_u" + elemAddres.user + "_t" + elemAddres.id
        ).remove();
      }
    }
  }

  function highlightChartAnno(elemAddress, mod = true) {
    var anno = elemAddress.getElement();
    if (!anno.empty()) {
      anno
        .select(".types")
        .selectAll("rect")
        .style("fill", function (d) {
          return typeRect(d.type, !mod);
        });
      //for compressed annos
      if (mod) {
        anno.selectAll(".compressed").style("fill", "rgba(0, 0, 0, 1)");
      } else {
        anno.selectAll(".compressed").style("fill", "rgba(0, 0, 0, 0.3)");
      }
    }
  }

  function highlightTextChunk(elemAddress, mod = true) {
    // var elemAddress  = new ElemAddress("TextChunk", id, user);
    var selcetion = elemAddress.getElement();
    selcetion.classed("underlineActive", mod);
    var last = selcetion._groups[0].length; //Last element of chunk

    selcetion.each(function (d, i) {
      //left border
      if (i == 0) {
        d3.select(this).classed("firstActiveChunk", mod);
      }
      //right Border
      if (i == last - 1) {
        d3.select(this).classed("lastActiveChunk", mod);
      }
    });
  }

  // Reveal public pointers to
  // private functions and properties

  return {
    hovered: hovered,
    clicked: clicked,
    blocked: blocked,
    highlightSemiAggregatedChartNotAnnotatedToken: highlightSemiAggregatedChartNotAnnotatedToken,
    highlightSAChartBackground: highlightSAChartBackground,
    highlightElement: highlightElement,
    clickHoveredElements,
    deactivatedHoveredElements: deactivatedHoveredElements,
    storePossiblyClickedElements: storePossiblyClickedElements,
    refreshClickedElements: refreshClickedElements,
  };
})();
