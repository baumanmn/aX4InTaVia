import * as d3 from "d3";
import { typeRect } from "./colorMaps";
import { ElemAddress } from "./elemAddress";

var chart;
var tempTokenRange;

//init text Area
export function initTextArea(globalChart) {
  chart = globalChart;
  tempTokenRange = chart.d.tokenRange;
  var container = d3.select("#container");
  var textContainer = container.append("div").attr("id", "textDiv");
  //region add text area spans
  var textDiv = d3.select("#textDiv");

  for (let i = 0; i < chart.d.tokens.length; i++) {
    textDiv
      .append("span")
      .text(chart.d.tokens[i].text)
      .attr("id", "tx_t_" + chart.d.tokens[i].id)
      .attr("class", "tx_t");
    if (chart.d.tokens[i + 1]) {
      if (chart.d.tokens[i].end !== chart.d.tokens[i + 1].start) {
        textDiv
          .append("span")
          .text(" ")
          .attr("class", "text_whitespace")
          .attr("id", "tx_w_" + chart.d.tokens[i].id);
      }
    }
  }
  upadateTextChunks(chart);
  chart.d.clickFlag = false;
  updateTextArea();
}

//update Text Area
export function updateTextArea() {
  if (chart.d.clickFlag === false) {
    for (let i = 0; i < chart.d.tokens.length; i++) {
      new ElemAddress("TextToken", chart.d.tokens[i].id)
        .getElement()
        .style(
          "background-color",
          i < chart.d.tokenRange[0] || i > chart.d.tokenRange[1]
            ? "#ebebe4"
            : "white"
        )
        // .classed((i < chart.d.tokenRange[0] || i > chart.d.tokenRange[1]) ? "inactive_tx_t" : "active_tx_t", true);
        .classed("inactive_tx_t", function () {
          return i < chart.d.tokenRange[0] || i > chart.d.tokenRange[1]
            ? true
            : false;
        })
        .classed("active_tx_t", function () {
          return i < chart.d.tokenRange[0] || i > chart.d.tokenRange[1]
            ? false
            : true;
        });
      if (chart.d.tokens[i + 1]) {
        if (chart.d.tokens[i].end !== chart.d.tokens[i + 1].start) {
          new ElemAddress("TextWhiteSpace", chart.d.tokens[i].id)
            .getElement()
            .attr("id", "tx_w_" + chart.d.tokens[i].id)
            .style(
              "background-color",
              i < chart.d.tokenRange[0] || i > chart.d.tokenRange[1]
                ? "#ebebe4"
                : "white"
            );
        }
      }
    }
  }
}

export function autoScrollTextArea(mod = true) {
  if (tempTokenRange) {
    if (mod === false) {
      tempTokenRange = chart.d.tokenRange;
    } else {
      if (
        tempTokenRange[0] === chart.d.tokenRange[0] &&
        tempTokenRange[1] !== chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[1], "end");
      } else if (
        tempTokenRange[0] !== chart.d.tokenRange[0] &&
        tempTokenRange[1] === chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[0], "start");
      } else if (
        tempTokenRange[0] > chart.d.tokenRange[0] &&
        tempTokenRange[1] > chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[0], "start");
      } else if (
        tempTokenRange[0] < chart.d.tokenRange[0] &&
        tempTokenRange[1] < chart.d.tokenRange[1]
      ) {
        scrollToTarget(chart.d.tokenRange[1], "end");
      }
      tempTokenRange = chart.d.tokenRange;
    }
  } else {
    tempTokenRange = chart.d.tokenRange;
  }
}

//scrollMod One of "start", "center", "end", or "nearest". Defaults to "center".
export function scrollToTarget(id, scrollMod) {
  // var textTokrnId = "tx_t_" + id;
  // var targetToken = document.getElementById(textTokrnId);
  // if (targetToken) {
  //     targetToken.scrollIntoView({
  //         behavior: 'auto',
  //         block: scrollMod
  //     });
  // }
}

//region update text Chunks
// set span classes and colors
function upadateTextChunks(chart) {
  var tokenArray = [];
  for (var i = 0; i < chart.d.tokens.length; i++) {
    tokenArray[i] = [];
  }
  // chunks which must be displayed
  Object.entries(chart.d.chunks).forEach(function (user) {
    user[1].forEach(function (chunk) {
      for (var i = chunk.tokens.first; i <= chunk.tokens.last; i++) {
        var type = "";
        if (chart.d.tokens[i].displayType.length === 1) {
          type = chart.d.tokens[i].displayType[0];
        }
        var color = typeRect(type, 1);
        var chunkClassName = "text_" + user[0] + "_c" + chunk.id;
        tokenArray[i].push({
          user: parseInt(user[0].slice(4)),
          id: chunk.id,
        });
        new ElemAddress("TextToken", i)
          .getElement()
          .classed(chunkClassName, true)
          .classed("underline", true)
          .style("border-color", color);
        if (i !== chunk.tokens.last) {
          var whitespace = new ElemAddress("TextWhiteSpace", i).getElement();
          if (d3.select(whitespace)) {
            whitespace
              .classed(chunkClassName, true)
              .classed("underline", true)
              .style("border-color", color);
          }
        }
      }
    });
  });
  chart.d.tokenChunks = tokenArray;
}

export function updateChanksWithFilteredData(tokenDisplayTypes, users) {
  // console.log(tokenDisplayTypes);
  d3.selectAll(".tx_t.underline").classed("underline", false);
  d3.selectAll(".text_whitespace.underline").classed("underline", false);

  users.forEach(function (user) {
    chart.d.chunks["user" + user].forEach(function (chunk) {
      for (var i = chunk.tokens.first; i <= chunk.tokens.last; i++) {
        var type = "";
        var color = "";
        if (tokenDisplayTypes[i] === true || tokenDisplayTypes[i] === null) {
          color = "black";
        } else if (tokenDisplayTypes[i] === false) {
          color = "";
        } else {
          type = tokenDisplayTypes[i];
          color = typeRect(type, 1);
        }
        if (color !== "") {
          var chunkClassName = "text_" + user + "_c" + chunk.id;
          new ElemAddress("TextToken", i)
            .getElement()
            .classed("underline", true)
            .style("border-color", color);
          if (i !== chunk.tokens.last) {
            var whitespace = new ElemAddress("TextWhiteSpace", i).getElement();
            if (whitespace) {
              whitespace
                .classed("underline", true)
                .style("border-color", color);
            }
          }
        }
      }
    });
  });
}

//the mode can be one of default, identical, different
export function chunksFilterByUserAndType(users, types, mode) {
  d3.selectAll(".tx_t.underline").classed("underline", false);
  d3.selectAll(".text_whitespace.underline").classed("underline", false);

  var filterTokenDisplayType = [];

  if (mode === "default") {
    chart.d.tokens.forEach(function (token) {
      var displayType = [];
      var tempStorage = [];
      users.forEach(function (user) {
        if (token.types["user" + user].length > 0) {
          var filteredTypes = [];
          token.types["user" + user].forEach(function (type) {
            if (types.indexOf(type) !== -1) {
              filteredTypes.push(type);
            }
          });
          if (filteredTypes.length > 0) {
            tempStorage.push(filteredTypes);
          }
        }
      });

      if (tempStorage.length > 0) {
        if (tempStorage.length === 1) {
          displayType = tempStorage[0];
        } else {
          var identical = true;
          for (var i = 1; i < tempStorage.length; i++) {
            if (
              tempStorage[0].sort().toString() !==
              tempStorage[i].sort().toString()
            ) {
              identical = false;
            }
          }
          if (identical) {
            displayType = tempStorage[1];
          } else {
            displayType = false;
          }
        }
      }
      console.log();
      filterTokenDisplayType.push(displayType);
    });
  } else if (mode === "identical") {
    chart.d.tokens.forEach(function (token) {
      var displayType = [];
      if (token.annotated) {
        //First Filter by anno numbers per user
        var numberOfFirstUsersAnnos = token.annos["user" + users[0]].length;
        var sameAmountOfAnnos = true;
        for (var i = 1; i < users.length; i++) {
          if (
            token.annos["user" + users[i]].length !== numberOfFirstUsersAnnos ||
            numberOfFirstUsersAnnos === 0
          ) {
            sameAmountOfAnnos = false;
            break;
          }
        }
        if (sameAmountOfAnnos) {
          // filter if annos have same token range
          token.annos["user" + users[0]].forEach(function (anno) {
            var SucssesCounter = 0;
            for (var i = 1; i < users.length; i++) {
              token.annos["user" + users[i]].forEach(function (annoToCompare) {
                if (
                  anno.tokens.first === annoToCompare.tokens.first &&
                  anno.tokens.last === annoToCompare.tokens.last &&
                  anno.types.length === annoToCompare.types.length
                ) {
                  var annoTypes = [];
                  var annoToCompareTypes = [];
                  anno.types.forEach(function (type) {
                    annoTypes.push(type.type);
                  });
                  annoToCompare.types.forEach(function (type) {
                    annoToCompareTypes.push(type.type);
                  });
                  if (
                    arraysEqual(annoTypes.sort(), annoToCompareTypes.sort())
                  ) {
                    SucssesCounter = SucssesCounter + 1;
                  }
                }
              });
            }
            if (SucssesCounter === users.length - 1) {
              displayType = token.displayType;
            } else {
            }
          });
        }
      }
      filterTokenDisplayType.push(displayType);
    });
  }

  console.log(filterTokenDisplayType);
  users.forEach(function (user) {
    chart.d.chunks["user" + user].forEach(function (chunk) {
      for (var i = chunk.tokens.first; i <= chunk.tokens.last; i++) {
        var type = "";
        var color = "";
        if (
          filterTokenDisplayType[i] === false ||
          filterTokenDisplayType[i].length > 1
        ) {
          color = "black";
        } else if (filterTokenDisplayType[i].length === 1) {
          type = filterTokenDisplayType[i][0];
          color = typeRect(type, 1);
        }

        if (color !== "") {
          var chunkClassName = "text_" + user + "_c" + chunk.id;
          new ElemAddress("TextToken", i)
            .getElement()
            .classed("underline", true)
            .style("border-color", color);
          if (i !== chunk.tokens.last) {
            var whitespace = new ElemAddress("TextWhiteSpace", i).getElement();
            if (whitespace) {
              whitespace
                .classed("underline", true)
                .style("border-color", color);
            }
          }
        }
      }
    });
  });
}
