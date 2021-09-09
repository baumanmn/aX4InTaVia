import * as d3 from "d3";
import { indicateToken_Bin, indicateNotActiveToken } from "./indicator";
import { ElemAddress } from "./elemAddress";
import { StateController } from "./stateController";
import { scrollToTarget } from "./textArea";
import { getBinIdByTokenID, getTermIdByTokenId } from "./functions";

var chart;
var currentElement = false;
var tempTokenRange;
var clickFlag = false;

export function initEvents(globalChart) {
  chart = globalChart;
  tempTokenRange = chart.d.tokenRange;
}

export function clickFix() {
  if (tempTokenRange) {
    if (
      tempTokenRange[0] === chart.d.tokenRange[0] &&
      tempTokenRange[1] === chart.d.tokenRange[1]
    ) {
      clickFlag = true;
    } else {
      clickFlag = false;
    }
  }
  chart.d.clickFlag = clickFlag;
  if (chart.d.clickFlag) {
    StateController.storePossiblyClickedElements();
  }
  tempTokenRange = chart.d.tokenRange;
  StateController.deactivatedHoveredElements();
}

export function tornOFEvents() {
  d3.selectAll(".noAnnoSemiAggregated_t_b").remove();
  d3.selectAll(".noAnnoBgToken").remove();
  // d3.selectAll(".bgToken_g, .term, .chunk > g.anno, .atomicFrame, .bgTokenUsr, .userLayerBG, .bgToken, .bgBin, .active_tx_t, #detailBg_r")
  //     .on("mouseover", null)
  //     .on("mouseout", null);
}

export function updateEvents() {
  StateController.refreshClickedElements(chart);
  // region Event binding

  //atomic head token/ background hover
  d3.selectAll(".bgToken_g")
    .on("mouseover", function (d) {
      if (chart.modeDetail === "atomic") {
        StateController.highlightElement(new ElemAddress("HeadToken", d.id));
        StateController.highlightElement(new ElemAddress("TextToken", d.id));
        highlightChartTokens(d.id);
        scrollToTarget(d.id, "center");
        chart.d.users.forEach(function (user) {
          if (d.annotated) {
            highlightChartAnnos(d.id);
          }
        });
      }
    })
    .on("mouseout", function (d) {
      if (chart.modeDetail === "atomic") {
        StateController.highlightElement(
          new ElemAddress("TextToken", d.id),
          false
        );
        highlightChartTokens(d.id, false);
        StateController.highlightElement(
          new ElemAddress("HeadToken", d.id),
          false
        );
        if (d.annotated) {
          highlightChartAnnos(d.id, false);
        }
      }
    })
    .on("click", function (d) {
      if (chart.modeDetail === "atomic") {
        StateController.clickHoveredElements(
          new ElemAddress("HeadToken", d.id)
        );
      }
    });

  //semiAggregated and  Aggregated term hover
  d3.selectAll(".term")
    .on("mouseover", function (d) {
      StateController.highlightElement(new ElemAddress("HeadTerm", d.id));
      StateController.highlightElement(
        new ElemAddress("HeadTermIndicator", d.id)
      );
      if (chart.modeDetail === "semiAggregated") {
        var length = d.localTokens.length;
        d.localTokens.forEach(function (token) {
          scrollToTarget(token.id, "center");
          StateController.highlightElement(
            new ElemAddress("TextToken", token.id)
          );
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", token.id)
          );
          highlightChartTokens(token.id);
          highlightChartAnnos(token.id);
        });
      } else if (chart.modeDetail === "aggregated") {
        var binLength = d.localBins.length;
        var tokenLength = d.localBins[binLength - 1].tokens.length;
        d.localBins.forEach(function (bin, bl) {
          bin.tokens.forEach(function (token, tl) {
            if (bl === binLength - 1 && tl === tokenLength - 1) {
              scrollToTarget(token.id, "center");
            }
            StateController.highlightElement(
              new ElemAddress("TextToken", token.id)
            );
          });
          highlightChartBins(bin.id);
          StateController.highlightElement(
            new ElemAddress("AChartBackground", bin.id)
          );
        });
      }
    })
    .on("mouseout", function (d) {
      StateController.highlightElement(
        new ElemAddress("HeadTerm", d.id),
        false
      );
      StateController.highlightElement(
        new ElemAddress("HeadTermIndicator", d.id),
        false
      );
      if (chart.modeDetail === "semiAggregated") {
        d.localTokens.forEach(function (token) {
          StateController.highlightElement(
            new ElemAddress("TextToken", token.id),
            false
          );
          highlightChartTokens(token.id, false);
          highlightChartAnnos(token.id, false);
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", token.id),
            false
          );
        });
      } else if (chart.modeDetail === "aggregated") {
        d.localBins.forEach(function (bin) {
          bin.tokens.forEach(function (token) {
            StateController.highlightElement(
              new ElemAddress("TextToken", token.id),
              false
            );
          });
          highlightChartBins(bin.id, false);
          StateController.highlightElement(
            new ElemAddress("AChartBackground", bin.id),
            false
          );
        });
      }
    })
    .on("click", function (d) {
      StateController.clickHoveredElements(
        new ElemAddress("HeadTerm", d.id),
        d
      );
    });

  // Compressed Annos
  // d3.selectAll(".tokenAnnoType , .binAnnoType ")
  //     .on("mouseover", function (d) {
  //         var chunkSelection = d3.select(this.parentNode);
  //         console.log(chunkSelection.datum());
  //     });

  // chart anno hover
  d3.selectAll(".chunk > g.anno")
    .on("mouseover", function (d) {
      var chunkSelection = d3.select(this.parentNode);
      StateController.highlightElement(
        new ElemAddress("ChartAnno", d.id, chunkSelection.datum().user)
      );
      StateController.highlightElement(
        new ElemAddress(
          "TextChunk",
          chunkSelection.datum().chunk.id,
          chunkSelection.datum().user
        )
      );
      StateController.highlightElement(
        new ElemAddress("TextAnno", d.id, chunkSelection.datum().user)
      );
      scrollToTarget(d.tokens.last, "center");
      // highlightTextAnno([d.tokens.first, d.tokens.last], d.types);
      if (chart.modeDetail === "atomic") {
        highlightHeadTokens([d.tokens.first, d.tokens.last]);
      } else {
        for (var i = d.tokens.first; i <= d.tokens.last; i++) {
          StateController.highlightElement(
            new ElemAddress(
              "HeadTerm",
              getTermIdByTokenId(chart.d.tokens[i].id)
            )
          );
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", chart.d.tokens[i].id)
          );
        }
      }
    })
    .on("mouseout", function (d) {
      var chunkSelection = d3.select(this.parentNode);
      StateController.highlightElement(
        new ElemAddress("ChartAnno", d.id, chunkSelection.datum().user),
        false
      );
      StateController.highlightElement(
        new ElemAddress("TextAnno", d.id, chunkSelection.datum().user),
        false
      );
      StateController.highlightElement(
        new ElemAddress(
          "TextChunk",
          chunkSelection.datum().chunk.id,
          chunkSelection.datum().user
        ),
        false
      );
      if (chart.modeDetail === "atomic") {
        highlightHeadTokens([d.tokens.first, d.tokens.last], false);
      } else {
        for (var i = d.tokens.first; i <= d.tokens.last; i++) {
          StateController.highlightElement(
            new ElemAddress(
              "HeadTerm",
              getTermIdByTokenId(chart.d.tokens[i].id)
            ),
            false
          );
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", chart.d.tokens[i].id),
            false
          );
        }
      }
    })
    .on("click", function (d) {
      var chunkSelection = d3.select(this.parentNode);
      StateController.clickHoveredElements(
        new ElemAddress("ChartAnno", d.id, chunkSelection.datum().user),
        d
      );
    });

  //Atomic chart token Hover
  d3.selectAll(".atomicFrame")
    .on("mouseover", function (d) {
      StateController.highlightElement(
        new ElemAddress("ChartToken", d.token.id, d.user)
      );
      StateController.highlightElement(
        new ElemAddress("HeadToken", d.token.id)
      );
      StateController.highlightElement(
        new ElemAddress("TextToken", d.token.id)
      );
      scrollToTarget(d.token.id, "center");
      chart.d.tokens[d.token.id].annos["user" + d.user].forEach(function (
        anno
      ) {
        StateController.highlightElement(
          new ElemAddress("ChartAnno", anno.id, d.user)
        );
      });
      if (chart.d.tokens[d.token.id].annos["user" + d.user].length > 0) {
        chart.d.chunks["user" + d.user].forEach(function (chunk) {
          if (
            chunk.tokens.first <= d.token.id &&
            d.token.id <= chunk.tokens.last
          ) {
            StateController.highlightElement(
              new ElemAddress("TextChunk", chunk.id, d.user)
            );
          }
        });
      }
    })
    .on("mouseout", function (d) {
      StateController.highlightElement(
        new ElemAddress("HeadToken", d.token.id),
        false
      );
      StateController.highlightElement(
        new ElemAddress("TextToken", d.token.id),
        false
      );
      StateController.highlightElement(
        new ElemAddress("ChartToken", d.token.id, d.user),
        false
      );
      chart.d.tokens[d.token.id].annos["user" + d.user].forEach(function (
        anno
      ) {
        StateController.highlightElement(
          new ElemAddress("ChartAnno", anno.id, d.user),
          false
        );
      });
      if (chart.d.tokens[d.token.id].annos["user" + d.user].length > 0) {
        chart.d.chunks["user" + d.user].forEach(function (chunk) {
          if (
            chunk.tokens.first <= d.token.id &&
            d.token.id <= chunk.tokens.last
          ) {
            StateController.highlightElement(
              new ElemAddress("TextChunk", chunk.id, d.user),
              false
            );
          }
        });
      }
    })
    .on("click", function (d) {
      StateController.clickHoveredElements(
        new ElemAddress("ChartToken", d.token.id, d.user)
      );
    });

  //SemiAggregated / Atomic chart Token Hover
  d3.selectAll(".bgTokenUsr")
    .on("mouseover", function (d) {
      StateController.highlightElement(
        new ElemAddress("HeadTerm", getTermIdByTokenId(d.token.id))
      );
      StateController.highlightElement(
        new ElemAddress("ChartToken", d.token.id, d.user)
      );
      StateController.highlightElement(
        new ElemAddress("SAChartBackground", d.token.id)
      );
      StateController.highlightElement(
        new ElemAddress("TextToken", d.token.id)
      );
      scrollToTarget(d.token.id, "center");
      chart.d.tokens[d.token.id].annos["user" + d.user].forEach(function (
        anno
      ) {
        StateController.highlightElement(
          new ElemAddress("ChartAnno", anno.id, d.user)
        );
      });
      if (chart.d.tokens[d.token.id].annos["user" + d.user].length > 0) {
        chart.d.chunks["user" + d.user].forEach(function (chunk) {
          if (
            chunk.tokens.first <= d.token.id &&
            d.token.id <= chunk.tokens.last
          ) {
            // activeTextChunk(chunk.id, d.user);
            StateController.highlightElement(
              new ElemAddress("TextChunk", chunk.id, d.user)
            );
          }
        });
      }
    })
    .on("mouseout", function (d) {
      StateController.highlightElement(
        new ElemAddress("HeadTerm", getTermIdByTokenId(d.token.id)),
        false
      );
      StateController.highlightElement(
        new ElemAddress("SAChartBackground", d.token.id),
        false
      );
      StateController.highlightElement(
        new ElemAddress("TextToken", d.token.id),
        false
      );
      StateController.highlightElement(
        new ElemAddress("ChartToken", d.token.id, d.user),
        false
      );

      chart.d.tokens[d.token.id].annos["user" + d.user].forEach(function (
        anno
      ) {
        StateController.highlightElement(
          new ElemAddress("ChartAnno", anno.id, d.user),
          false
        );
      });
      if (chart.d.tokens[d.token.id].annos["user" + d.user].length > 0) {
        chart.d.chunks["user" + d.user].forEach(function (chunk) {
          if (
            chunk.tokens.first <= d.token.id &&
            d.token.id <= chunk.tokens.last
          ) {
            StateController.highlightElement(
              new ElemAddress("TextChunk", chunk.id, d.user),
              false
            );
          }
        });
      }
    })
    .on("click", function (d) {
      StateController.clickHoveredElements(
        new ElemAddress("ChartToken", d.token.id, d.user)
      );
    });

  // SemiAggregated and Aggregated chart not Annotated background hover
  d3.select("#detailBg_r")
    .on("mousemove", function (d) {
      var proc = d3.mouse(this)[0] / chart.p.width;
      if (chart.modeDetail === "semiAggregated") {
        var tokenId =
          chart.d.tokenRange[0] +
          Math.floor(
            (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
          );
        if (currentElement !== false) {
          if (
            tokenId !== currentElement.id ||
            currentElement.type !== "SAChartBackground"
          ) {
            StateController.highlightElement(
              new ElemAddress("SAChartBackground", currentElement.id),
              false
            );
            StateController.highlightElement(
              new ElemAddress("TextToken", currentElement.id),
              false
            );
            highlightChartTokens(currentElement.id, false);
            highlightChartTokens(tokenId);
            StateController.highlightElement(
              new ElemAddress("TextToken", tokenId)
            );
            scrollToTarget(tokenId, "center");
            StateController.highlightElement(
              new ElemAddress("SAChartBackground", tokenId)
            );
            currentElement = new ElemAddress("SAChartBackground", tokenId);
          }
        } else {
          currentElement = new ElemAddress("SAChartBackground", tokenId);
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", tokenId)
          );
          StateController.highlightElement(
            new ElemAddress("TextToken", tokenId)
          );
          scrollToTarget(tokenId, "center");
        }
      } else if (chart.modeDetail === "aggregated") {
        //Aggregated
        var binId =
          chart.d.binRange[0] +
          Math.floor((chart.p.binRange[1] - chart.p.binRange[0] + 1) * proc);
        if (binId === chart.p.binRange[1] + 1) {
          // Bug fix
          binId = chart.p.binRange[1];
        }
        if (currentElement !== false) {
          if (
            binId !== currentElement.id ||
            currentElement.type !== "AChartBackground"
          ) {
            if (chart.d.detailBins) {
              highlightChartBins(currentElement.id, false);
              chart.d.detailBins[currentElement.id].tokens.forEach(function (
                token
              ) {
                StateController.highlightElement(
                  new ElemAddress("TextToken", token.id),
                  false
                );
              });
              StateController.highlightElement(
                new ElemAddress("AChartBackground", currentElement.id),
                false
              );
              highlightChartBins(binId);
              chart.d.detailBins[binId].tokens.forEach(function (token, i) {
                StateController.highlightElement(
                  new ElemAddress("TextToken", token.id)
                );
                if (i === length - 1) {
                  scrollToTarget(token.id, "center");
                }
              });
              StateController.highlightElement(
                new ElemAddress("AChartBackground", binId)
              );
              currentElement = new ElemAddress("AChartBackground", binId);
            }
          }
        } else {
          currentElement = new ElemAddress("AChartBackground", binId);
          chart.d.detailBins[binId].tokens.forEach(function (token, i) {
            StateController.highlightElement(
              new ElemAddress("TextToken", token.id)
            );
            if (i === length - 1) {
              scrollToTarget(token.id, "center");
            }
          });
          StateController.highlightElement(
            new ElemAddress("AChartBackground", binId)
          );
          highlightChartBins(binId);
        }
      }
    })
    .on("mouseout", function (d) {
      if (chart.modeDetail === "semiAggregated" && currentElement.id) {
        StateController.highlightElement(
          new ElemAddress("TextToken", currentElement.id),
          false
        );
        highlightChartTokens(currentElement.id, false);
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", currentElement.id),
          false
        );
      } else if (
        chart.modeDetail === "aggregated" &&
        chart.d.detailBins[currentElement.id]
      ) {
        chart.d.detailBins[currentElement.id].tokens.forEach(function (token) {
          StateController.highlightElement(
            new ElemAddress("TextToken", token.id),
            false
          );
        });
        StateController.highlightElement(
          new ElemAddress("AChartBackground", currentElement.id),
          false
        );
        highlightChartBins(currentElement.id, false);
      }
      currentElement = false;
    })
    .on("click", function (d) {
      var proc = d3.mouse(this)[0] / chart.p.width;
      if (chart.modeDetail === "semiAggregated") {
        var tokenId =
          chart.d.tokenRange[0] +
          Math.floor(
            (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
          );
        StateController.clickHoveredElements(
          new ElemAddress("SAChartBackground", tokenId)
        );
      } else if (chart.modeDetail === "aggregated") {
        //Aggregated
        var binId =
          chart.d.binRange[0] +
          Math.floor((chart.p.binRange[1] - chart.p.binRange[0] + 1) * proc);
        StateController.clickHoveredElements(
          new ElemAddress("AChartBackground", binId)
        );
      }
    })
    .on("mousedown", function (d) {
      //    not annotated token background hover fix for lens
      if (d3.event.which === 3) {
        var proc = d3.mouse(this)[0] / chart.p.width;
        if (chart.modeDetail === "semiAggregated") {
          var tokenId =
            chart.d.tokenRange[0] +
            Math.floor(
              (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
            );
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", tokenId),
            false
          );
          chart.d.users.forEach(function (user) {
            StateController.highlightElement(
              new ElemAddress("ChartToken", tokenId, user),
              false
            );
          });
        }
      }
    });

  // SemiAggregated and Aggregated chart not Annotated token/bin hover
  d3.selectAll(".userLayerBG")
    .on("mousemove", function (d) {
      var proc = d3.mouse(this)[0] / chart.p.width;
      if (chart.modeDetail === "semiAggregated") {
        var tokenId =
          chart.d.tokenRange[0] +
          Math.floor(
            (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
          );

        if (currentElement !== false) {
          if (tokenId !== currentElement.id || d !== currentElement.user) {
            //Deactivate old ones
            if (chart.d.tokens[currentElement.id].annotated) {
              StateController.highlightElement(
                new ElemAddress(
                  "HeadTerm",
                  getTermIdByTokenId(currentElement.id)
                ),
                false
              );
            }
            StateController.highlightElement(
              new ElemAddress("ChartToken", currentElement.id, d),
              false
            );
            StateController.highlightElement(
              new ElemAddress("TextToken", currentElement.id),
              false
            );
            StateController.highlightElement(
              new ElemAddress("SAChartBackground", currentElement.id),
              false
            );
            // Hover new elements
            if (chart.d.tokens[tokenId].annotated) {
              StateController.highlightElement(
                new ElemAddress("HeadTerm", getTermIdByTokenId(tokenId))
              );
            }
            StateController.highlightElement(
              new ElemAddress("TextToken", tokenId)
            );
            StateController.highlightElement(
              new ElemAddress("ChartToken", tokenId, d)
            );
            StateController.highlightElement(
              new ElemAddress("SAChartBackground", tokenId)
            );
            scrollToTarget(tokenId, "center");
            currentElement = new ElemAddress("ChartToken", tokenId, d);
          }
        } else {
          currentElement = new ElemAddress("ChartToken", tokenId, d);
          if (chart.d.tokens[tokenId].annotated) {
            StateController.highlightElement(
              new ElemAddress("HeadTerm", getTermIdByTokenId(tokenId))
            );
          }
          StateController.highlightElement(
            new ElemAddress("TextToken", tokenId)
          );
          scrollToTarget(tokenId, "center");
          StateController.highlightElement(
            new ElemAddress("ChartToken", tokenId, d)
          );
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", tokenId)
          );
        }
      } else if (chart.modeDetail === "aggregated") {
        //Aggregated
        var binId =
          chart.d.binRange[0] +
          Math.floor((chart.p.binRange[1] - chart.p.binRange[0] + 1) * proc);
        if (binId === chart.p.binRange[1] + 1) {
          // Bug fix
          binId = chart.p.binRange[1];
        }
        if (currentElement !== false) {
          if (binId !== currentElement.id || d !== currentElement.user) {
            if (chart.d.detailBins) {
              StateController.highlightElement(
                new ElemAddress("ChartBin", currentElement.id, d),
                false
              );
              if (chart.d.detailBins[currentElement.id]) {
                chart.d.detailBins[currentElement.id].tokens.forEach(function (
                  token
                ) {
                  // TODO there is some big connected with this line
                  StateController.highlightElement(
                    new ElemAddress("TextToken", token.id),
                    false
                  );
                  if (chart.d.tokens[token.id].annotated) {
                    StateController.highlightElement(
                      new ElemAddress("HeadTerm", getTermIdByTokenId(token.id)),
                      false
                    );
                  }
                });
              }

              StateController.highlightElement(
                new ElemAddress("AChartBackground", currentElement.id),
                false
              );
              StateController.highlightElement(
                new ElemAddress("ChartBin", binId, d)
              );
              var length = chart.d.detailBins[binId].tokens.length;
              chart.d.detailBins[binId].tokens.forEach(function (token, i) {
                StateController.highlightElement(
                  new ElemAddress("TextToken", token.id)
                );
                if (chart.d.tokens[token.id].annotated) {
                  StateController.highlightElement(
                    new ElemAddress("HeadTerm", getTermIdByTokenId(token.id))
                  );
                }
                if (i === length - 1) {
                  scrollToTarget(token.id, "center");
                }
              });
              StateController.highlightElement(
                new ElemAddress("AChartBackground", binId)
              );
              currentElement = new ElemAddress("ChartBin", binId, d);
            }
          }
        } else {
          currentElement = new ElemAddress("ChartBin", binId, d);
          chart.d.detailBins[binId].tokens.forEach(function (token, i) {
            StateController.highlightElement(
              new ElemAddress("TextToken", token.id)
            );
            if (chart.d.tokens[token.id].annotated) {
              StateController.highlightElement(
                new ElemAddress("HeadTerm", getTermIdByTokenId(token.id))
              );
            }
            if (i === length - 1) {
              scrollToTarget(token.id, "center");
            }
          });
          StateController.highlightElement(
            new ElemAddress("ChartBin", binId, d)
          );
          StateController.highlightElement(
            new ElemAddress("AChartBackground", binId)
          );
        }
      }
    })
    .on("mouseout", function (d) {
      if (chart.modeDetail === "semiAggregated") {
        if (currentElement && chart.d.tokens[currentElement.id].annotated) {
          StateController.highlightElement(
            new ElemAddress("HeadTerm", getTermIdByTokenId(currentElement.id)),
            false
          );
        }
        StateController.highlightElement(
          new ElemAddress("TextToken", currentElement.id),
          false
        );
        StateController.highlightElement(
          new ElemAddress("ChartToken", currentElement.id, d),
          false
        );
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", currentElement.id),
          false
        );
      } else if (currentElement && chart.modeDetail === "aggregated") {
        chart.d.detailBins[currentElement.id].tokens.forEach(function (token) {
          StateController.highlightElement(
            new ElemAddress("TextToken", token.id),
            false
          );
          if (chart.d.tokens[token.id].annotated) {
            StateController.highlightElement(
              new ElemAddress("HeadTerm", getTermIdByTokenId(token.id)),
              false
            );
          }
        });
        StateController.highlightElement(
          new ElemAddress("ChartBin", currentElement.id, d),
          false
        );
        StateController.highlightElement(
          new ElemAddress("AChartBackground", currentElement.id),
          false
        );
      }
      currentElement = false;
    })
    .on("click", function (d) {
      var proc = d3.mouse(this)[0] / chart.p.width;
      if (chart.modeDetail === "semiAggregated") {
        var tokenId =
          chart.d.tokenRange[0] +
          Math.floor(
            (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
          );
        StateController.clickHoveredElements(
          new ElemAddress("ChartToken", tokenId, d)
        );
      } else if (chart.modeDetail === "aggregated") {
        //Aggregated
        var binId =
          chart.d.binRange[0] +
          Math.floor((chart.p.binRange[1] - chart.p.binRange[0] + 1) * proc);
        StateController.clickHoveredElements(
          new ElemAddress("ChartBin", binId, d)
        );
      }
    })
    .on("mousedown", function (d) {
      //    not annotated token hover fix for lens
      if (d3.event.which === 3) {
        var proc = d3.mouse(this)[0] / chart.p.width;
        if (chart.modeDetail === "semiAggregated") {
          var tokenId =
            chart.d.tokenRange[0] +
            Math.floor(
              (chart.d.tokenRange[1] - chart.d.tokenRange[0] + 1) * proc
            );
          StateController.highlightElement(
            new ElemAddress("ChartToken", tokenId, d),
            false
          );
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", tokenId),
            false
          );
        }
      }
    });

  //SemiAggregated chart background Hover
  d3.selectAll(".bgToken")
    .on("mouseover", function (d) {
      if (chart.modeDetail === "semiAggregated") {
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", d.id)
        );
        StateController.highlightElement(
          new ElemAddress("HeadTerm", getTermIdByTokenId(d.id))
        );

        StateController.highlightElement(new ElemAddress("TextToken", d.id));
        scrollToTarget(d.id, "center");
        highlightChartTokens(d.id);
        highlightChartAnnos(d.id);
      }
    })
    .on("mouseout", function (d) {
      if (chart.modeDetail === "semiAggregated") {
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", d.id),
          false
        );
        StateController.highlightElement(
          new ElemAddress("HeadTerm", getTermIdByTokenId(d.id)),
          false
        );

        StateController.highlightElement(
          new ElemAddress("TextToken", d.id),
          false
        );
        highlightChartTokens(d.id, false);
        highlightChartAnnos(d.id, false);
      }
    })
    .on("click", function (d) {
      if (chart.modeDetail === "semiAggregated") {
        StateController.clickHoveredElements(
          new ElemAddress("SAChartBackground", d.id)
        );
      }
    })
    .on("mousedown", function (d) {
      //    annotated token background hover fix for lens
      if (d3.event.which === 3) {
        if (chart.modeDetail === "semiAggregated") {
          var tokenId = d.id;
          StateController.highlightElement(
            new ElemAddress("SAChartBackground", tokenId),
            false
          );
          chart.d.users.forEach(function (user) {
            StateController.highlightElement(
              new ElemAddress("ChartToken", tokenId, user),
              false
            );
          });
        }
      }
    });
  //aggregated chart background Hover
  d3.selectAll(".bgBin")
    .on("mouseover", function (d) {
      var length = d.tokens.length;
      d.tokens.forEach(function (token, i) {
        StateController.highlightElement(
          new ElemAddress("TextToken", token.id)
        );
        if (i === length - 1) {
          scrollToTarget(token.id, "center");
        }

        StateController.highlightElement(
          new ElemAddress("HeadTerm", getTermIdByTokenId(token.id))
        );
      });
      highlightChartBins(d.id);
      StateController.highlightElement(
        new ElemAddress("AChartBackground", d.id)
      );
    })
    .on("mouseout", function (d) {
      d.tokens.forEach(function (token) {
        StateController.highlightElement(
          new ElemAddress("TextToken", token.id),
          false
        );
        StateController.highlightElement(
          new ElemAddress("HeadTerm", getTermIdByTokenId(token.id)),
          false
        );
      });
      highlightChartBins(d.id, false);
      StateController.highlightElement(
        new ElemAddress("AChartBackground", d.id),
        false
      );
    })
    .on("click", function (d) {
      StateController.clickHoveredElements(
        new ElemAddress("AChartBackground", d.id)
      );
    });

  //aggregated chart bin Hover
  d3.selectAll(".bgBinUsr")
    .on("mouseover", function (d) {
      var length = d.bin.tokens.length;
      d.bin.tokens.forEach(function (token, i) {
        StateController.highlightElement(
          new ElemAddress("TextToken", token.id)
        );
        if (i === length - 1) {
          scrollToTarget(token.id, "center");
        }
        StateController.highlightElement(
          new ElemAddress("HeadTerm", getTermIdByTokenId(token.id))
        );
      });
      StateController.highlightElement(
        new ElemAddress("ChartBin", d.bin.id, d.user)
      );
      StateController.highlightElement(
        new ElemAddress("AChartBackground", d.bin.id)
      );
    })
    .on("mouseout", function (d) {
      d.bin.tokens.forEach(function (token) {
        StateController.highlightElement(
          new ElemAddress("TextToken", token.id),
          false
        );
        StateController.highlightElement(
          new ElemAddress("HeadTerm", getTermIdByTokenId(token.id)),
          false
        );
      });
      StateController.highlightElement(
        new ElemAddress("ChartBin", d.bin.id, d.user),
        false
      );
      StateController.highlightElement(
        new ElemAddress("AChartBackground", d.bin.id),
        false
      );
    })
    .on("click", function (d) {
      StateController.clickHoveredElements(
        new ElemAddress("ChartBin", d.bin.id, d.user)
      );
    });

  //not active text token hover
  d3.selectAll(".inactive_tx_t")
    .on("mouseover", function () {
      var tokenId = this.id.substring(5, this.lensWidth);
      indicateNotActiveToken(tokenId, true);
      if (chart.modeDetail === "atomic") {
        StateController.highlightElement(new ElemAddress("HeadToken", tokenId));
        highlightChartTokens(tokenId);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId);
        }
      }
      if (chart.modeDetail === "semiAggregated") {
        indicateToken_Bin(tokenId);
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", tokenId)
        );
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          )
        );
        highlightChartTokens(tokenId);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId);
        }
      }
      if (chart.modeDetail === "aggregated") {
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          )
        );
        highlightChartBins(getBinIdByTokenID(tokenId));
        StateController.highlightElement(
          new ElemAddress("AChartBackground", getBinIdByTokenID(tokenId))
        );
        indicateToken_Bin(getBinIdByTokenID(tokenId));
      }
      StateController.highlightElement(new ElemAddress("TextToken", tokenId));
    })
    .on("mouseout", function () {
      var tokenId = this.id.substring(5, this.lensWidth);
      indicateNotActiveToken(tokenId, false);
      if (chart.modeDetail === "atomic") {
        StateController.highlightElement(
          new ElemAddress("HeadToken", tokenId),
          false
        );
        highlightChartTokens(tokenId, false);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId, false);
        }
      }
      if (chart.modeDetail === "semiAggregated") {
        indicateToken_Bin(tokenId, false);
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", tokenId),
          false
        );
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          ),
          false
        );
        highlightChartTokens(tokenId, false);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId, false);
        }
      }
      if (chart.modeDetail === "aggregated") {
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          ),
          false
        );
        highlightChartBins(getBinIdByTokenID(tokenId), false);
        StateController.highlightElement(
          new ElemAddress("AChartBackground", getBinIdByTokenID(tokenId)),
          false
        );
        indicateToken_Bin(getBinIdByTokenID(tokenId), false);
      }
      StateController.highlightElement(
        new ElemAddress("TextToken", tokenId),
        false
      );
    })
    .on("click", function () {
      var tokenId = this.id.substring(5, this.lensWidth);
      StateController.storePossiblyClickedElements();
      StateController.deactivatedHoveredElements();
      StateController.clickHoveredElements(
        new ElemAddress("TextToken", tokenId)
      );
    });

  //text token hover
  d3.selectAll(".active_tx_t ")
    .on("mouseover", function () {
      var tokenId = this.id.substring(5, this.lensWidth);
      if (chart.modeDetail === "atomic") {
        StateController.highlightElement(new ElemAddress("HeadToken", tokenId));
        highlightChartTokens(tokenId);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId);
        }
      }
      if (chart.modeDetail === "semiAggregated") {
        indicateToken_Bin(tokenId);
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", tokenId)
        );
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          )
        );
        highlightChartTokens(tokenId);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId);
        }
      }
      if (chart.modeDetail === "aggregated") {
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          )
        );
        highlightChartBins(getBinIdByTokenID(tokenId));
        StateController.highlightElement(
          new ElemAddress("AChartBackground", getBinIdByTokenID(tokenId))
        );
        indicateToken_Bin(getBinIdByTokenID(tokenId));
      }
      StateController.highlightElement(new ElemAddress("TextToken", tokenId));
    })
    .on("mouseout", function () {
      var tokenId = this.id.substring(5, this.lensWidth);
      if (chart.modeDetail === "atomic") {
        StateController.highlightElement(
          new ElemAddress("HeadToken", tokenId),
          false
        );
        highlightChartTokens(tokenId, false);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId, false);
        }
      }
      if (chart.modeDetail === "semiAggregated") {
        indicateToken_Bin(tokenId, false);
        StateController.highlightElement(
          new ElemAddress("SAChartBackground", tokenId),
          false
        );
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          ),
          false
        );
        highlightChartTokens(tokenId, false);
        if (chart.d.tokens[tokenId].annotated) {
          highlightChartAnnos(tokenId, false);
        }
      }
      if (chart.modeDetail === "aggregated") {
        StateController.highlightElement(
          new ElemAddress(
            "HeadTerm",
            getTermIdByTokenId(chart.d.tokens[tokenId].id)
          ),
          false
        );
        highlightChartBins(getBinIdByTokenID(tokenId), false);
        StateController.highlightElement(
          new ElemAddress("AChartBackground", getBinIdByTokenID(tokenId)),
          false
        );
        indicateToken_Bin(getBinIdByTokenID(tokenId), false);
      }
      StateController.highlightElement(
        new ElemAddress("TextToken", tokenId),
        false
      );
    })
    .on("click", function () {
      var tokenId = this.id.substring(5, this.lensWidth);
      StateController.storePossiblyClickedElements();
      StateController.deactivatedHoveredElements();
      StateController.clickHoveredElements(
        new ElemAddress("TextToken", tokenId)
      );
    });

  // endregion
}

//region head
function highlightHeadTokens(tokenRange, mod = true) {
  for (var i = tokenRange[0]; i <= tokenRange[1]; i++) {
    StateController.highlightElement(new ElemAddress("HeadToken", i), mod);
  }
}

//endregion

//region chart
function highlightChartTokens(id, mod = true) {
  chart.d.users.forEach(function (user) {
    StateController.highlightElement(
      new ElemAddress("ChartToken", id, user),
      mod
    );
  });
}

function highlightChartBins(binId, mod = true) {
  chart.d.users.forEach(function (user) {
    StateController.highlightElement(
      new ElemAddress("ChartBin", binId, user),
      mod
    );
  });
}

function highlightChartAnnos(id, mod = true) {
  Object.entries(chart.d.tokens[id].annos).forEach(function (user) {
    let userNm = user[0].substring(4, user[0].lensWidth);
    user[1].forEach(function (anno) {
      StateController.highlightElement(
        new ElemAddress("ChartAnno", anno.id, userNm),
        mod
      );
    });
  });
}
