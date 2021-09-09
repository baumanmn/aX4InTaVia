import * as d3 from "d3";
import { updateChanksWithFilteredData } from "./textArea";
import { typeArray } from "./constants";
import { typeRect } from "./colorMaps";
import { ElemAddress } from "./elemAddress";
import {
  arraysEqual,
  getBinIdByTokenID,
  removeArrayDuplicates,
} from "./functions";

var chart;
var boxes = [];
var overlaps = [];
export var filter;

export function initFilters(globalChart) {
  chart = globalChart;
  initFilterPanel();
  boxes = preCalculateBoxes();
  overlaps = preCalculateOverlaps(boxes);
  // console.log(boxes);
  // console.log(overlaps);
}

export function applyFiltersAfterBrashAndZoom() {
  if (chart) {
    toggleUserTokensBins();
    toggleAnnos();
    applyFilters();
  }
}

function applyFiltersAfterFilterChange() {
  applyFilters(true);
}

function applyFilters(refresh = false) {
  var users = getFilteredUsers(); // Selected users
  var types = getFilteredTypes(); // Selected types
  var filterMode = getFilterMod(); //can be default, identical, different

  if (filter == null) {
    refresh = true;
  }
  if (refresh) {
    var filteredBoxes = filterBoxes(boxes, users, types);
    var filteredOverlaps = filterOverlaps(filteredBoxes, overlaps);
    // tokenDisplayTypes = newFilterTokens(filteredBoxes, filteredOverlaps, filterMode, users);
    switch (filterMode) {
      case "default":
        filter = defaultFilter(filteredBoxes, filteredOverlaps, users);
        break;
      case "identical":
        filter = identicalFilter(filteredBoxes, filteredOverlaps, users);
        break;
      case "different":
        filter = differentFilter(filteredBoxes, filteredOverlaps, users);
        break;
      default:
        console.error("There is no " + filterMode + "mode");
    }

    updateChanksWithFilteredData(filter.tokenDisplayTypes, users);
    chartFilterByUser(users);

    clearCSSFilterRules();
    var notSelectedTypes = getNotSelectedTypes(types);
    setCSSFilterRules(filter.annos, filterMode, notSelectedTypes, users);
  }
}

function clearCSSFilterRules() {
  var sheet = document.styleSheets[1];
  for (var i = sheet.rules.length - 1; i >= 0; i--) {
    sheet.deleteRule(i);
  }
}

function setCSSFilterRules(annos, filterMode, notSelectedTypes, users) {
  // console.log(notSelectedTypes);
  var sheet = document.styleSheets[1];
  notSelectedTypes.forEach(function (type) {
    sheet.insertRule(".types ." + type + "{fill-opacity: 0;}", 0);
    sheet.insertRule(".tokenAnnos ." + type + "{fill-opacity: 0;}", 0);
    sheet.insertRule(".binAnnos ." + type + "{fill-opacity: 0;}", 0);
  });
  annos.forEach(function (anno) {
    var annoID = ".idu" + anno.user + "_a" + anno.id;
    if (!anno.active) {
      sheet.insertRule(annoID + " .type" + "{fill-opacity: 0;}", 0);
      // sheet.insertRule(annoID + " .compressed" + "{display: none;}", 0); // for compressed
      sheet.insertRule(
        ".chunk > .semiAggregated  " + annoID + "{display: none;}",
        0
      );
      sheet.insertRule(
        ".pseudoChunk  > .aggregated   " + annoID + "{display: none;}",
        0
      );

      for (var tokenID = anno.first; tokenID <= anno.last; tokenID++) {
        anno.types.forEach(function (type) {
          sheet.insertRule(
            ".idu" +
              anno.user +
              "_t" +
              tokenID +
              " ." +
              type +
              "{fill-opacity: 0;}",
            0
          );
        });
      }
    }
  });
}

// function setCSSFilterRules(annos, filterMode, notSelectedTypes, users) {
//
//     var sheet = document.styleSheets[1];
//     var fillOpSelectors = [];
//     var displayNoneSelectores = [];
//     notSelectedTypes.forEach(function (type) {
//         fillOpSelectors.push(".types ." +  type);
//         fillOpSelectors.push(".tokenAnnos ." +  type);
//         fillOpSelectors.push(".binAnnos ." +  type);
//     });
//     annos.forEach(function (anno) {
//         if (!anno.active){
//             var annoID = ".idu"+ anno.user + "_a"+ anno.id;
//             fillOpSelectors.push(annoID + " .type");
//             displayNoneSelectores.push(".chunk > .semiAggregated  " + annoID);
//             displayNoneSelectores.push(".pseudoChunk  > .aggregated   " + annoID);
//             for (var tokenID = anno.first; tokenID<= anno.last; tokenID++){
//                 anno.types.forEach(function (type) {
//                     fillOpSelectors.push(".idu" + anno.user + "_t" + tokenID + " ."+ type );
//                 });
//             }
//         }
//     });
//
//     if (fillOpSelectors.length > 0){
//
//         sheet.insertRule(fillOpSelectors.join(',\n') + "{fill-opacity: 0;}", 0);
//     }
//     if (displayNoneSelectores.length > 0){
//
//         sheet.insertRule(displayNoneSelectores.join(',\n') + "{display: none;}", 0);
//     }
//
// }

function filterByAnnos(annos) {
  if (chart.modeDetail === "atomic") {
    annos.forEach(function (anno) {
      var elementAddress = new ElemAddress("ChartAnno", anno.id, anno.user);
      var element = elementAddress.getElement();
      if (anno.active) {
        element.selectAll(".type").classed("notActiveType", false);
      } else {
        element.selectAll(".type").classed("notActiveType", true);
      }
    });
  } else if (chart.modeDetail === "semiAggregated") {
    annos.forEach(function (anno) {
      let elementAddres = new ElemAddress("ChartAnno", anno.id, anno.user);
      let element = elementAddres.getElement();
      if (anno.active) {
        if (chart.modeDetail === "semiAggregated") {
          element.style("display", "block");
          for (var tokenID = anno.first; tokenID <= anno.last; tokenID++) {
            let parentID = ".idu" + anno.user + "_t" + tokenID;
            let annoTypeParent = d3.select(".tokenAnnos" + parentID);
            typeArray.forEach(function (type) {
              annoTypeParent
                .selectAll("." + type)
                .classed("notActiveType", false);
            });
          }
        }
      } else {
        element.style("display", "none");
        for (var tokenID = anno.first; tokenID <= anno.last; tokenID++) {
          let parentID = ".idu" + anno.user + "_t" + tokenID;
          let annoTypeParent = d3.select(".tokenAnnos" + parentID);
          typeArray.forEach(function (type) {
            annoTypeParent.selectAll("." + type).classed("notActiveType", true);
          });
        }
      }
    });
  } else {
    annos.forEach(function (anno) {
      if (anno.active) {
        let className = ".idu" + anno.user + "_a" + anno.id;
        let element = d3.select(className);
        element.style("display", "block");

        for (var tokenID = anno.first; tokenID <= anno.last; tokenID++) {
          let parentID = ".idu" + anno.user + "_b" + getBinIdByTokenID(tokenID);
          let annoTypeParent = d3.select(".binAnnos" + parentID);
          typeArray.forEach(function (type) {
            annoTypeParent
              .selectAll("." + type)
              .classed("notActiveType", false);
          });
        }
      } else {
        let className = ".idu" + anno.user + "_a" + anno.id;
        let element = d3.select(className);
        element.style("display", "none");

        for (var tokenID = anno.first; tokenID <= anno.last; tokenID++) {
          let parentID = ".idu" + anno.user + "_b" + getBinIdByTokenID(tokenID);
          let annoTypeParent = d3.select(".binAnnos" + parentID);
          typeArray.forEach(function (type) {
            annoTypeParent.selectAll("." + type).classed("notActiveType", true);
          });
        }
      }
    });
  }
}

function defaultFilter(fBoxes, fOverlaps, users) {
  var sortedFilters = {};
  chart.d.users.forEach(function (user) {
    sortedFilters[user] = {};
  });
  var filterTokenDisplayTypes = [];
  var filteredAnnos = [];
  for (let index in fBoxes) {
    if (!fBoxes[index].active) {
      for (var i = fBoxes[index].first; i <= fBoxes[index].last; i++) {
        if (filterTokenDisplayTypes[i] == null) {
          filterTokenDisplayTypes[i] = false;
        }
      }
      fBoxes[index].annos.forEach(function (anno) {
        anno.active = false;
        filteredAnnos.push(anno);
        sortedFilters[anno.user][anno.id] = anno.active;
      });
    } else {
      for (var i = fBoxes[index].first; i <= fBoxes[index].last; i++) {
        if (fBoxes[index].types.length == 1) {
          filterTokenDisplayTypes[i] = fBoxes[index].types[0];
        } else {
          filterTokenDisplayTypes[i] = true;
        }
      }
      // console.log(fBoxes);
      fBoxes[index].annos.forEach(function (anno) {
        anno.first = fBoxes[index].first;
        anno.last = fBoxes[index].last;
        anno.active = true;
        anno.types = fBoxes[index].types;
        filteredAnnos.push(anno);
        sortedFilters[anno.user][anno.id] = anno.active;
      });
    }
  }
  for (let index in fOverlaps) {
    for (var i = fOverlaps[index].first; i <= fOverlaps[index].last; i++) {
      if (
        fOverlaps[index].types.length == 1 &&
        fOverlaps[index].types[0] != filterTokenDisplayTypes[i]
      ) {
        filterTokenDisplayTypes[i] = true;
      } else if (fOverlaps[index].types.length > 1) {
        filterTokenDisplayTypes[i] = true;
      }
    }
  }
  return {
    annos: filteredAnnos,
    tokenDisplayTypes: filterTokenDisplayTypes,
    sortedFilters: sortedFilters,
  };
}

function identicalFilter(fBoxes, fOverlaps, users) {
  var sortedFilters = {};
  chart.d.users.forEach(function (user) {
    sortedFilters[user] = {};
  });
  var filterTokenDisplayType = [];
  var filteredAnnos = [];
  var identicalList = [];
  for (let index in fBoxes) {
    if (!fBoxes[index].active || fBoxes[index].annos.length != users.length) {
      identicalList[index] = false;
    } else {
      identicalList[index] = true;
    }
  }
  for (let index in fOverlaps) {
    if (
      !identicalList[fOverlaps[index].boxes[0]] ||
      !identicalList[fOverlaps[index].boxes[1]]
    ) {
      identicalList[fOverlaps[index].boxes[0]] = false;
      identicalList[fOverlaps[index].boxes[1]] = false;
    }
  }
  for (let index in identicalList) {
    if (!identicalList[index]) {
      for (var i = fBoxes[index].first; i <= fBoxes[index].last; i++) {
        if (filterTokenDisplayType[i] == null) {
          filterTokenDisplayType[i] = false;
        }
      }
      fBoxes[index].annos.forEach(function (anno) {
        anno.active = false;
        filteredAnnos.push(anno);

        sortedFilters[anno.user][anno.id] = anno.active;
      });
    } else {
      for (var i = fBoxes[index].first; i <= fBoxes[index].last; i++) {
        if (fBoxes[index].types.length == 1) {
          filterTokenDisplayType[i] = fBoxes[index].types[0];
        } else {
          filterTokenDisplayType[i] = true;
        }
      }
      fBoxes[index].annos.forEach(function (anno) {
        anno.active = true;
        anno.first = fBoxes[index].first;
        anno.last = fBoxes[index].last;
        anno.types = fBoxes[index].types;
        filteredAnnos.push(anno);
        sortedFilters[anno.user][anno.id] = anno.active;
      });
    }
  }

  return {
    annos: filteredAnnos,
    tokenDisplayTypes: filterTokenDisplayType,
    sortedFilters: sortedFilters,
  };
}

function differentFilter(fBoxes, fOverlaps, users) {
  var sortedFilters = {};
  chart.d.users.forEach(function (user) {
    sortedFilters[user] = {};
  });
  var filterTokenDisplayType = [];
  var filteredAnnos = [];
  var identicalList = [];
  for (let index in fBoxes) {
    if (!fBoxes[index].active || fBoxes[index].annos.length != users.length) {
      identicalList[index] = false;
    } else {
      identicalList[index] = true;
    }
  }
  for (let index in fOverlaps) {
    if (
      !identicalList[fOverlaps[index].boxes[0]] ||
      !identicalList[fOverlaps[index].boxes[1]]
    ) {
      identicalList[fOverlaps[index].boxes[0]] = false;
      identicalList[fOverlaps[index].boxes[1]] = false;
    }
  }

  for (let index in identicalList) {
    if (!identicalList[index]) {
      for (var i = fBoxes[index].first; i <= fBoxes[index].last; i++) {
        if (filterTokenDisplayType[i] == null) {
          filterTokenDisplayType[i] = true;
        }
      }
      fBoxes[index].annos.forEach(function (anno) {
        anno.active = true;
        anno.first = fBoxes[index].first;
        anno.last = fBoxes[index].last;
        anno.types = fBoxes[index].types;
        filteredAnnos.push(anno);
        sortedFilters[anno.user][anno.id] = anno.active;
      });
    } else {
      for (var i = fBoxes[index].first; i <= fBoxes[index].last; i++) {
        filterTokenDisplayType[i] = false;
      }
      fBoxes[index].annos.forEach(function (anno) {
        anno.active = false;
        filteredAnnos.push(anno);
        sortedFilters[anno.user][anno.id] = anno.active;
      });
    }
  }
  return {
    annos: filteredAnnos,
    tokenDisplayTypes: filterTokenDisplayType,
    sortedFilters: sortedFilters,
  };
}

function chartFilterByUser(users) {
  chart.d.users.forEach(function (user) {
    if (users.indexOf(parseInt(user)) === -1) {
      d3.select("#userLayerG" + user).style("display", "none");
    } else {
      d3.select("#userLayerG" + user).style("display", "block");
    }
  });
}

// function chartFilterByAnnos(displayTypes, types) {
//     for (let i = chart.d.tokenRange[0]; i <= chart.d.tokenRange[1]; i++) {
//         if (displayTypes[i] === false) {
//             chart.d.users.forEach(function (user) {
//                 chart.d.tokens[i].annos["user" + user].forEach(function (anno) {
//
//                     if (chart.modeDetail === "atomic") {
//                         let elementAddres = new ElemAddress("ChartAnno", anno.id, parseInt(user));
//                         let element = elementAddres.getElement();
//                         element.selectAll(".type")
//                             .classed("notActiveType", true);
//                     }
//
//                     if (chart.modeDetail === "semiAggregated") {
//                         let elementAddres = new ElemAddress("ChartAnno", anno.id, parseInt(user));
//                         let element = elementAddres.getElement();
//                         let parentID = ".idu" + user + "_t" + i;
//                         let annoTypeParent = d3.select(".tokenAnnos" + parentID);
//                         element.style("display", "none");
//                         typeArray.forEach(function (type) {
//                             annoTypeParent.selectAll("." + type)
//                                 .classed("notActiveType", true)
//
//                         });
//
//                     }
//                     if (chart.modeDetail === "aggregated") {
//                         let className = ".idu" + user + "_a" + anno.id;
//                         let element = d3.select(className);
//                         element.style("display", "none");
//                         let parentID = ".idu" + user + "_b" + getBinIdByTokenID(i);
//                         let annoTypeParent = d3.select(".binAnnos" + parentID);
//                         typeArray.forEach(function (type) {
//                             annoTypeParent.selectAll("." + type)
//                                 .classed("notActiveType", true)
//
//                         });
//
//                     }
//                 })
//             })
//         } else {
//             chart.d.users.forEach(function (user) {
//                 chart.d.tokens[i].annos["user" + user].forEach(function (anno) {
//                     let elementAddres = new ElemAddress("ChartAnno", anno.id, parseInt(user));
//                     let element = elementAddres.getElement();
//                     let parentID = ".idu" + user + "_t" + i;
//                     let annoTypeParent = d3.select(".tokenAnnos" + parentID);
//
//                     if (chart.modeDetail === "atomic") {
//                         element.selectAll(".type")
//                             .classed("notActiveType", false);
//                     }
//                     if (chart.modeDetail === "semiAggregated") {
//                         element.style("display", "block");
//                         typeArray.forEach(function (type) {
//                             annoTypeParent.selectAll("." + type)
//                                 .classed("notActiveType", false)
//
//                         });
//                     }
//                     if (chart.modeDetail === "aggregated") {
//                         let className = ".idu" + user + "_a" + anno.id;
//                         let element = d3.selectAll(className);
//                         element.style("display", "block");
//                         let parentID = ".idu" + user + "_b" + getBinIdByTokenID(i);
//                         let annoTypeParent = d3.select(".binAnnos" + parentID);
//                         typeArray.forEach(function (type) {
//                             annoTypeParent.selectAll("." + type)
//                                 .classed("notActiveType", false)
//
//                         });
//                     }
//
//                 })
//             })
//         }
//
//     }
//
// }

// function chartFilterByTypes(types) {
//     typeArray.forEach(function (type) {
//         if (types.indexOf(type) === -1) {
//             d3.selectAll("." + type)
//                 .classed("notActiveType", true)
//         } else {
//             d3.selectAll("." + type)
//                 .classed("notActiveType", false)
//         }
//     });
//
//     if (chart.modeDetail === "semiAggregated") {
//         for (var i = chart.d.tokenRange[0]; i <= chart.d.tokenRange[1]; i++) {
//             if (chart.d.tokens[i].annotated) {
//                 chart.d.users.forEach(function (user) {
//                     chart.d.tokens[i].annos["user" + user].forEach(function (anno) {
//                         var elementAddres = new ElemAddress("ChartAnno", anno.id, parseInt(user));
//                         var element = elementAddres.getElement();
//                         if (anno.types.length === 1) {
//                             if (types.indexOf(anno.types[0].type) === -1) {
//                                 element.style("display", "none");
//
//                             } else {
//                                 element.style("display", "block");
//                             }
//                         } else {
//                             var conter = 0;
//                             for (var i = 0; i < anno.types.length; i++) {
//                                 if (!types.includes(anno.types[i].type)) {
//                                     conter++;
//                                 }
//                             }
//                             if (conter === anno.types.length) {
//                                 element.style("display", "none");
//                             } else {
//                                 element.style("display", "block");
//                             }
//                         }
//                     })
//                 });
//             }
//         }
//     }
//
//     if (chart.modeDetail === "aggregated") {
//         for (var i = chart.d.tokenRange[0]; i <= chart.d.tokenRange[1]; i++) {
//             if (chart.d.tokens[i].annotated) {
//                 chart.d.users.forEach(function (user) {
//                     chart.d.tokens[i].annos["user" + user].forEach(function (anno) {
//                         var className = ".idu" + user + "_a" + anno.id;
//                         var element = d3.select(className);
//                         if (anno.types.length === 1) {
//                             if (types.indexOf(anno.types[0].type) === -1) {
//                                 element.style("display", "none");
//                             } else {
//                                 element.style("display", "block");
//                             }
//                         } else {
//                             var conter = 0;
//                             for (var i = 0; i < anno.types.length; i++) {
//                                 if (!types.includes(anno.types[i].type)) {
//                                     conter++;
//                                 }
//                             }
//                             if (conter === anno.types.length) {
//                                 element.style("display", "none");
//                             } else {
//                                 element.style("display", "block");
//                             }
//                         }
//                     })
//                 });
//             }
//         }
//     }
//
// }

function toggleUserTokensBins() {
  if (chart.modeDetail === "aggregated") {
    if (d3.select("#hideUserTokens_Bins").property("checked")) {
      d3.selectAll(".bgBinUsr").classed("transparent", false);
    } else {
      d3.selectAll(".bgBinUsr").classed("transparent", true);
    }
  } else {
    if (d3.select("#hideUserTokens_Bins").property("checked")) {
      d3.selectAll(".bgTokenUsr").classed("transparent", false);
    } else {
      d3.selectAll(".bgTokenUsr").classed("transparent", true);
    }
  }
}
function toggleAnnos() {
  if (chart.modeDetail === "aggregated") {
    if (d3.select("#hideAnnos").property("checked")) {
      d3.selectAll(".anno").classed("transparent", false);
    } else {
      d3.selectAll(".anno").classed("transparent", true);
    }
  }
  if (chart.modeDetail === "semiAggregated") {
    if (d3.select("#hideAnnos").property("checked")) {
      d3.selectAll(".anno").classed("transparent", false);
    } else {
      d3.selectAll(".anno").classed("transparent", true);
    }
  } else {
    if (d3.select("#hideAnnos").property("checked")) {
      d3.selectAll(".type").classed("transparent", false);
    } else {
      d3.selectAll(".type").classed("transparent", true);
    }
  }
}

// TODO Need to be commented
function preCalculateBoxes() {
  var boxArr = [];
  chart.d.users.forEach(function (user) {
    chart.d.annos["user" + user].forEach(function (anno) {
      let types = "";
      anno.types.forEach(function (type) {
        types = types + type.type;
      });
      let boxName = anno.tokens.first + "-" + anno.tokens.last + "_" + types;
      if (typeof boxArr[boxName] === "object") {
        boxArr[boxName].annos.push({
          user: parseInt(user),
          id: anno.id,
        });
      } else {
        var boxTypes = anno.types.map(function (value) {
          return value.type;
        });
        boxArr[boxName] = {
          annos: [
            {
              user: parseInt(user),
              id: anno.id,
            },
          ],
          first: anno.tokens.first,
          last: anno.tokens.last,
          text: anno.text,
          types: boxTypes,
        };
      }
    });
  });
  return boxArr;
}

function preCalculateOverlaps(boxArr) {
  var overlapArr = [];
  var boxesClone = Object.assign({}, boxArr);
  for (let a in boxArr) {
    delete boxesClone[a];
    for (let b in boxesClone) {
      if (a !== b) {
        if (
          boxArr[a].first <= boxesClone[b].last &&
          boxesClone[b].first <= boxArr[a].last
        ) {
          var first =
            boxArr[a].first >= boxesClone[b].first
              ? boxArr[a].first
              : boxesClone[b].first;
          var last =
            boxArr[a].last <= boxesClone[b].last
              ? boxArr[a].last
              : boxesClone[b].last;
          var types = boxArr[a].types.concat(boxesClone[b].types);
          types = removeArrayDuplicates(types);
          var overlap = {
            first: first,
            last: last,
            boxes: [a, b],
            types: types,
          };
          overlapArr.push(overlap);
        }
      }
    }
  }
  return overlapArr;
}

function filterBoxes(boxes, users, types) {
  var filteredBoxes = [];
  for (var key in boxes) {
    let fAnnos = [];
    let fTypes = [];
    boxes[key].annos.forEach(function (anno) {
      if (users.includes(anno.user)) {
        fAnnos.push(anno);
      }
    });
    boxes[key].types.forEach(function (type) {
      if (types.includes(type)) {
        fTypes.push(type);
      }
    });

    if (fAnnos.length == 0 || fTypes.length == 0) {
      filteredBoxes[key] = {
        annos: fAnnos,
        first: boxes[key].first,
        last: boxes[key].last,
        text: boxes[key].text,
        types: fTypes,
        active: false,
      };
    } else {
      filteredBoxes[key] = {
        annos: fAnnos,
        first: boxes[key].first,
        last: boxes[key].last,
        text: boxes[key].text,
        types: fTypes,
        active: true,
      };
    }
  }
  return filteredBoxes;
}

function filterOverlaps(filteredBoxes, overlaps) {
  var filteredOverlaps = [];
  for (let i in overlaps) {
    if (
      filteredBoxes[overlaps[i].boxes[0]].active &&
      filteredBoxes[overlaps[i].boxes[1]].active
    ) {
      var overlapTypes = filteredBoxes[overlaps[i].boxes[0]].types.concat(
        filteredBoxes[overlaps[i].boxes[1]].types
      );
      overlapTypes = removeArrayDuplicates(overlapTypes);
      overlaps[i].types = overlapTypes;
      filteredOverlaps.push(overlaps[i]);
    }
  }
  return filteredOverlaps;
}

function initFilterPanel() {
  var container = d3
    .select("#container")
    .append("div")
    .attr("id", "filtersDiv")
    .style("background-color", "white");

  var leftFilterColumn = container.append("div").attr("class", "column");
  var usersFilter = container.append("div").attr("class", "column");
  var annoTypesFilter = container.append("div").attr("class", "column");
  var filterTypes = container.append("div").attr("class", "column");

  leftFilterColumn
    .append("input")
    .attr("checked", true)
    .attr("type", "checkbox")
    .attr("id", "hideUserTokens_Bins")
    .on("change", toggleUserTokensBins);
  leftFilterColumn
    .append("label")
    .attr("for", "hideUserTokens_Bins")
    .text("User tokens and bins");

  leftFilterColumn
    .append("input")
    .attr("checked", true)
    .attr("type", "checkbox")
    .attr("id", "hideAnnos")
    .on("change", toggleAnnos);
  leftFilterColumn.append("label").attr("for", "hideAnnos").text("Hide anno");

  var form = filterTypes.append("form");
  form
    .append("input")
    .attr("type", "radio")
    .attr("name", "filterType")
    .attr("value", "default")
    .attr("checked", "")
    .attr("id", "defaultRadio")
    .on("change", applyFiltersAfterFilterChange);
  form.append("label").attr("for", "defaultRadio").text("Default");
  form
    .append("input")
    .attr("type", "radio")
    .attr("name", "filterType")
    .attr("value", "identical")
    .attr("id", "identicalRadio")
    .on("change", applyFiltersAfterFilterChange);
  form.append("label").attr("for", "identicalRadio").text("Identical");
  form
    .append("input")
    .attr("type", "radio")
    .attr("name", "filterType")
    .attr("value", "different")
    .attr("id", "differentRadio")
    .on("change", applyFiltersAfterFilterChange);
  form.append("label").attr("for", "differentRadio").text("Different");

  chart.d.users.forEach(function (user) {
    usersFilter
      .append("input")
      .attr("checked", true)
      .attr("type", "checkbox")
      .attr("id", "filterUser" + user)
      .on("change", function () {
        applyFiltersAfterFilterChange();
      });
    usersFilter
      .append("label")
      .attr("for", "filterUser" + user)
      .text("User " + user);
  });

  typeArray.forEach(function (type) {
    annoTypesFilter
      .append("input")
      .attr("checked", true)
      .attr("type", "checkbox")
      .attr("id", "filterType_" + type)
      .on("change", function () {
        applyFiltersAfterFilterChange();
      });
    annoTypesFilter
      .append("label")
      .attr("for", "filterType_" + type)
      .text(type)
      .style("color", function () {
        return typeRect(type);
      });
  });
}

function getFilteredUsers() {
  var users = [];
  chart.d.users.forEach(function (user) {
    if (d3.select("#filterUser" + user).property("checked")) {
      users.push(parseInt(user));
    }
  });
  return users;
}

function getFilteredTypes() {
  var types = [];
  typeArray.forEach(function (type) {
    if (d3.select("#filterType_" + type).property("checked")) {
      types.push(type);
    }
  });
  return types;
}

function getFilterMod() {
  var filterMode = d3.select('input[name="filterType"]:checked').node().value; //can be default, identical, different
  return filterMode;
}

function getNotSelectedTypes(types) {
  var notSelectedTypes = [];
  typeArray.forEach(function (type) {
    if (!types.includes(type)) {
      notSelectedTypes.push(type);
    }
  });
  return notSelectedTypes;
}
