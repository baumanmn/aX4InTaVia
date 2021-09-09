import * as d3 from "d3";
//import * as d3 from "../node_modules/d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
import * as colorMaps from "./colorMaps.js";
import { computeBins } from "./preprocessData.js";
import { typeArray } from "./constants.js";
import { updateTextArea, highlightText } from "./textArea";
import * as math from "mathjs";
//HM
import { filter } from "./filters";

const key = function (d) {
  return d.id;
};

//auxilliary functions

function pythagoras(k1, k2) {
  return Math.sqrt(Math.pow(k1, 2) + Math.pow(k2, 2));
}

function textWrap(textHeight, that) {
  var self = d3.select(that);
  var textNode = self.node();
  var textLength = textNode.getComputedTextLength();
  var text = self.text();
  while (textLength > textHeight && text.length > 0) {
    text = text.slice(0, -1);
    self.text(text + "\u2026");
    textLength = self.node().getComputedTextLength();
  }
}

function assignClasses(selection, classes) {
  classes.forEach(function (cl) {
    selection.classed(cl.name, cl.value);
  });
}

function assignClassByFunction(selection, f) {
  selection.each(function (d) {
    this.classList.add("id" + f(d));
  });

  ////a series of other possible hacks
  ////using attr
  //selection.attr("class", function (d) {
  //    return d3.select(this).attr("class") + " " + cl(d);
  //});
  ////using attr, dealing with empty classLists
  //selection.attr("class", function (d) {
  //    var existing = d3.select(this).attr("class");
  //    if (existing === null) {
  //        return cl(d);
  //    } else {
  //        return existing + " " + cl(d);
  //    }
  //});
  ////using classed & each
  //selection.each(function (d) {
  //    d3.select(this).classed(cl(d), true);
  //});
  ////using classed & each (the above doesn't work?)
  //selection.each(function (d) {
  //    d3.select(this).classed(cl(d), function () {
  //        return cl(d3.select(this).datum()) === cl(d);
  //    });
  //});
}

function computeXPos(tokens, chart, lens = false) {
  function computeFactors(tokens, chart, lens = false) {
    //compute the magnification factors for (non-)annotated tokens
    var factors = {},
      magnificationFactor,
      widthAnno,
      widthNoAnno;

    //number of (non-)annotated tokens
    var numAnno = tokens.reduce(function (acc, curr) {
        return curr.annotated ? acc + 1 : acc;
      }, 0),
      numNoAnno = tokens.length - numAnno;

    if (numAnno === 0 || numNoAnno === 0) {
      magnificationFactor = 1;

      if (lens) {
        widthAnno = chart.p.lensWidth / Math.max(numAnno, numNoAnno);
      } else {
        widthAnno = chart.p.width / Math.max(numAnno, numNoAnno);
      }

      widthNoAnno = widthAnno;
    } else {
      if (lens) {
        //maximal magnification factor M, the chosen magnification should be in [1,M]
        var maxMagnificationFactor =
          (chart.p.lensWidth - numNoAnno * chart.p.lowerTokenThreshold) /
          (numAnno * chart.p.lowerTokenThreshold);

        //choose actual magnification factor as a percentage
        magnificationFactor =
          1 + (maxMagnificationFactor - 1) * chart.p.magFactor;

        //width of tokens; if magFactor = 1, then widthNoAnno = LowerTokenThreshold
        (widthAnno =
          (magnificationFactor * chart.p.lensWidth) /
          (numNoAnno + numAnno * magnificationFactor)),
          (widthNoAnno =
            chart.p.lensWidth / (numNoAnno + numAnno * magnificationFactor));
      } else {
        //maximal magnification factor M, the chosen magnification should be in [1,M]
        var maxMagnificationFactor =
          (chart.p.width - numNoAnno * chart.p.lowerTokenThreshold) /
          (numAnno * chart.p.lowerTokenThreshold);
        //choose actual magnification factor as a percentage
        magnificationFactor =
          1 + (maxMagnificationFactor - 1) * chart.p.magFactor;
        //width of tokens; if magFactor = 1, then widthNoAnno = LowerTokenThreshold
        (widthAnno =
          (magnificationFactor * chart.p.width) /
          (numNoAnno + numAnno * magnificationFactor)),
          (widthNoAnno =
            chart.p.width / (numNoAnno + numAnno * magnificationFactor));
      }
    }

    factors.magnificationFactor = magnificationFactor;
    factors.widthAnno = widthAnno;
    // factors.widthAnno = 5;
    factors.widthNoAnno = widthNoAnno;
    // factors.widthNoAnno = 3;

    return factors;
  }

  var factors = computeFactors(tokens, chart, lens);

  var xPos = [];
  var d = 0;

  tokens.forEach(function (t) {
    //compute token-positions as arrays of begin and increment
    var pos = {};
    pos.begin = d;
    if (t.annotated) {
      pos.inc = factors.widthAnno;
      d += factors.widthAnno;
    } else {
      pos.inc = factors.widthNoAnno;
      d += factors.widthNoAnno;
    }
    xPos.push(pos);
  });

  return [xPos, factors];
}

function computeLocalTerms(chart, tokenRange, binning) {
  var b = chart.p.xScaleTerms.bandwidth();

  var terms = Object.entries(chart.d.terms).filter(function (t) {
    //term has tokens within tokenRange
    return t[1].tokens
      .map(function (token) {
        return token.id;
      })
      .some(function (id) {
        return id >= tokenRange[0] && id <= tokenRange[1];
      });
  });

  terms = terms.map(function (t) {
    //create new local term-objects
    var localTerm = {
      stem: t[0],
      id: t[1].id,
      text: t[1].text,
      localTokens: t[1].tokens.filter(function (token) {
        return token.id >= tokenRange[0] && token.id <= tokenRange[1];
      }),
      globalAnnosPerTerm: t[1].globalAnnosPerTerm,
      maxGlobalAnnosPerTerm: t[1].maxGlobalAnnosPerTerm,
    };
    localTerm.localAnnosPerTerm = localTerm.localTokens.reduce(function (
      acc,
      curr
    ) {
      return acc + curr.annosPerToken;
    },
    0);
    //the term's bins (if applicable)
    if (binning) {
      var bins = chart.d.detailBins;
      var localTokens = localTerm.localTokens;
      var localBins = [];
      var binNo = 0; //counter for the detail-bins
      var tokenNo = 0; //counter for the localTokens of the term
      var bin = bins[0]; //the bin that the loop is actually working on

      //stop the loop when all bins or all localTokens have been looked at
      while (binNo < bins.length && tokenNo < localTokens.length) {
        var binTokenIds = bin.tokens.map(function (t) {
          //ids of the actual bin's tokens
          return t.id;
        });

        //check whether tokens had been already in a previously checked bin

        while (
          tokenNo < localTokens.length &&
          localTokens[tokenNo].id < binTokenIds[0]
        ) {
          tokenNo += 1;
        }

        //leave if all tokens are in the previous bin
        if (tokenNo >= localTokens.length) break;

        for (var i = 0; i < binTokenIds.length; i += 1) {
          if (binTokenIds[i] === localTokens[tokenNo].id) {
            //found a matching bin
            localBins.push(bin);
            tokenNo += 1;
            break;
          }
        }

        binNo += 1;
        bin = bins[binNo];
      }

      localTerm.localBins = localBins;

      var positions = localBins.map(function (bin) {
        return (
          chart.p.xScaleTokens_Bins(bin.id) +
          chart.p.xScaleTokens_Bins.bandwidth() / 2
        );
      });
    } else {
      var positions = localTerm.localTokens.map(function (token) {
        return (
          chart.p.xScaleTokens_Bins(token.id) +
          chart.p.xScaleTokens_Bins.bandwidth() / 2
        );
      });
    }

    //the ideal middle-pos of the term's tokens/bins
    localTerm.position = math.median(positions);
    return localTerm;
  });

  terms = terms.sort(function (a, b) {
    //sort according to first local anno-rank, second global anno-rank
    if (b.localAnnosPerTerm - a.localAnnosPerTerm !== 0)
      return b.localAnnosPerTerm - a.localAnnosPerTerm;
    else return b.globalAnnosPerTerm - a.globalAnnosPerTerm;
  });

  terms = terms.slice(0, chart.p.numOfTerms); //only the first numOfTerms terms can be displayed

  var xPos = terms.reduce(function (acc, curr) {
    var m = curr.position;
    var w = chart.p.width;
    var b = chart.p.xScaleTerms.bandwidth();
    var n = chart.p.xScaleTerms.domain().length;
    var r = 0;

    //compute the "real" term-positions (slot & left border)
    if (m % b === 0) r = Math.floor(Math.random() * 2) - 1; //random -1 or 0
    var s = Math.floor(m / b) + r; //ideal slot-id
    var x = s * b; //ideal xPos

    //left/right-tendency to place the term
    //>0 right tendency, <0 left tendeny, =0 random
    var tend = m - (x + b / 2);
    tend = tend !== 0 ? tend : Math.round(Math.random()) * 2 - 1;

    var sLeft = s; //real slot
    var sRight = sLeft;

    while (true) {
      if (sLeft < 0) {
        //reached the left wall
        while (acc.includes(sRight)) sRight += 1;
        acc.push(sRight >= n ? false : sRight);
        return acc;
      }
      if (sRight >= n) {
        //reached the right wall
        while (acc.includes(sLeft)) sLeft -= 1;
        acc.push(sLeft < 0 ? false : sLeft);
        return acc;
      }
      if (tend < 0) {
        if (acc.includes(sLeft)) {
          //left slot taken
          sLeft -= 1;
          if (acc.includes(sRight)) sRight += 1;
          //right slot taken
          else {
            acc.push(sRight); //right slot free
            return acc;
          }
        } else {
          acc.push(sLeft); //left slot free
          return acc;
        }
      } else {
        if (acc.includes(sRight)) {
          //right slot taken
          sRight += 1;
          if (acc.includes(sLeft)) sLeft -= 1;
          //left slot taken
          else {
            acc.push(sLeft); //left slot free
            return acc;
          }
        } else {
          acc.push(sRight); //right slot free
          return acc;
        }
      }
    }
  }, []);

  terms.forEach(function (term, i) {
    term.xPos = xPos[i] * chart.p.xScaleTerms.bandwidth();
  });
  return terms;
}

function drawTokenBorder(width, height, index, last) {
  if (index === 0) return `0, ${width}, ${height}, ${width + height}`;
  if (index === last) return `0, ${2 * width + height}, ${height}`;
  return `0, ${width}, ${height}, ${width}, ${height}`;
}

function drawTermBorder(chart, width, height, xPos, gap) {
  if (gap) {
    var tick = chart.p.termFrameTicks;

    if (xPos === 0)
      return `${0}, ${width - tick}, ${tick + height + width}, ${height}`;
    if (xPos >= chart.p.width - width)
      return `${tick}, ${width - tick + height}, ${width + height + tick}`;
    //if (xPos >= chart.p.width - width) return `${width}, ${height}, ${width + height}`;
    return `${tick}, ${width - 2 * tick}, ${tick + width + 2 * height + 10}`;
  } else {
    if (xPos === 0) return `${2 * width + height}, ${height}`;
    if (xPos >= chart.p.width - width)
      return `${width}, ${height}, ${width + height}`;
    return `${2 * width + 2 * height + 2}`;
  }
}

function drawPolygonBorder(
  upperWidth,
  rightLength,
  lowerWidth,
  leftLength,
  index,
  last
) {
  if (index === 0)
    return `0, ${upperWidth}, ${rightLength}, ${lowerWidth + leftLength}`;
  if (index === last)
    return `0, ${upperWidth + rightLength + lowerWidth}, ${leftLength}`;
  return `0, ${upperWidth}, ${rightLength}, ${lowerWidth}, ${leftLength}`;
}

function drawTypeBorder(width, height) {
  return `0, ${width + height}, ${width}, ${height}`;
}

function drawAnnoBorder(width, height) {
  return `${width}, ${height}, ${width}, ${height}`;
}

//return a copy of all those annos per user & chunk that are cut by range
function extractAnnos(chart, chunkData, range) {
  var left = Math.max(chunkData.chunk.tokens.first, range[0]),
    right = Math.min(chunkData.chunk.tokens.last, range[1]);
  return chart.d.annos["user" + chunkData.user]
    .slice(chunkData.chunk.annos.first, chunkData.chunk.annos.last + 1)
    .filter(function (anno) {
      return !(anno.tokens.last < left || anno.tokens.first > right);
    });
}

//return a copy of the chunk-object including only those chunks that lay within the tokenRange
export function extractChunks(chart, tokenRange) {
  var chunks = {};
  Object.entries(chart.d.chunks).forEach(function (entry) {
    chunks[entry[0]] = entry[1].filter(function (chunk) {
      return !(
        chunk.tokens.last < tokenRange[0] || chunk.tokens.first > tokenRange[1]
      );
    });
  });
  return chunks;
}

function countTokensInBins(chart, binRange) {
  return chart.d.bins
    .slice(binRange[0], binRange[1] + 1) //index = ID in chart.d.bins
    .reduce(function (acc, curr) {
      return acc + curr.tokens.length;
    }, 0);
}

function convertBinRange(chart, binRange) {
  return [
    chart.d.bins[binRange[0]].tokens[0].id,
    chart.d.bins[binRange[1]].tokens[
      chart.d.bins[binRange[1]].tokens.length - 1
    ].id,
  ];
}

//drawing functions

function createUpdateCycle(p, type) {
  var updateElements = p.group
    .selectAll(type + "." + p.typeClass[0].name)
    .data(p.data, p.key);

  var enterElements = updateElements.enter().append(type);

  assignClasses(enterElements, p.tokenModeClass);
  assignClasses(enterElements, p.typeClass);

  var updateAndEnterElements = enterElements.merge(updateElements);

  updateElements.exit().remove();

  return {
    e: enterElements,
    uae: updateAndEnterElements,
  };
}

function drawRects(p) {
  var cycle = createUpdateCycle(p, "rect");
  setRectEAttributes(p, cycle.e);
  setRectUaeAttributes(p, cycle.uae);
}

//HM
function setRectEAttributes(p, selection) {
  //selection.attr("shapeRendering", p.shapeRendering);

  if (p.stateClass) assignClasses(selection, p.stateClass);
  if (p.type) assignClasses(selection, p.type);
  if (p.idClass) assignClassByFunction(selection, p.idClass);

  if (p.listeners)
    p.listeners.forEach(function (l) {
      selection.on(l.event, l.listener);
    });
}

function setRectUaeAttributes(p, selection) {
  selection
    .attr("x", p.x)
    .attr("width", p.width)
    .attr("height", p.height)
    .attr("y", p.y);

  if (p.border) selection.attr("stroke-dasharray", p.border);
  if (p.stroke) selection.style("stroke", p.stroke);
  if (p.fill) selection.style("fill", p.fill);
}

function setPolygonEAttributes(p, selection) {
  if (p.stateClass) assignClasses(selection, p.stateClass);
}

function setPolygonUaeAttributes(p, selection) {
  selection.attr("points", p.points);
  if (p.border) selection.attr("stroke-dasharray", p.border);
}

function setTextEAttributes(p, selection) {
  if (p.stateClass) assignClasses(selection, p.stateClass);
  if (p.filterUrl) selection.attr("filter", p.filterUrl);

  selection.append("tspan").text(p.text);
}

function setTextUaeAttributes(p, selection) {
  selection
    .attr("x", p.x)
    .attr("y", p.y)
    .attr("transform", p.transform)
    .attr("font-size", p.fontSize);

  selection
    .selectAll("tspan")
    .text(p.text)
    .each(function () {
      textWrap(p.textHeight, this);
    });
}

function setGroupEAttributes(p, selection) {
  p.forEach(function (grandChild) {
    var grandChildrenE = selection.append(grandChild.type);
    assignClasses(grandChildrenE, grandChild.typeClass);
    //assignClassByFunction(selection, p.idClass);
    //if (grandChild.setEAttributes) grandChild.setEAttributes(grandChild.attributes, grandChildrenE);
    //if (grandChild.factoryE) grandChildrenE.each(grandChild.factoryE);
    //if (grandChild.factoryE) grandChild.factoryE(grandChildrenE);
  });
}

function setGroupUaeAttributes(p, selection) {
  p.forEach(function (grandChild) {
    var grandChildrenUae = selection.select(
      grandChild.type + "." + grandChild.typeClass[0].name
    );
    if (grandChild.setUaeAttributes)
      grandChild.setUaeAttributes(grandChild.attributes, grandChildrenUae);
    if (grandChild.factory) grandChild.factory(grandChildrenUae);
  });
}

function drawLine(p) {
  var cycle = createUpdateCycle(p, "line");
  setLineAttributes(p, cycle);
}

function setLineAttributes(p, cycle) {
  cycle.e.append("title").text(p.text);

  if (p.compressionClass) assignClasses(cycle.e, p.compressionClass);

  cycle.uae.attr("x1", p.x1).attr("y1", p.y1).attr("x2", p.x2).attr("y2", p.y2);
}

//function setLineEAttributes(p, selection) {
//
//}

function setLineUaeAttributes(p, selection) {
  selection.attr("x1", p.x1).attr("y1", p.y1).attr("x2", p.x2).attr("y2", p.y2);

  if (p.strokeWidth) selection.style("stroke-width", p.strokeWidth);
}

function drawGroupedCycles(p) {
  //in each group, there is another update cycle
  var cycle = createUpdateCycle(p, "g");

  if (p.compressionClass) assignClasses(cycle.e, p.compressionClass);
  if (p.idClass) assignClassByFunction(cycle.e, p.idClass);

  cycle.uae.each(function (parentData) {
    var parentSelection = d3.select(this);
    p.drawChildren(p.computeChildrenParameters(parentData, parentSelection));
  });
}

function drawGroupedElements(p) {
  var cycle = createUpdateCycle(p, "g");

  if (p.stateClass) assignClasses(cycle.e, p.stateClass);
  if (p.idClass) assignClassByFunction(cycle.e, p.idClass);

  if (p.fill) cycle.e.attr("fill", p.fill);

  if (p.filter) {
    var filter = cycle.e
      .append("defs")
      .append("filter")
      .attr("id", p.filter.id)
      .attr("primitiveUnits", "userSpaceOnUse");
    var fCT = filter
      .append("feComponentTransfer")
      .attr("in", "SourceAlpha")
      .attr("result", "linear");
    fCT.append("feFuncR").attr("type", "linear");
    fCT.append("feFuncG").attr("type", "linear");
    fCT.append("feFuncB").attr("type", "linear");
    var fM = filter.append("feMerge");
    fM.append("feMergeNode").attr("in", "SourceAlpha");
    fM.append("feMergeNode").attr("in", "linear");

    cycle.uae
      .select("feComponentTransfer")
      .attr("x", p.filter.x)
      .attr("y", p.filter.y)
      .attr("width", p.filter.width)
      .attr("height", p.filter.height);

    cycle.uae.select("feFuncR").attr("intercept", p.filter.r);
    cycle.uae.select("feFuncG").attr("intercept", p.filter.g);
    cycle.uae.select("feFuncB").attr("intercept", p.filter.b);
  }

  p.children.forEach(function (child) {
    var childrenE = cycle.e.append(child.type);

    assignClasses(childrenE, child.typeClass);
    assignClasses(childrenE, p.tokenModeClass);
    if (child.idClass) assignClassByFunction(childrenE, child.idClass);

    //sel.select, NOT selectAll;
    //otherwise, children in updated groups don't get to see their new data-element
    var childrenUae = cycle.uae.select(
      child.type + "." + child.typeClass[0].name
    );
    child.setEAttributes(child.attributes, childrenE);
    child.setUaeAttributes(child.attributes, childrenUae);
  });
  return {
    e: cycle.e,
    uae: cycle.uae,
  };
}

function drawCompressionModes(p) {
  if (p.parentLevels > p.supercompCompLevels) {
    //supercompressed mode
    if (p.pushCompTokens) p.pushCompTokens(); //write tokenIds into compTokens

    p.scFunction(p.scParameters);
  } else {
    var cycle = drawGroupedElements(p);

    if (!p.compUncompLevels || p.parentLevels > p.compUncompLevels) {
      //compressed mode
      p.addCompressionClass(cycle.e, "compressed");

      if (p.pushCompTokens) p.pushCompTokens(); //write tokenIds into compTokens
    } else {
      //uncompressed mode
      p.addCompressionClass(cycle.e, "uncompressed");

      //draw the type-rects
      var tP = p.typeParameters;

      var typeGroups = cycle.e.append("g"); //the groups with the type-rects

      assignClasses(typeGroups, tP.typeClassGroup);

      var typeRects = typeGroups
        .selectAll("rect." + tP.typeClassRect[0].name)
        .data(tP.data)
        .enter()
        .append("rect");

      assignClasses(typeRects, tP.typeClassRect);
      assignClasses(typeRects, tP.type);
      // assignClasses(typeRects, tP.typeNotActive);
      assignClasses(typeRects, p.tokenModeClass);

      typeRects
        .style("fill", tP.fill)
        .style("stroke-width", tP.strokeWidth)
        .style("stroke", tP.stroke);

      cycle.uae.each(function () {
        var annoRect = d3.select(this).select("rect.anno");
        d3.select(this)
          .selectAll("rect.type")
          .attr("x", annoRect.attr("x"))
          .attr("width", annoRect.attr("width"))
          .attr("y", tP.y(annoRect))
          .attr("height", tP.height);
      });
    }
  }
}

//detailBars
export function drawAtomicDetailBars(chart, tokenRange, lens = false) {
  var detailBTokens_Bins = chart.detailBTokens_Bins;
  var userTokens_Bins = chart.userTokens_Bins;
  var userAnnos = chart.userAnnos;
  var chunksG = chart.chunks;
  var userAtomicFrames = chart.userAtomicFrames;

  if (lens) {
    // chart.p.xScaleTokens_Bins.range([0, chart.p.lensWidth]);

    detailBTokens_Bins = chart.lensDetailBTokens_Bins;
    userTokens_Bins = chart.lensUserTokens_Bins;
    userAnnos = chart.lensUserAnnos;
    chunksG = chart.lensChunks;
    userAtomicFrames = chart.lensUserAtomicFrames;
  }
  //the tokens to be drawn
  var tokens = chart.d.tokens.slice(tokenRange[0], tokenRange[1] + 1);
  var firstTokenId = tokenRange[0];

  var chunks = extractChunks(chart, tokenRange);

  var [xPos, factors] = computeXPos(tokens, chart, lens);

  chart.d.detailXValues = xPos;
  chart.d.detailIds = tokens.map(function (t) {
    return t.id;
  });
  var annoHPadding = Math.min(
    chart.p.annoMaxHPadding,
    chart.p.annoHPaddingFactor * factors.widthAnno
  );

  var compTokens = {};
  chart.d.users.forEach(function (user) {
    compTokens["user" + user] = [];
  });
  var counter = 0;

  var parameterObject = {
    key: key,
    tokenModeClass: [{ name: "atomic", value: true }],
    //shapeRendering: "auto"
  };
  var attributeObject = {
    //shapeRendering: "auto"
  };

  // if (!lens) {
  //the scale-domain for the text-bandScale
  chart.p.xScaleTokenText.domain(
    tokens.map(function (t) {
      return t.id;
    })
  );

  //data join accumulated background rects & text-backgrounds & connecting polygons & token-texts
  drawGroupedElements(
    (function () {
      var p = Object.create(parameterObject);

      p.group = detailBTokens_Bins;
      p.data = tokens;

      p.typeClass = [{ name: "bgToken_g", value: true }];
      p.idClass = function (d) {
        return "t" + d.id;
      };
      p.stateClass = [
        {
          name: "anno",
          value: function (d) {
            return d.annotated;
          },
        },
        {
          name: "noAnno",
          value: function (d) {
            return !d.annotated;
          },
        },
      ];

      //p.shapeRendering = "crispEdges";
      p.fill = function (d) {
        return !d.annotated
          ? "white"
          : colorMaps.BGTokenAtomic(
              d.maxAnnosPerToken === 0
                ? 0
                : d.annosPerToken / d.maxAnnosPerToken
            );
      };

      p.children = [];
      p.children.push({
        //accumulated background rects
        type: "rect",
        typeClass: [{ name: "bgToken", value: true }],
        idClass: p.idClass,
        setEAttributes: setRectEAttributes,
        setUaeAttributes: setRectUaeAttributes,
        attributes: (function () {
          var a = Object.create(attributeObject);

          a.stateClass = p.stateClass;

          a.x = function (d) {
            return xPos[d.id - firstTokenId].begin;
          };
          a.width = function (d) {
            return xPos[d.id - firstTokenId].inc;
          };
          a.y = chart.p.tokenTextHeight + chart.p.tokenPolygonHeight;
          a.height = chart.p.tokenBarHeight;

          //a.shapeRendering = "crispEdges";
          a.border = function (d) {
            //set the upper & lower border of the rects to 0
            return drawTokenBorder(
              xPos[d.id - firstTokenId].inc,
              chart.p.tokenBarHeight,
              d.id - firstTokenId,
              tokens.length - 1 - firstTokenId
            );
          };
          return a;
        })(),
      });
      if (!lens) {
        p.children.push({
          //connecting polygons
          type: "polygon",
          typeClass: [{ name: "tokenPolygon", value: true }],
          idClass: p.idClass,
          setEAttributes: setPolygonEAttributes,
          setUaeAttributes: setPolygonUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.stateClass = p.stateClass;

            a.points = function (d) {
              return (
                String(chart.p.xScaleTokenText(d.id)) +
                "," +
                String(chart.p.tokenTextHeight) +
                " " +
                String(
                  chart.p.xScaleTokenText(d.id) +
                    chart.p.xScaleTokenText.bandwidth()
                ) +
                "," +
                String(chart.p.tokenTextHeight) +
                " " +
                String(
                  xPos[d.id - firstTokenId].begin +
                    xPos[d.id - firstTokenId].inc
                ) +
                "," +
                String(chart.p.tokenTextHeight + chart.p.tokenPolygonHeight) +
                " " +
                String(xPos[d.id - firstTokenId].begin) +
                "," +
                String(chart.p.tokenTextHeight + chart.p.tokenPolygonHeight)
              );
            };

            a.border = function (d) {
              //set the upper & lower border of the rects to 0
              var t1 =
                chart.p.xScaleTokenText(d.id) +
                chart.p.xScaleTokenText.bandwidth() -
                (xPos[d.id - firstTokenId].begin +
                  xPos[d.id - firstTokenId].inc);
              var t2 = chart.p.tokenPolygonHeight;
              var t3 =
                chart.p.xScaleTokenText(d.id) - xPos[d.id - firstTokenId].begin;
              var t4 = chart.p.tokenPolygonHeight;

              var upperWidth = chart.p.xScaleTokenText.bandwidth();
              var rightLength = pythagoras(t1, t2);
              var lowerWidth = xPos[d.id - firstTokenId].inc;
              var leftLength = pythagoras(t3, t4);

              return drawPolygonBorder(
                upperWidth,
                rightLength,
                lowerWidth,
                leftLength,
                d.id - firstTokenId,
                tokens.length - 1 - firstTokenId
              );
            };
            return a;
          })(),
        });
        p.children.push({
          //text-backgrounds
          type: "rect",
          typeClass: [{ name: "tokenTextBg", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.stateClass = p.stateClass;

            a.x = function (d) {
              return chart.p.xScaleTokenText(d.id);
            };
            a.width = chart.p.xScaleTokenText.bandwidth();
            a.y = 0;
            a.height = chart.p.tokenTextHeight;

            //a.shapeRendering = "crispEdges";
            a.border = function (d) {
              //set the upper & lower border of the rects to 0
              return drawTokenBorder(
                chart.p.xScaleTokenText.bandwidth(),
                chart.p.tokenTextHeight,
                d.id - firstTokenId,
                tokens.length - 1 - firstTokenId
              );
            };
            return a;
          })(),
        });
        p.children.push({
          //tokenTexts
          type: "text",
          typeClass: [{ name: "tokenText", value: true }],
          idClass: p.idClass,
          setEAttributes: setTextEAttributes,
          setUaeAttributes: setTextUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.stateClass = p.stateClass;

            a.text = function (d) {
              return d.text;
            };
            a.x = function (d) {
              return (
                chart.p.xScaleTokenText(d.id) +
                chart.p.xScaleTokenText.bandwidth() / 2
              );
            };
            a.y = chart.p.tokenTextHeight;
            a.fontSize = function (d) {
              return (
                Math.min(
                  chart.p.xScaleTokenText.bandwidth() - 2,
                  chart.p.termFontSize
                ) + "px"
              );
            };
            a.transform = function (d) {
              var alpha = -90;
              return (
                "rotate(" +
                String(alpha) +
                "," +
                String(
                  chart.p.xScaleTokenText(d.id) +
                    chart.p.xScaleTokenText.bandwidth() / 2
                ) +
                "," +
                String(chart.p.tokenTextHeight) +
                ")" +
                " translate(" +
                String(chart.p.textDisplacement) +
                ")"
              );
            };
            a.textHeight = chart.p.globalTermHeight - chart.p.textDisplacement;

            return a;
          })(),
        });
      }

      return p;
    })()
  );
  // }

  //parentSelection.append("polygon")
  //    .attr("points")
  //    .attr("class");
  //
  //parentSelection.append("text")
  //    .text()
  //    .attr("class")
  //    .attr("x")
  //    .attr("y")
  //    .attr("text-anchor", "start")
  //    .attr("font-size", function (d) {
  //        return Math.min(xScaleTokenText.bandwidth() - 2, 12) + "px";
  //    })
  //    .attr("alignment-baseline", "middle")
  //    // .attr("textLength", function (d) {
  //    //     return Math.sqrt(Math.pow(tokenBarHeight - tokenPolygonHeight, 2) + Math.pow(xScaleTokenText.bandwidth(), 2));
  //    // })
  //    // .attr("lengthAdjust", "spacingAndGlyphs")
  //    .attr("transform", function (d) {
  //        var alpha = -90;
  //        return "rotate("
  //            + String(alpha) + ","
  //            + String(xScaleTokenText(d.id) + xScaleTokenText.bandwidth() / 2) + ","
  //            + String(tokenBarHeight - tokenPolygonHeight) + ")"
  //            + " translate("
  //            + String(2) + ")";
  //    })
  //    .attr("fill", function (d, i) {
  //        // if (i%2===0) return "green"; else return "red";
  //        if (d.annotatingUsers.length === 0) return "black";
  //        else return "white";
  //        // return colorMapText((maxAnnosPerToken === 0) ? 0 : d.annotatingUsers.length / maxAnnosPerToken);
  //    });

  //data join background rects per user
  drawRects(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userTokens_Bins;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the tokens
        return tokens.map(function (t) {
          return { token: t, user: d };
        });
      };
      p.key = function (d) {
        //the key-function
        return key(d.token);
      };

      p.typeClass = [{ name: "bgTokenUsr", value: true }];
      p.stateClass = [
        {
          name: "anno",
          value: function (d) {
            return d.token.annotated;
          },
        },
        {
          name: "noAnno",
          value: function (d) {
            return !d.token.annotated;
          },
        },
      ];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "t" + d.token.id;
      };

      p.x = function (d) {
        return xPos[d.token.id - firstTokenId].begin;
      };
      p.width = function (d) {
        return xPos[d.token.id - firstTokenId].inc;
      };
      p.y = 0;
      p.height = chart.p.userHeight;

      //p.shapeRendering = "crispEdges";
      p.fill = function (d) {
        if (d.token.users["user" + d.user] === 0) return "white";
        else
          return colorMaps.userToken_Bin(
            d.token.maxAnnosPerTokenPerUser === 0
              ? 0
              : d.token.users[`user${d.user}`] / d.token.maxAnnosPerTokenPerUser
          );
      };

      return p;
    })()
  );

  //data join atomic frames (frames above type-bars, below chunks)
  drawRects(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userAtomicFrames;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the tokens
        return tokens.map(function (t) {
          return { token: t, user: d };
        });
      };
      p.key = function (d) {
        //the key-function
        return key(d.token);
      };

      p.typeClass = [{ name: "atomicFrame", value: true }];
      p.stateClass = [
        {
          name: "anno",
          value: function (d) {
            return d.token.annotated;
          },
        },
        {
          name: "noAnno",
          value: function (d) {
            return !d.token.annotated;
          },
        },
      ];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "t" + d.token.id;
      };

      p.x = function (d) {
        return xPos[d.token.id - firstTokenId].begin;
      };
      p.width = function (d) {
        return xPos[d.token.id - firstTokenId].inc;
      };
      p.y = 0;
      p.height = chart.p.userHeight;

      p.border = function (d) {
        //set the upper & lower border of the rects to 0
        return drawTokenBorder(
          xPos[d.token.id - firstTokenId].inc,
          chart.p.userHeight,
          d.token.id - firstTokenId,
          tokens.length - 1
        );
      };

      return p;
    })()
  );

  //data join chunks (overlapping annos)
  drawGroupedCycles(
    (function () {
      var p = Object.create(parameterObject);

      p.group = chunksG;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the chunks
        return chunks["user" + d].map(function (c) {
          return { chunk: c, user: d };
        });
      };
      p.key = function (d) {
        //the key-function
        return key(d.chunk);
      };

      p.supercompCompLevels = chart.p.maxLevelsSupercompComp;
      p.compUncompLevels = chart.p.maxLevelsCompUncomp;

      p.typeClass = [{ name: "chunk", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "c" + d.chunk.id;
      };

      p.compressionClass = [
        {
          name: "supercompressed",
          value: function (d) {
            return d.chunk.levels > p.supercompCompLevels;
          },
        },
        {
          name: "compressed",
          value: function (d) {
            return (
              d.chunk.levels <= p.supercompCompLevels &&
              d.chunk.levels > p.compUncompLevels
            );
          },
        },
        {
          name: "uncompressed",
          value: function (d) {
            return d.chunk.levels <= p.compUncompLevels;
          },
        },
      ];

      p.drawChildren = drawCompressionModes;
      p.computeChildrenParameters = function (parentData, parentSelection) {
        var p = Object.create(parameterObject);

        p.group = parentSelection;
        p.data = extractAnnos(chart, parentData, tokenRange);

        p.typeClass = [{ name: "anno", value: true }];
        p.idClass = function (d) {
          return "u" + parentData.user + "_" + "a" + d.id;
        };

        p.parentLevels = parentData.chunk.levels;
        p.supercompCompLevels = chart.p.maxLevelsSupercompComp;
        p.compUncompLevels = chart.p.maxLevelsCompUncomp;

        p.addCompressionClass = function (selection, compression) {
          selection.classed(compression, true);
        };

        p.pushCompTokens = function () {
          //write tokenIds into compTokens
          var firstCT = Math.max(parentData.chunk.tokens.first, tokenRange[0]),
            lastCT = Math.min(parentData.chunk.tokens.last, tokenRange[1]);
          tokens
            .slice(firstCT - firstTokenId, lastCT - firstTokenId + 1)
            .forEach(function (t) {
              compTokens["user" + parentData.user].push(t.id);
            });
        };

        p.scFunction = drawLine;
        p.scParameters = (function (parentData, parentSelection) {
          var p = Object.create(parameterObject);

          p.group = parentSelection;
          p.data = [parentData];

          p.typeClass = [{ name: "chunk", value: true }];
          p.compressionClass = [{ name: "supercompressed", value: true }];

          p.text = function (d) {
            return `annotations No ${d.chunk.annos.first} to ${d.chunk.annos.last}`;
          };

          var chunkLength =
            (parentData.chunk.tokens.last - parentData.chunk.tokens.first + 1) *
            factors.widthAnno;
          var height = chart.p.userHeight - 2 * annoHPadding;
          var length = chunkLength - 2 * annoHPadding;
          var tan = height / length;

          if (parentData.chunk.tokens.first < tokenRange[0]) {
            //overlap on the left border
            p.x1 = 0;
            var dist =
              (tokenRange[0] - parentData.chunk.tokens.first) *
                factors.widthAnno -
              annoHPadding;
            var y = tan * dist;
            p.y1 = y + annoHPadding;
          } else {
            var tokenBegin =
              xPos[parentData.chunk.tokens.first - firstTokenId].begin;
            p.x1 = tokenBegin + annoHPadding;
            p.y1 = annoHPadding;
          }
          if (parentData.chunk.tokens.last > tokenRange[1]) {
            //overlap on the right border
            p.x2 = chart.p.width;
            var dist =
              (tokenRange[1] - parentData.chunk.tokens.first + 1) *
                factors.widthAnno -
              annoHPadding;
            var y = tan * dist;
            p.y2 = y + annoHPadding;
          } else {
            var tokenEnd =
              xPos[parentData.chunk.tokens.last - firstTokenId].begin +
              xPos[parentData.chunk.tokens.last - firstTokenId].inc;
            p.x2 = tokenEnd - annoHPadding;
            p.y2 = chart.p.userHeight - annoHPadding;
          }

          return p;
        })(parentData, parentSelection);

        p.shortAnnoVPadding =
          (chart.p.userHeight -
            parentData.chunk.levels * chart.p.shortAnnoHeight) /
          (parentData.chunk.levels + 1);
        p.annoVPadding =
          (chart.p.userHeight - parentData.chunk.levels * chart.p.annoHeight) /
          (parentData.chunk.levels + 1);

        p.children = [];
        p.children.push({
          type: "rect",
          typeClass: [{ name: "anno", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.x = function (d) {
              //overlap on the left side
              if (d.tokens.first < tokenRange[0]) {
                return -chart.p.overlapMargin; //no outer border for cut rectangles
              } else {
                var tokenBegin = xPos[d.tokens.first - firstTokenId].begin;
                return tokenBegin + annoHPadding;
              }
            };
            a.width = function (d) {
              //overlap on both sides
              if (
                d.tokens.first < tokenRange[0] &&
                d.tokens.last > tokenRange[1]
              )
                return chart.p.width + 2 * chart.p.overlapMargin;
              //overlap on the right side
              if (d.tokens.last > tokenRange[1])
                return (
                  factors.widthAnno * (tokenRange[1] - d.tokens.first + 1) -
                  annoHPadding +
                  chart.p.overlapMargin
                );
              //overlap on the left side
              if (d.tokens.first < tokenRange[0])
                return (
                  factors.widthAnno * (d.tokens.last - tokenRange[0] + 1) -
                  annoHPadding
                );
              //no overlap
              return (
                factors.widthAnno * (d.tokens.last - d.tokens.first + 1) -
                2 * annoHPadding
              );
            };

            if (!p.compUncompLevels || p.parentLevels > p.compUncompLevels) {
              //compressed
              a.y = function (d) {
                return (
                  (d.level - 1) * chart.p.shortAnnoHeight +
                  d.level * p.shortAnnoVPadding
                );
              };
              a.height = chart.p.shortAnnoHeight;

              a.stateClass = [{ name: "compressed", value: true }];
            } else {
              //uncompressed
              a.y = function (d) {
                return (
                  (d.level - 1) * chart.p.annoHeight + d.level * p.annoVPadding
                );
              };
              a.height = chart.p.annoHeight;

              a.stateClass = [{ name: "uncompressed", value: true }];
            }

            //a.shapeRendering =;
            //a.border =;

            return a;
          })(),
        });

        // console.log("id " + p.data[0].id);
        p.typeParameters = {
          typeClassGroup: [{ name: "types", value: true }],
          typeClassRect: [{ name: "type", value: true }],
          //HM
          // typeNotActive: [{name: "notActiveType", value: !filter.sortedFilters[parentData.user][p.data[0].id]}],
          // typeNotActive: p.data.map(function (data) {
          //     return {
          //         name: "notActiveType",
          //         value: !filter.sortedFilters[parentData.user][data.id],
          //     }
          // }),
          // typeNotActive: function (d){
          //     console.log(d);
          //     return [{name: "notActiveType", value: true}]
          // },
          type: typeArray.map(function (type) {
            return {
              name: type,
              value: function (d) {
                return d.type === type;
              },
            };
          }),
          data: function (d) {
            return d.types;
          },
          fill: function (d) {
            //hm
            return colorMaps.typeRect(d.type, true);
          },
          strokeWidth: chart.p.typeStrokeWidth,
          stroke: function (d) {
            return colorMaps.typeRect(d.type, false);
          },
          y: function (annoRect) {
            return function (d) {
              return (
                +annoRect.attr("y") +
                ((chart.p.annoHeight + chart.p.typeStrokeWidth) / (d.sib + 1)) *
                  (d.sib - d.fsib)
              );
            };
          },
          height: function (d) {
            return (
              chart.p.annoHeight / (d.sib + 1) -
              chart.p.typeStrokeWidth * (1 - 1 / (d.sib + 1))
            );
          },
        };

        return p;
      };

      return p;
    })()
  );

  //data join anno/typeRects per user for (super-)compressed chunks
  drawGroupedCycles(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userAnnos;
      p.data = function (d) {
        var res = tokens
          .filter(function (t) {
            if (
              counter < compTokens["user" + d].length &&
              t.id === compTokens["user" + d][counter]
            ) {
              counter += 1;
              return true;
            } else return false;
          })
          .map(function (t) {
            return { token: t, user: d };
          });
        counter = 0;
        return res;
      };
      p.key = function (d) {
        //the key-function
        return key(d.token);
      };

      p.typeClass = [{ name: "tokenAnnos", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "t" + d.token.id;
      };

      p.drawChildren = drawRects;
      p.computeChildrenParameters = function (parentData, parentSelection) {
        var p = Object.create(parameterObject);

        p.group = parentSelection;
        p.data = function (d) {
          return d.token.types["user" + d.user]
            .slice() //create a copy of the type-array
            .reverse() //and reverse it                .
            .map(function (type) {
              return { type, token: d.token, user: d.user };
            });
        };

        p.typeClass = [{ name: "tokenAnnoType", value: true }];
        p.type = typeArray.map(function (type) {
          return {
            name: type,
            value: function (d) {
              return d.type === type;
            },
          };
        });

        p.x = function (parentData) {
          return xPos[parentData.token.id - firstTokenId].begin;
        };
        p.width = function (parentData) {
          return xPos[parentData.token.id - firstTokenId].inc;
        };
        p.y = function (d, j) {
          //reverse the order again
          return (
            +d3.select(this).attr("height") *
            (d.token.types["user" + d.user].length - 1 - j)
          );
        };
        p.height = function (d) {
          var totalLength =
            (chart.p.spaceForAnnos * d.token.users["user" + d.user]) /
            d.token.maxAnnosPerTokenPerUser;
          return totalLength / d.token.types["user" + d.user].length;
        };

        //p.shapeRendering = "geometricPrecision";

        p.border = function (d) {
          return drawTypeBorder(
            +d3.select(this).attr("width"),
            +d3.select(this).attr("height")
          );
        };
        p.stroke = function (d) {
          return colorMaps.typeRect(d.type, false);
        };
        p.fill = function (d) {
          return colorMaps.typeRect(d.type, true);
        };

        return p;
      };

      return p;
    })()
  );
}

export function drawSemiAggregatedDetailBars(chart, tokenRange, lens = false) {
  var detailBTokens_Bins = chart.detailBTokens_Bins;
  var userTokens_Bins = chart.userTokens_Bins;
  var userAnnos = chart.userAnnos;
  var chunksG = chart.chunks;

  //re-adjust the range (may change from lens-calls)
  chart.p.xScaleTokens_Bins.range([0, chart.p.width]);

  //lens-related adjustments
  if (lens) {
    chart.p.xScaleTokens_Bins.range([0, chart.p.lensWidth]);

    detailBTokens_Bins = chart.lensDetailBTokens_Bins;
    userTokens_Bins = chart.lensUserTokens_Bins;
    userAnnos = chart.lensUserAnnos;
    chunksG = chart.lensChunks;
  }

  //the tokens to be drawn
  var tokens = chart.d.tokens.slice(tokenRange[0], tokenRange[1] + 1);
  var firstTokenId = tokenRange[0];

  //adjust the scale-domain
  chart.p.xScaleTokens_Bins.domain(
    tokens.map(function (token) {
      return token.id;
    })
  );

  if (!lens) {
    chart.p.xScaleTerms.domain(d3.range(chart.p.numOfTerms));
    //the tokens & positions for the top-window
    var localTerms = computeLocalTerms(chart, tokenRange, false);
  }

  var chunks = extractChunks(chart, tokenRange);

  //the detailXValues as starting-points of the bands
  chart.d.detailXValues = chart.p.xScaleTokens_Bins
    .domain()
    .map(chart.p.xScaleTokens_Bins);
  chart.d.detailIds = tokens.map(function (t) {
    return t.id;
  });

  var parameterObject = {
    key: key,
    tokenModeClass: [{ name: "semiAggregated", value: true }],
    //shapeRendering: "auto"
  };
  var attributeObject = {
    //shapeRendering: "auto"
  };

  //data join accumulated background rects
  drawRects(
    (function () {
      var p = Object.create(parameterObject);

      p.group = detailBTokens_Bins;
      p.data = function () {
        return tokens.filter(function (t) {
          return t.annotated;
        });
      };

      p.typeClass = [{ name: "bgToken", value: true }];
      p.idClass = function (d) {
        return "t" + d.id;
      };

      p.x = function (d) {
        return chart.p.xScaleTokens_Bins(d.id);
      };
      p.width = chart.p.xScaleTokens_Bins.bandwidth();
      p.y = chart.p.tokenTextHeight + chart.p.tokenPolygonHeight;
      p.height = chart.p.tokenBarHeight;

      //p.shapeRendering = "crispEdges";
      p.fill = function (d) {
        return colorMaps.BGTokenAtomic(
          d.maxAnnosPerToken === 0 ? 0 : d.annosPerToken / d.maxAnnosPerToken
        );
      };

      return p;
    })()
  );

  if (!lens) {
    //data join term-texts with backgrounds & text-indicators
    drawGroupedElements(
      (function () {
        var p = Object.create(parameterObject);

        p.group = chart.terms;
        p.data = localTerms;
        p.key = function (d) {
          //the key-function
          return d.id;
        };

        p.typeClass = [{ name: "term", value: true }];
        p.idClass = function (d) {
          return d.id;
        };

        //p.stateClass = [
        //    {
        //        name: "anno", value: function (d) {
        //            return d.annotated;
        //        }
        //    },
        //    {
        //        name: "noAnno", value: function (d) {
        //            return !d.annotated;
        //        }
        //    }
        //];

        p.children = [];
        p.children.push({
          //activating rects
          type: "rect",
          typeClass: [{ name: "activeTermRect", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = 0;
            a.height = chart.p.tokenTextHeight;

            return a;
          })(),
        });
        p.children.push({
          //background rects, size & color according to localAnnosPerTerm
          type: "rect",
          typeClass: [{ name: "localTermFrame", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.stateClass = p.stateClass;

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = function (d) {
              return (
                chart.p.tokenTextHeight -
                (chart.p.globalTermHeight * Math.log(d.localAnnosPerTerm + 1)) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };
            a.height = function (d) {
              return (
                (chart.p.globalTermHeight * Math.log(d.localAnnosPerTerm + 1)) /
                Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };

            a.fill = function (d) {
              return colorMaps.localTerms(
                Math.log(d.localAnnosPerTerm + 1) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };

            return a;
          })(),
        });
        p.children.push({
          //termTexts
          type: "text",
          typeClass: [{ name: "termText", value: true }],
          idClass: p.idClass,
          setEAttributes: setTextEAttributes,
          setUaeAttributes: setTextUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.stateClass = p.stateClass;

            a.text = function (d) {
              return d.text;
            };
            a.x = function (d) {
              return d.xPos + chart.p.xScaleTerms.bandwidth() / 2;
              //return chart.p.xScaleTokenText(d.id) + chart.p.xScaleTokenText.bandwidth() / 2;
            };
            a.y = chart.p.tokenTextHeight;
            a.fontSize = chart.p.termFontSize + "px";
            a.transform = function (d) {
              var alpha = -90;
              return (
                "rotate(" +
                String(alpha) +
                "," +
                String(d.xPos + chart.p.xScaleTerms.bandwidth() / 2) +
                "," +
                String(chart.p.tokenTextHeight) +
                ")" +
                " translate(" +
                String(chart.p.textDisplacement) +
                ")"
              );
            };
            a.textHeight = chart.p.globalTermHeight - chart.p.textDisplacement;

            a.filterUrl = function (d) {
              return "url(#" + d.id + ")";
            };
            return a;
          })(),
        });
        p.children.push({
          //frame rects, size according to globalAnnosPerTerm
          type: "rect",
          typeClass: [{ name: "globalTermFrame", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.stateClass = p.stateClass;

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = function (d) {
              return (
                chart.p.tokenTextHeight -
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };
            a.height = function (d) {
              return (
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };

            a.border = function (d) {
              //set left/right border of the wall-rects to 0

              var textLength = d3
                .select(this.parentNode)
                .select(".termText")
                .node()
                .getComputedTextLength();
              var frameLength =
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                Math.log(d.maxGlobalAnnosPerTerm + 1);

              var gap =
                textLength + chart.p.textDisplacement + 3 > frameLength
                  ? true
                  : false;
              return drawTermBorder(
                chart,
                chart.p.xScaleTerms.bandwidth(),
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1),
                d.xPos,
                gap
              );
            };
            a.stroke = function (d) {
              var value = Number(
                colorMaps
                  .localTerms(
                    Math.log(d.localAnnosPerTerm + 1) /
                      Math.log(d.maxGlobalAnnosPerTerm + 1)
                  )
                  .match(/\((\d+),/)[1]
              );
              return value < 30 ? "darkgrey" : "black";
            };

            return a;
          })(),
        });
        p.children.push({
          //the text-indicator group
          type: "g",
          typeClass: [{ name: "textIndicator_g", value: true }],
          idClass: p.idClass,
          setEAttributes: setGroupEAttributes,
          setUaeAttributes: setGroupUaeAttributes,
          attributes: (function () {
            var grandChildren = [];

            //the connector bar
            grandChildren.push({
              type: "line",
              typeClass: [{ name: "indConnector", value: true }],
              setUaeAttributes: setLineUaeAttributes,
              attributes: (function () {
                var a = Object.create(attributeObject);

                a.x1 = function (d) {
                  return d.xPos + chart.p.xScaleTerms.bandwidth() / 2;
                };
                a.y1 = chart.p.tokenTextHeight;
                a.x2 = function (d) {
                  return d.xPos + chart.p.xScaleTerms.bandwidth() / 2;
                };
                a.y2 = chart.p.tokenTextHeight + chart.p.indConnector;

                return a;
              })(),
            });

            //horizontal text indicator
            grandChildren.push({
              type: "line",
              typeClass: [{ name: "horizontalTextInd", value: true }],
              setUaeAttributes: setLineUaeAttributes,
              attributes: (function () {
                var a = Object.create(attributeObject);

                a.x1 = function (d) {
                  return Math.min(
                    d.xPos + chart.p.xScaleTerms.bandwidth() / 2,
                    chart.p.xScaleTokens_Bins(d.localTokens[0].id)
                  );
                };
                a.y1 = chart.p.tokenTextHeight + chart.p.indConnector;
                a.x2 = function (d) {
                  return Math.max(
                    d.xPos + chart.p.xScaleTerms.bandwidth() / 2,
                    chart.p.xScaleTokens_Bins(
                      d.localTokens[d.localTokens.length - 1].id
                    ) + chart.p.xScaleTokens_Bins.bandwidth()
                  );
                };
                a.y2 = chart.p.tokenTextHeight + chart.p.indConnector;

                return a;
              })(),
            });

            //the vertical tick marks
            grandChildren.push({
              type: "g",
              typeClass: [{ name: "termTicks_g", value: true }],

              factory: function (selection) {
                var sel = selection.selectAll("line").data(function (d) {
                  return d.localTokens;
                }, key);

                sel.exit().remove();

                sel = sel
                  .enter()
                  .append("line")
                  .attr("class", "tick")
                  .merge(sel);

                p = {
                  x1: function (d) {
                    return (
                      chart.p.xScaleTokens_Bins(d.id) +
                      chart.p.xScaleTokens_Bins.bandwidth() / 2
                    );
                  },
                  y1: chart.p.tokenTextHeight + chart.p.indConnector,
                  x2: function (d) {
                    return (
                      chart.p.xScaleTokens_Bins(d.id) +
                      chart.p.xScaleTokens_Bins.bandwidth() / 2
                    );
                  },
                  y2:
                    chart.p.tokenTextHeight +
                    chart.p.indConnector +
                    chart.p.termTickLength,
                  strokeWidth: chart.p.xScaleTokens_Bins.bandwidth(),
                };

                setLineUaeAttributes(p, sel);
              },
            });

            return grandChildren;
          })(),
        });
        p.children.push({
          //listener rects
          type: "rect",
          typeClass: [{ name: "listenerRect", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = 0;
            a.height = chart.p.tokenTextHeight;

            a.listeners = [];
            a.listeners.push({
              event: "mouseover",
              listener: function () {
                // d3.select(this.parentNode).select(".textIndicator_g").classed("activeTerm", true); //HM
                // d3.select(this.parentNode).select(".activeTermRect").classed("activeTerm", true);
              },
            });
            a.listeners.push({
              event: "mouseout",
              listener: function () {
                // d3.select(this.parentNode).select(".textIndicator_g").classed("activeTerm", false); //HM
                // d3.select(this.parentNode).select(".activeTermRect").classed("activeTerm", false);
              },
            });
            //a.listeners.push({
            //    event: "click",
            //    listener: function (d) {
            //        d3.select(this.parentNode).select(".textIndicator_g").classed("activeTerm", true);
            //        d3.select(this.parentNode).select(".activeTermRect").classed("activeTerm", true);
            //
            //        d3.selectAll(".listenerRect").on("mouseover", null).on("mouseout", null);
            //
            //        if ()
            //
            //        console.log(d);
            //    }
            //});

            return a;
          })(),
        });

        p.filter = {
          id: function (d) {
            return d.id;
          },
          x: function (d) {
            return (
              d.xPos +
              chart.p.xScaleTerms.bandwidth() / 2 -
              chart.p.textDisplacement
            );
          },
          y: chart.p.tokenTextHeight - chart.p.xScaleTerms.bandwidth() / 2,
          width: function (d) {
            return (
              (chart.p.globalTermHeight * Math.log(d.localAnnosPerTerm + 1)) /
              Math.log(d.maxGlobalAnnosPerTerm + 1)
            );
          },
          height: chart.p.xScaleTerms.bandwidth(),
          r: function (d) {
            var value = Number(
              colorMaps
                .localTerms(
                  Math.log(d.localAnnosPerTerm + 1) /
                    Math.log(d.maxGlobalAnnosPerTerm + 1)
                )
                .match(/\((\d+),/)[1]
            );
            return value < 160 ? 1 : 0;
          },
          g: function (d) {
            var value = Number(
              colorMaps
                .localTerms(
                  Math.log(d.localAnnosPerTerm + 1) /
                    Math.log(d.maxGlobalAnnosPerTerm + 1)
                )
                .match(/\((\d+),/)[1]
            );
            return value < 160 ? 1 : 0;
          },
          b: function (d) {
            var value = Number(
              colorMaps
                .localTerms(
                  Math.log(d.localAnnosPerTerm + 1) /
                    Math.log(d.maxGlobalAnnosPerTerm + 1)
                )
                .match(/\((\d+),/)[1]
            );
            return value < 160 ? 1 : 0;
          },
        };

        return p;
      })()
    );

    //initially, the term with the highest local count is active
    //d3.select("#terms_g .textIndicator_g.id" + String(localTerms[0].id)).classed("activeTerm", true);
    //d3.select("#terms_g .activeTermRect.id" + String(localTerms[0].id)).classed("activeTerm", true);
  }

  //data join background rects per user
  drawRects(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userTokens_Bins;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the tokens
        return tokens
          .filter(function (t) {
            return t.users["user" + d] > 0;
          })
          .map(function (t) {
            return { token: t, user: d };
          });
      };
      p.key = function (d) {
        //the key-function
        return key(d.token);
      };

      p.typeClass = [{ name: "bgTokenUsr", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "t" + d.token.id;
      };

      p.x = function (d) {
        return chart.p.xScaleTokens_Bins(d.token.id);
      };
      p.width = chart.p.xScaleTokens_Bins.bandwidth();
      p.y = 0;
      p.height = chart.p.userHeight;

      //p.shapeRendering = "crispEdges";
      p.fill = function (d) {
        return colorMaps.userToken_Bin(
          d.token.maxAnnosPerTokenPerUser === 0
            ? 0
            : d.token.users[`user${d.user}`] / d.token.maxAnnosPerTokenPerUser
        );
      };

      return p;
    })()
  );

  //data join anno/type rects per user
  drawGroupedCycles(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userAnnos;
      p.data = function (d) {
        return tokens
          .filter(function (t) {
            return t.users["user" + d] > 0;
          })
          .map(function (t) {
            return { token: t, user: d };
          });
      };
      p.key = function (d) {
        //the key-function
        return key(d.token);
      };

      p.typeClass = [{ name: "tokenAnnos", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "t" + d.token.id;
      };

      p.drawChildren = drawRects;
      p.computeChildrenParameters = function (parentData, parentSelection) {
        var p = Object.create(parameterObject);

        p.group = parentSelection;
        p.data = function (d) {
          return d.token.types["user" + d.user]
            .slice() //create a copy of the type-array
            .reverse() //and reverse it                .
            .map(function (type) {
              return { type, token: d.token, user: d.user };
            });
        };

        p.typeClass = [{ name: "tokenAnnoType", value: true }];
        p.type = typeArray.map(function (type) {
          return {
            name: type,
            value: function (d) {
              return d.type === type;
            },
          };
        });

        p.x = function (parentData) {
          return chart.p.xScaleTokens_Bins(parentData.token.id);
        };
        p.width = function (parentData) {
          return chart.p.xScaleTokens_Bins.bandwidth();
        };
        p.y = function (d, j) {
          //reverse the order again
          return (
            +d3.select(this).attr("height") *
            (d.token.types["user" + d.user].length - 1 - j)
          );
        };
        p.height = function (d) {
          var totalLength =
            (chart.p.spaceForAnnos * d.token.users["user" + d.user]) /
            d.token.maxAnnosPerTokenPerUser;
          return totalLength / d.token.types["user" + d.user].length;
        };

        //p.shapeRendering = "geometricPrecision";

        p.border = function (d) {
          return drawTypeBorder(
            +d3.select(this).attr("width"),
            +d3.select(this).attr("height")
          );
        };
        p.stroke = function (d) {
          return colorMaps.typeRect(d.type, false);
        };
        p.fill = function (d) {
          return colorMaps.typeRect(d.type, true);
        };

        return p;
      };

      return p;
    })()
  );

  //data join chunks (overlapping annos)
  drawGroupedCycles(
    (function () {
      var p = Object.create(parameterObject);

      p.group = chunksG;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the chunks
        return chunks["user" + d].map(function (c) {
          return { chunk: c, user: d };
        });
      };
      p.key = function (d) {
        //the key-function
        return key(d.chunk);
      };

      p.supercompCompLevels = chart.p.maxLevelsSupercompComp;

      p.typeClass = [{ name: "chunk", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "c" + d.chunk.id;
      };
      p.compressionClass = [
        {
          name: "supercompressed",
          value: function (d) {
            return d.chunk.levels > p.supercompCompLevels;
          },
        },
        {
          name: "compressed",
          value: function (d) {
            return d.chunk.levels <= p.supercompCompLevels;
          },
        },
      ];

      p.drawChildren = drawCompressionModes;
      p.computeChildrenParameters = function (parentData, parentSelection) {
        var p = Object.create(parameterObject);

        p.group = parentSelection;
        p.data = extractAnnos(chart, parentData, tokenRange);

        p.typeClass = [{ name: "anno", value: true }];
        p.idClass = function (d) {
          return "u" + parentData.user + "_" + "a" + d.id;
        };

        p.parentLevels = parentData.chunk.levels;
        p.supercompCompLevels = chart.p.maxLevelsSupercompComp;

        p.addCompressionClass = function (selection, compression) {
          selection.classed(compression, true);
        };

        p.scFunction = drawLine;
        p.scParameters = (function (parentData, parentSelection) {
          var p = Object.create(parameterObject);

          p.group = parentSelection;
          p.data = [parentData];

          p.typeClass = [{ name: "chunk", value: true }];
          p.compressionClass = [{ name: "supercompressed", value: true }];

          p.text = function (d) {
            return `annotations No ${d.chunk.annos.first} to ${d.chunk.annos.last}`;
          };

          var chunkLength =
            (parentData.chunk.tokens.last - parentData.chunk.tokens.first + 1) *
            chart.p.xScaleTokens_Bins.bandwidth();
          var height = chart.p.userHeight;
          var length = chunkLength;
          var tan = height / length;

          if (parentData.chunk.tokens.first < tokenRange[0]) {
            //overlap on the left border
            p.x1 = 0;
            var dist =
              (tokenRange[0] - parentData.chunk.tokens.first) *
              chart.p.xScaleTokens_Bins.bandwidth();
            var y = tan * dist;
            p.y1 = y;
          } else {
            var tokenBegin =
              chart.d.detailXValues[
                parentData.chunk.tokens.first - firstTokenId
              ];
            p.x1 = tokenBegin;
            p.y1 = 0;
          }
          if (parentData.chunk.tokens.last > tokenRange[1]) {
            //overlap on the right border
            p.x2 = chart.p.width;
            var dist =
              (tokenRange[1] - parentData.chunk.tokens.first + 1) *
              chart.p.xScaleTokens_Bins.bandwidth();
            var y = tan * dist;
            p.y2 = y;
          } else {
            var tokenEnd =
              chart.d.detailXValues[
                parentData.chunk.tokens.last - firstTokenId
              ] + chart.p.xScaleTokens_Bins.bandwidth();
            p.x2 = tokenEnd;
            p.y2 = chart.p.userHeight;
          }

          return p;
        })(parentData, parentSelection);

        p.shortAnnoVPadding =
          (chart.p.userHeight -
            parentData.chunk.levels * chart.p.shortAnnoHeight_sa) /
          (parentData.chunk.levels + 1);

        p.children = [];
        p.children.push({
          type: "rect",
          typeClass: [{ name: "anno", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.x = function (d) {
              if (d.tokens.first < tokenRange[0]) {
                return 0;
              } else {
                var tokenBegin =
                  chart.d.detailXValues[d.tokens.first - firstTokenId];
                return tokenBegin;
              }
            };
            a.width = function (d) {
              //overlap on both sides
              if (
                d.tokens.first < tokenRange[0] &&
                d.tokens.last > tokenRange[1]
              )
                return chart.p.width;
              //overlap on the right side
              if (d.tokens.last > tokenRange[1])
                return (
                  chart.p.xScaleTokens_Bins.bandwidth() *
                  (tokenRange[1] - d.tokens.first + 1)
                );
              //overlap on the left side
              if (d.tokens.first < tokenRange[0])
                return (
                  chart.p.xScaleTokens_Bins.bandwidth() *
                  (d.tokens.last - tokenRange[0] + 1)
                );
              //no overlap
              return (
                chart.p.xScaleTokens_Bins.bandwidth() *
                (d.tokens.last - d.tokens.first + 1)
              );
            };
            a.y = function (d) {
              return (
                (d.level - 1) * chart.p.shortAnnoHeight_sa +
                d.level * p.shortAnnoVPadding
              );
            };
            a.height = chart.p.shortAnnoHeight_sa;

            a.stateClass = [{ name: "compressed", value: true }];

            a.border = function (d) {
              //set the left & rect border of the rects to 0
              return drawAnnoBorder(
                +d3.select(this).attr("width"),
                +d3.select(this).attr("height")
              );
            };
            //a.shapeRendering =;
            //a.border =;

            return a;
          })(),
        });

        return p;
      };

      return p;
    })()
  );
}

export function drawAggregatedDetailBars(chart, tokenRange, lens = false) {
  var detailBTokens_Bins = chart.detailBTokens_Bins;
  var userTokens_Bins = chart.userTokens_Bins;
  var userAnnos = chart.userAnnos;
  var chunksG = chart.chunks;

  //re-adjust the range (may change from lens-calls)
  chart.p.xScaleTokens_Bins.range([0, chart.p.width]);

  if (lens) {
    //"interpret" tokenRange as binRange and slice the re-binned detail-collection
    var bins = chart.d.detailBins.slice(tokenRange[0], tokenRange[1] + 1);
    bins.maxSize = chart.d.bins.maxSize; //this was lost because of the slicing

    chart.p.xScaleTokens_Bins.range([0, chart.p.lensWidth]);

    detailBTokens_Bins = chart.lensDetailBTokens_Bins;
    userTokens_Bins = chart.lensUserTokens_Bins;
    userAnnos = chart.lensUserAnnos;
    chunksG = chart.lensChunks;
  } else {
    //the bins to be drawn
    var tokens = chart.d.tokens.slice(tokenRange[0], tokenRange[1] + 1);
    var bins = computeBins(chart.p.width, tokens); //re-binning
    chart.d.detailBins = bins;
    chart.p.binRange = [bins[0].id, bins[bins.length - 1].id];
  }

  var binMaxima = chart.d.binMaxima; //independent of the new binning
  chart.p.xScaleTokens_Bins.domain(
    bins.map(function (bin) {
      return bin.id;
    })
  );

  if (!lens) {
    chart.p.xScaleTerms.domain(d3.range(chart.p.numOfTerms));
    //the tokens/bins & positions for the top-window
    var localTerms = computeLocalTerms(chart, tokenRange, true);
  }

  //the detailXValues as starting-points of the bands
  chart.d.detailXValues = chart.p.xScaleTokens_Bins
    .domain()
    .map(chart.p.xScaleTokens_Bins);
  chart.d.detailIds = bins.map(function (b) {
    return b.id;
  });

  var parameterObject = {
    key: key,
    tokenModeClass: [{ name: "aggregated", value: true }],
    //shapeRendering: "auto"
  };
  var attributeObject = {
    //shapeRendering: "auto"
  };

  //data join accumulated background rects
  drawRects(
    (function () {
      var p = Object.create(parameterObject);

      p.group = detailBTokens_Bins;
      p.data = function () {
        return bins.filter(function (b) {
          return b.annosPerBin > 0;
        });
      };

      p.typeClass = [{ name: "bgBin", value: true }];
      p.idClass = function (d) {
        return "b" + d.id;
      };

      p.x = function (d) {
        return chart.p.xScaleTokens_Bins(d.id);
      };
      p.width = chart.p.xScaleTokens_Bins.bandwidth();
      p.y = chart.p.tokenTextHeight + chart.p.tokenPolygonHeight;
      p.height = chart.p.tokenBarHeight;

      //p.shapeRendering = "crispEdges";
      p.fill = function (d) {
        return colorMaps.BGBin(
          binMaxima.maxAnnosPerBin[bins.maxSize - 1] === 0
            ? 0
            : d.annosPerBin / binMaxima.maxAnnosPerBin[bins.maxSize - 1]
        );
      };

      return p;
    })()
  );

  if (!lens) {
    //data join term-texts with backgrounds & text-indicators
    drawGroupedElements(
      (function () {
        var p = Object.create(parameterObject);

        p.group = chart.terms;
        p.data = localTerms;
        p.key = function (d) {
          //the key-function
          return d.id;
        };

        p.typeClass = [{ name: "term", value: true }];
        p.idClass = function (d) {
          return d.id;
        };

        p.children = [];
        p.children.push({
          //activating rects
          type: "rect",
          typeClass: [{ name: "activeTermRect", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = 0;
            a.height = chart.p.tokenTextHeight;

            return a;
          })(),
        });
        p.children.push({
          //background rects, size & color according to localAnnosPerTerm
          type: "rect",
          typeClass: [{ name: "localTermFrame", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.stateClass = p.stateClass;

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = function (d) {
              return (
                chart.p.tokenTextHeight -
                (chart.p.globalTermHeight * Math.log(d.localAnnosPerTerm + 1)) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };
            a.height = function (d) {
              return (
                (chart.p.globalTermHeight * Math.log(d.localAnnosPerTerm + 1)) /
                Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };

            a.fill = function (d) {
              return colorMaps.localTerms(
                Math.log(d.localAnnosPerTerm + 1) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };

            return a;
          })(),
        });
        p.children.push({
          //termTexts
          type: "text",
          typeClass: [{ name: "termText", value: true }],
          idClass: p.idClass,
          setEAttributes: setTextEAttributes,
          setUaeAttributes: setTextUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.stateClass = p.stateClass;

            a.text = function (d) {
              return d.text;
            };
            a.x = function (d) {
              return d.xPos + chart.p.xScaleTerms.bandwidth() / 2;
              //return chart.p.xScaleTokenText(d.id) + chart.p.xScaleTokenText.bandwidth() / 2;
            };
            a.y = chart.p.tokenTextHeight;
            a.fontSize = chart.p.termFontSize + "px";
            a.transform = function (d) {
              var alpha = -90;
              return (
                "rotate(" +
                String(alpha) +
                "," +
                String(d.xPos + chart.p.xScaleTerms.bandwidth() / 2) +
                "," +
                String(chart.p.tokenTextHeight) +
                ")" +
                " translate(" +
                String(chart.p.textDisplacement) +
                ")"
              );
            };
            a.textHeight = chart.p.globalTermHeight - chart.p.textDisplacement;

            a.filterUrl = function (d) {
              return "url(#" + d.id + ")";
            };
            return a;
          })(),
        });
        p.children.push({
          //frame rects, size according to globalAnnosPerTerm
          type: "rect",
          typeClass: [{ name: "globalTermFrame", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.stateClass = p.stateClass;

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = function (d) {
              return (
                chart.p.tokenTextHeight -
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };
            a.height = function (d) {
              return (
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                Math.log(d.maxGlobalAnnosPerTerm + 1)
              );
            };

            a.border = function (d) {
              //set left/right border of the wall-rects to 0

              var textLength = d3
                .select(this.parentNode)
                .select(".termText")
                .node()
                .getComputedTextLength();
              var frameLength =
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                Math.log(d.maxGlobalAnnosPerTerm + 1);

              var gap =
                textLength + chart.p.textDisplacement + 3 > frameLength
                  ? true
                  : false;
              return drawTermBorder(
                chart,
                chart.p.xScaleTerms.bandwidth(),
                (chart.p.globalTermHeight *
                  Math.log(d.globalAnnosPerTerm + 1)) /
                  Math.log(d.maxGlobalAnnosPerTerm + 1),
                d.xPos,
                gap
              );
            };
            a.stroke = function (d) {
              var value = Number(
                colorMaps
                  .localTerms(
                    Math.log(d.localAnnosPerTerm + 1) /
                      Math.log(d.maxGlobalAnnosPerTerm + 1)
                  )
                  .match(/\((\d+),/)[1]
              );
              return value < 30 ? "darkgrey" : "black";
            };
            return a;
          })(),
        });
        p.children.push({
          //the text-indicator group
          type: "g",
          typeClass: [{ name: "textIndicator_g", value: true }],
          idClass: p.idClass,
          setEAttributes: setGroupEAttributes,
          setUaeAttributes: setGroupUaeAttributes,
          attributes: (function () {
            var grandChildren = [];

            //the connector bar
            grandChildren.push({
              type: "line",
              typeClass: [{ name: "indConnector", value: true }],
              setUaeAttributes: setLineUaeAttributes,
              attributes: (function () {
                var a = Object.create(attributeObject);

                a.x1 = function (d) {
                  return d.xPos + chart.p.xScaleTerms.bandwidth() / 2;
                };
                a.y1 = chart.p.tokenTextHeight;
                a.x2 = function (d) {
                  return d.xPos + chart.p.xScaleTerms.bandwidth() / 2;
                };
                a.y2 = chart.p.tokenTextHeight + chart.p.indConnector;

                return a;
              })(),
            });

            //horizontal text indicator
            grandChildren.push({
              type: "line",
              typeClass: [{ name: "horizontalTextInd", value: true }],
              setUaeAttributes: setLineUaeAttributes,
              attributes: (function () {
                var a = Object.create(attributeObject);

                a.x1 = function (d) {
                  return Math.min(
                    d.xPos + chart.p.xScaleTerms.bandwidth() / 2,
                    chart.p.xScaleTokens_Bins(d.localBins[0].id)
                  );
                };
                a.y1 = chart.p.tokenTextHeight + chart.p.indConnector;
                a.x2 = function (d) {
                  return Math.max(
                    d.xPos + chart.p.xScaleTerms.bandwidth() / 2,
                    chart.p.xScaleTokens_Bins(
                      d.localBins[d.localBins.length - 1].id
                    ) + chart.p.xScaleTokens_Bins.bandwidth()
                  );
                };
                a.y2 = chart.p.tokenTextHeight + chart.p.indConnector;

                return a;
              })(),
            });

            //the vertical tick marks
            grandChildren.push({
              type: "g",
              typeClass: [{ name: "termTicks_g", value: true }],

              factory: function (selection) {
                var sel = selection.selectAll("line").data(function (d) {
                  return d.localBins;
                }, key);

                sel.exit().remove();

                sel = sel
                  .enter()
                  .append("line")
                  .attr("class", "tick")
                  .merge(sel);

                p = {
                  x1: function (d) {
                    return (
                      chart.p.xScaleTokens_Bins(d.id) +
                      chart.p.xScaleTokens_Bins.bandwidth() / 2
                    );
                  },
                  y1: chart.p.tokenTextHeight + chart.p.indConnector,
                  x2: function (d) {
                    return (
                      chart.p.xScaleTokens_Bins(d.id) +
                      chart.p.xScaleTokens_Bins.bandwidth() / 2
                    );
                  },
                  y2:
                    chart.p.tokenTextHeight +
                    chart.p.indConnector +
                    chart.p.termTickLength,
                  strokeWidth: chart.p.xScaleTokens_Bins.bandwidth(),
                };

                setLineUaeAttributes(p, sel);
              },
            });

            return grandChildren;
          })(),
        });
        p.children.push({
          //listener rects
          type: "rect",
          typeClass: [{ name: "listenerRect", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            a.x = function (d) {
              return d.xPos;
            };
            a.width = chart.p.xScaleTerms.bandwidth();
            a.y = 0;
            a.height = chart.p.tokenTextHeight;

            a.listeners = [];
            a.listeners.push({
              event: "mouseover",
              listener: function () {
                // d3.select(this.parentNode).select(".textIndicator_g").classed("activeTerm", true);
                // d3.select(this.parentNode).select(".activeTermRect").classed("activeTerm", true);
              },
            });
            a.listeners.push({
              event: "mouseout",
              listener: function () {
                // d3.select(this.parentNode).select(".textIndicator_g").classed("activeTerm", false);
                // d3.select(this.parentNode).select(".activeTermRect").classed("activeTerm", false);
              },
            });
            //a.listeners.push({
            //    event: "click",
            //    listener: function (d) {
            //        d3.select(this.parentNode).select(".textIndicator_g").classed("activeTerm", true);
            //        d3.select(this.parentNode).select(".activeTermRect").classed("activeTerm", true);
            //
            //        d3.selectAll(".listenerRect").on("mouseover", null).on("mouseout", null);
            //
            //        if ()
            //
            //        console.log(d);
            //    }
            //});

            return a;
          })(),
        });

        p.filter = {
          id: function (d) {
            return d.id;
          },
          x: function (d) {
            return (
              d.xPos +
              chart.p.xScaleTerms.bandwidth() / 2 -
              chart.p.textDisplacement
            );
          },
          y: chart.p.tokenTextHeight - chart.p.xScaleTerms.bandwidth() / 2,
          width: function (d) {
            return (
              (chart.p.globalTermHeight * Math.log(d.localAnnosPerTerm + 1)) /
              Math.log(d.maxGlobalAnnosPerTerm + 1)
            );
          },
          height: chart.p.xScaleTerms.bandwidth(),
          r: function (d) {
            var value = Number(
              colorMaps
                .localTerms(
                  Math.log(d.localAnnosPerTerm + 1) /
                    Math.log(d.maxGlobalAnnosPerTerm + 1)
                )
                .match(/\((\d+),/)[1]
            );
            return value < 160 ? 1 : 0;
          },
          g: function (d) {
            var value = Number(
              colorMaps
                .localTerms(
                  Math.log(d.localAnnosPerTerm + 1) /
                    Math.log(d.maxGlobalAnnosPerTerm + 1)
                )
                .match(/\((\d+),/)[1]
            );
            return value < 160 ? 1 : 0;
          },
          b: function (d) {
            var value = Number(
              colorMaps
                .localTerms(
                  Math.log(d.localAnnosPerTerm + 1) /
                    Math.log(d.maxGlobalAnnosPerTerm + 1)
                )
                .match(/\((\d+),/)[1]
            );
            return value < 160 ? 1 : 0;
          },
        };

        return p;
      })()
    );
  }

  //data join background rects per user
  drawRects(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userTokens_Bins;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the bins
        return bins
          .filter(function (b) {
            return b.users["user" + d] > 0;
          })
          .map(function (b) {
            return { bin: b, user: d };
          });
      };
      p.key = function (d) {
        //the key-function
        return key(d.bin);
      };

      p.typeClass = [{ name: "bgBinUsr", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "b" + d.bin.id;
      };

      p.x = function (d) {
        return chart.p.xScaleTokens_Bins(d.bin.id);
      };
      p.width = chart.p.xScaleTokens_Bins.bandwidth();
      p.y = 0;
      p.height = chart.p.userHeight;

      //p.shapeRendering = "crispEdges";
      p.fill = function (d) {
        return colorMaps.userToken_Bin(
          binMaxima.maxAnnosPerBinPerUser[bins.maxSize - 1] === 0
            ? 0
            : d.bin.users["user" + d.user] /
                binMaxima.maxAnnosPerBinPerUser[bins.maxSize - 1]
        );
      };

      return p;
    })()
  );

  //data join anno/typeRects per user
  drawGroupedCycles(
    (function () {
      var p = Object.create(parameterObject);

      p.group = userAnnos;
      p.data = function (d) {
        return bins
          .filter(function (b) {
            return b.users["user" + d] > 0;
          })
          .map(function (b) {
            return { bin: b, user: d };
          });
      };
      p.key = function (d) {
        //the key-function
        return key(d.bin);
      };

      p.typeClass = [{ name: "binAnnos", value: true }];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "b" + d.bin.id;
      };

      p.drawChildren = drawRects;
      p.computeChildrenParameters = function (parentData, parentSelection) {
        var p = Object.create(parameterObject);

        p.group = parentSelection;
        p.data = function (d) {
          return d.bin.types["user" + d.user]
            .slice() //create a copy of the type-array
            .reverse() //and reverse it                .
            .map(function (type) {
              return { type, bin: d.bin, user: d.user };
            });
        };

        p.typeClass = [{ name: "binAnnoType", value: true }];
        p.type = typeArray.map(function (type) {
          return {
            name: type,
            value: function (d) {
              return d.type === type;
            },
          };
        });

        p.x = function (parentData) {
          return chart.p.xScaleTokens_Bins(parentData.bin.id);
        };
        p.width = function (parentData) {
          return chart.p.xScaleTokens_Bins.bandwidth();
        };
        p.y = function (d, j) {
          //reverse the order again
          return (
            +d3.select(this).attr("height") *
            (d.bin.types["user" + d.user].length - 1 - j)
          );
        };
        p.height = function (d) {
          var totalLength =
            (chart.p.spaceForAnnos * d.bin.users["user" + d.user]) /
            binMaxima.maxAnnosPerBinPerUser[bins.maxSize - 1];
          return totalLength / d.bin.types["user" + d.user].length;
        };

        //p.shapeRendering = "geometricPrecision";

        p.border = function (d) {
          return drawTypeBorder(
            +d3.select(this).attr("width"),
            +d3.select(this).attr("height")
          );
        };
        p.stroke = function (d) {
          return colorMaps.typeRect(d.type, false);
        };
        p.fill = function (d) {
          return colorMaps.typeRect(d.type, true);
        };

        return p;
      };

      return p;
    })()
  );

  //data join pseudo-chunks (annos cut by bin)
  drawGroupedCycles(
    (function () {
      var p = Object.create(parameterObject);

      p.group = chunksG;
      p.data = function (d) {
        //add the user number d (the data of the group-element) to the pseudo-chunks
        return bins
          .filter(function (b) {
            return b.users["user" + d] > 0;
          })
          .map(function (b) {
            return { bin: b, user: d };
          });
      };
      p.key = function (d) {
        //the key-function
        return key(d.bin);
      };

      p.supercompCompLevels = chart.p.maxLevelsSupercompCompAgg;

      p.typeClass = [{ name: "pseudoChunk", value: true }];
      p.compressionClass = [
        {
          name: "supercompressed",
          value: function (d) {
            return (
              d.bin.binCuttingAnnos["user" + d.user].length >
              p.supercompCompLevels
            );
          },
        },
        {
          name: "compressed",
          value: function (d) {
            return (
              d.bin.binCuttingAnnos["user" + d.user].length <=
              p.supercompCompLevels
            );
          },
        },
      ];
      p.idClass = function (d) {
        return "u" + d.user + "_" + "b" + d.bin.id;
      };

      p.drawChildren = drawCompressionModes;
      p.computeChildrenParameters = function (parentData, parentSelection) {
        var p = Object.create(parameterObject);

        p.group = parentSelection;
        p.data = parentData.bin.binCuttingAnnos["user" + parentData.user];

        p.typeClass = [{ name: "anno", value: true }];
        p.idClass = function (d) {
          return "u" + parentData.user + "_" + "a" + d.id;
        };

        p.parentLevels = p.data.length;
        p.supercompCompLevels = chart.p.maxLevelsSupercompCompAgg;

        p.addCompressionClass = function (selection, compression) {
          selection.classed(compression, true);
        };

        p.scFunction = drawRects;
        p.scParameters = (function (parentData, parentSelection) {
          var p = Object.create(parameterObject);

          p.group = parentSelection;
          p.data = [parentData];

          p.typeClass = [{ name: "pseudoChunk", value: true }];
          p.stateClass = [{ name: "supercompressed", value: true }];

          //p.x = chart.d.detailXValues[parentData.bin.id];
          p.x = chart.p.xScaleTokens_Bins(parentData.bin.id);
          p.width = chart.p.xScaleTokens_Bins.bandwidth();
          p.y = chart.p.spaceForAnnos;
          p.height = chart.p.userHeight * chart.p.freeSpace;

          return p;
        })(parentData, parentSelection);

        //display parameters
        p.binAnnoVPadding =
          (chart.p.userHeight - p.parentLevels * chart.p.binAnnosHeight) /
          (p.parentLevels + 1);

        p.children = [];
        p.children.push({
          type: "rect",
          typeClass: [{ name: "anno", value: true }],
          idClass: p.idClass,
          setEAttributes: setRectEAttributes,
          setUaeAttributes: setRectUaeAttributes,
          attributes: (function () {
            var a = Object.create(attributeObject);

            //a.x = chart.d.detailXValues[parentData.bin.id];
            a.x = chart.p.xScaleTokens_Bins(parentData.bin.id);
            a.width = chart.p.xScaleTokens_Bins.bandwidth();
            a.y = function (d) {
              var i = p.data.indexOf(d);
              return i * chart.p.binAnnosHeight + (i + 1) * p.binAnnoVPadding;
            };
            a.height = chart.p.binAnnosHeight;

            a.stateClass = [{ name: "compressed", value: true }];

            a.border = function (d) {
              //set the left & rect border of the rects to 0
              return drawAnnoBorder(
                +d3.select(this).attr("width"),
                +d3.select(this).attr("height")
              );
            };
            //a.shapeRendering =;
            //a.border =;

            return a;
          })(),
        });

        return p;
      };

      return p;
    })()
  );
}

//overviewBars
function drawAtomicOverviewBars(chart, tokenRange) {
  var tokens = chart.d.tokens.slice(tokenRange[0], tokenRange[1] + 1);
  var [xPos, factors] = computeXPos(tokens, chart);
  chart.d.overviewXValues = xPos;
  chart.d.overviewIds = tokens.map(function (t) {
    return t.id;
  });

  //data join overviewBackground-tokenRects
  chart.overviewRects
    .selectAll("rect")
    .data(tokens)
    .enter()
    .append("rect")
    .attr("x", function (_, i) {
      return xPos[i].begin;
    })
    .attr("width", function (_, i) {
      return xPos[i].inc;
    })
    .attr("y", 0)
    .attr("height", chart.p.overviewHeight)
    .attr("class", function (d) {
      return d.annotated ? "annoToken" : "noAnnoToken";
    })
    .attr("stroke-dasharray", function (d, i) {
      //set the upper & lower border of the rects to 0
      return drawTokenBorder(
        xPos[i].inc,
        chart.p.overviewHeight,
        i,
        tokens.length - 1
      );
    })
    .style("fill", function (d) {
      return colorMaps.BGTokenAtomic(
        d.maxAnnosPerToken === 0 ? 0 : d.annosPerToken / d.maxAnnosPerToken
      );
    });
}

function drawSemiAggregatedOverviewBars(chart, tokenRange) {
  var tokens = chart.d.tokens.slice(tokenRange[0], tokenRange[1] + 1);
  //chart.p.xScaleTokens_Bins.domain(d3.range(tokens.length));
  chart.p.xScaleTokens_Bins.domain(
    tokens.map(function (token) {
      return token.id;
    })
  );
  //the overviewXValues as starting-points of the bands
  chart.d.overviewXValues = chart.p.xScaleTokens_Bins
    .domain()
    .map(chart.p.xScaleTokens_Bins);
  chart.d.overviewIds = tokens.map(function (t) {
    return t.id;
  });

  //data join OverviewBackground-TokenRects
  chart.overviewRects
    .selectAll("rect")
    .data(tokens)
    .enter()
    .append("rect")
    .attr("x", function (_, i) {
      return chart.p.xScaleTokens_Bins(i);
    })
    .attr("width", chart.p.xScaleTokens_Bins.bandwidth())
    .attr("y", 0)
    .attr("height", function (d) {
      return (
        chart.p.overviewHeight *
        (d.maxAnnosPerToken === 0 ? 0 : d.annosPerToken / d.maxAnnosPerToken)
      );
    });
  //.attr("shape-rendering", "crispEdges");
}

function drawAggregatedOverviewBars(chart, binRange) {
  var bins = chart.d.bins.slice(binRange[0], binRange[1] + 1);
  bins.maxSize = chart.d.bins.maxSize; //this was lost because of the slicing
  var binMaxima = chart.d.binMaxima;

  //chart.p.xScaleTokens_Bins.domain(d3.range(bins.length));
  chart.p.xScaleTokens_Bins.domain(
    bins.map(function (bin) {
      return bin.id;
    })
  );

  //the overviewXValues as starting-points of the bands
  chart.d.overviewXValues = chart.p.xScaleTokens_Bins
    .domain()
    .map(chart.p.xScaleTokens_Bins);
  chart.d.overviewIds = bins.map(function (b) {
    return b.id;
  });

  //data join OverviewBackground-binRects
  chart.overviewRects
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", function (_, i) {
      return chart.p.xScaleTokens_Bins(i);
    })
    .attr("width", chart.p.xScaleTokens_Bins.bandwidth())
    .attr("y", 0)
    .attr("height", function (d) {
      return (
        chart.p.overviewHeight *
        (binMaxima.maxAnnosPerBin[bins.maxSize - 1] === 0
          ? 0
          : d.annosPerBin / binMaxima.maxAnnosPerBin[bins.maxSize - 1])
      );
    });
  //.attr("shape-rendering", "crispEdges");
  //.style("fill", function (d) {
  //    return colorMaps.BGBin((binMaxima.maxAnnosPerBin[bins.maxSize - 1] === 0) ? 0 : d.annosPerBin / binMaxima.maxAnnosPerBin[bins.maxSize - 1]);
  //});
}

//main functions

export function drawInitialBars(chart) {
  var numTokens = chart.d.tokens.length;
  chart.d.tokenRange = [0, numTokens - 1];

  var numBins = chart.d.bins.length;
  chart.d.binRange = [0, numBins - 1];

  if (numTokens < chart.p.width / chart.p.lowerTokenThreshold) {
    drawAtomicDetailBars(chart, [0, numTokens - 1]);
    drawAtomicOverviewBars(chart, [0, numTokens - 1]);
    chart.modeOverview = "atomic";
    chart.modeDetail = "atomic";
  } else {
    if (numTokens < chart.p.width) {
      drawSemiAggregatedDetailBars(chart, [0, numTokens - 1]);
      drawSemiAggregatedOverviewBars(chart, [0, numTokens - 1]);
      chart.modeOverview = "semiAggregated";
      chart.modeDetail = "semiAggregated";
    } else {
      drawAggregatedDetailBars(chart, [0, numTokens - 1]);
      drawAggregatedOverviewBars(chart, [0, numBins - 1]);
      chart.modeOverview = "aggregated";
      chart.modeDetail = "aggregated";
    }
  }
}

export function udateDetailBars(chart, range) {
  var numTokens =
    chart.modeOverview === "aggregated"
      ? countTokensInBins(chart, range)
      : range[1] - range[0] + 1;
  var tokenRange =
    chart.modeOverview === "aggregated" ? convertBinRange(chart, range) : range;

  chart.d.tokenRange = tokenRange; //HM

  if (numTokens < chart.p.width / chart.p.lowerTokenThreshold) {
    if (
      chart.modeDetail === "semiAggregated" ||
      chart.modeDetail === "aggregated"
    ) {
      chart.modeDetail = "atomic";

      chart.chunks.selectAll("*").remove();
      chart.userAtomicFrames.selectAll("*").remove();
      chart.userAnnos.selectAll("*").remove();
      chart.userTokens_Bins.selectAll("*").remove();
      chart.detailBTokens_Bins.selectAll("*").remove();
      chart.terms.selectAll("*").remove();
    }

    drawAtomicDetailBars(chart, tokenRange);
  } else {
    if (numTokens < chart.p.width) {
      if (chart.modeDetail === "atomic" || chart.modeDetail === "aggregated") {
        chart.modeDetail = "semiAggregated";

        chart.chunks.selectAll("*").remove();
        chart.userAtomicFrames.selectAll("*").remove();
        chart.userAnnos.selectAll("*").remove();
        chart.userTokens_Bins.selectAll("*").remove();
        chart.detailBTokens_Bins.selectAll("*").remove();
        chart.terms.selectAll("*").remove();
      }

      drawSemiAggregatedDetailBars(chart, tokenRange);
    } else {
      if (
        chart.modeDetail === "atomic" ||
        chart.modeDetail === "semiAggregated"
      ) {
        chart.modeDetail = "aggregated";

        chart.chunks.selectAll("*").remove();
        chart.userAtomicFrames.selectAll("*").remove();
        chart.userAnnos.selectAll("*").remove();
        chart.userTokens_Bins.selectAll("*").remove();
        chart.detailBTokens_Bins.selectAll("*").remove();
        chart.terms.selectAll("*").remove();
      }

      drawAggregatedDetailBars(chart, tokenRange);
    }
  }
}

//export function drawDetailBars(chart, tokens, annos, chunks){
//    if (tokens.length < chart.p.width / chart.p.lowerTokenThreshold) {
//        drawAtomicDetailBars(chart, tokens, annos, chunks);
//    }
//    else {
//        if (tokens.length < chart.p.width) {
//            drawSemiAggregatedDetailBars(chart, tokens);
//        }
//        else {
//            var bins = computeBins(tokens, chart);
//            drawAggregatedDetailBars(chart, bins, chart.binMaxima);
//        }
//    }
//}
//
//export function drawOverviewBars(chart, tokens){
//    if (tokens.length < chart.p.width / chart.p.lowerTokenThreshold) {
//        drawAtomicOverviewBars(chart, tokens);
//    }
//    else {
//        if (tokens.length < chart.p.width) {
//            drawSemiAggretagedOverviewBars(chart, tokens);
//        }
//        else {
//            var bins = computeBins(tokens, chart);
//            drawAggregatedOverviewBars(chart, bins, chart.binMaxima);
//        }
//    }
//}
