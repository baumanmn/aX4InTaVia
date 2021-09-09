/**
 * Created by baumanmn on 18.11.2016.
 */
function init() {
  var svg,
    margin,
    margin2,
    width,
    height,
    height2,
    minPadding,
    hPadding,
    paddingFactor,
    minLevels,
    numberOfAnnoTypes,
    typeHeight,
    annoHeight,
    annoHeightAggr,
    userHeight,
    //gruppe des fokus-bereichs
    focusGroup,
    //gruppe der aggregierten tokens/bins(hintergrund)
    focusGroupRects,
    //array: gruppe der token & annotationen per user
    focusGroupUser,
    //gruppe der token per user
    focusGroupUserRects,
    //gruppe der annotationen per user
    focusGroupUserAnnos,
    //gruppe der token-texte
    // focusGroupTokens,
    //gruppe des kontext-bereichs
    contextGroup,
    //gruppe der aggregierten tokens/bins (brushable)
    contextGroupRects,
    brush,
    gBrush,
    zoom,
    lowerTokenThreshold,
    magFactor,
    annos,
    annosFlat,
    chunks,
    tokens,
    maxAnnoPerToken,
    maxAnnoPerTokenPerUser,
    binnedTokens,
    key,
    modeFocus,
    modeContext,
    xPos,
    xScaleFocus,
    xScaleContext,
    xScaleTokenText,
    tokenBarHeight,
    tokenPolygonHeight;

  (function init2() {
    tokenBarHeight = 110;
    tokenPolygonHeight = 20;

    //definierung des oberen und unteren rechtecks
    svg = d3.select("svg");
    margin = { top: 20, right: 20, bottom: 110, left: 40 };
    margin2 = { top: 430 + tokenBarHeight, right: 20, bottom: 30, left: 40 };
    width = +svg.attr("width") - margin.left - margin.right;
    height = +svg.attr("height") - margin.top - margin.bottom;
    height2 = +svg.attr("height") - margin2.top - margin2.bottom;

    //minimale breite für nicht-annotierte token
    lowerTokenThreshold = 5;
    //vergrösserungsfaktor für annotierte token, in (0,1)
    magFactor = 0.7;
    //wieviele levels sollten nach types aufgeschlüsselt werden
    minLevels = 3;
    //mindestabstand zwischen den annotationsschichten eines users
    minPadding = 2;
    //anzahl der im projekt zugelassenen annotationstypen
    numberOfAnnoTypes = 6;
    //minimale höhe eines typen-balkens
    typeHeight = 3;
    //höhe eines annotationsbalkens
    annoHeight = typeHeight * numberOfAnnoTypes;
    //höhe eines tokenbalkens
    userHeight = (minLevels + 1) * minPadding + minLevels * annoHeight;
    //höhe eines annotationsbalkens bei aggregation
    annoHeightAggr = 2;
    //abstand einer anno zum tokenrand
    hPadding = 10;
    paddingFactor = 0.2;

    //definiere eine maske für das focus-fenster
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clipF")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    //definiere eine maske für das context-fenster
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clipC")
      .append("rect")
      .attr("width", width)
      .attr("height", height2);

    //das (um margin verschobene) focus-fenster (inkl clip path)
    focusGroup = svg
      .append("g")
      .attr("class", "focus")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("clip-path", "url(#clipF)");

    //das (um margin verschobene) context-fenster
    contextGroup = svg
      .append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    //hintergrund für context
    contextGroup
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height2)
      .attr("id", "bgContext");

    //die gruppe der focus-bars
    focusGroupRects = focusGroup.append("g").attr("class", "focusRects");

    //die gruppe der context-bars (inkl clip path)
    contextGroupRects = contextGroup
      .append("g")
      .attr("class", "contextRects")
      .attr("clip-path", "url(#clipC)");

    //identifikation der tokens/bins
    key = function (d) {
      return d.id;
    };

    //skalen für den übersichtsmodus
    xScaleContext = d3.scaleBand().range([0, width]);
    xScaleFocus = d3.scaleBand().range([0, width]);
    //skalen für die tokentexte
    xScaleTokenText = d3.scaleBand().range([0, width]);

    //dropshadows
    var shadowDefs = svg.append("defs");
    var filter = shadowDefs.append("filter").attr("id", "dropshadow");
    filter
      .append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");

    filter
      .append("feOffset")
      .attr("in", "blur")
      .attr("dx", 0)
      .attr("dy", 5)
      .attr("result", "offsetBlur");

    var feMerge = filter.append("feMerge");

    feMerge.append("feMergeNode").attr("in", "offsetBlur");

    feMerge.append("feMergeNode").attr("in", "SourceGraphic");
  })();

  //einlesen der daten
  d3.json("../data/dump.json", function (data) {
    //beschnittener datensatz zu testzwecken
    // var data = {
    //     userAnnotations: data.userAnnotations.filter(function (anno) {
    //         return anno.annotationTokens[anno.annotationTokens.length - 1] < 100;
    //     }),
    //     size: data.size,
    //     tokens: data.tokens.slice(0, 100),
    //     users: data.users
    // };

    annos = sortAnnos(data);
    annosFlat = sortAnnosFlat(data);
    // console.log("annos");
    // console.log(annos);
    // console.log("annosFlat");
    // console.log(annosFlat);

    tokenEnrichment(data);

    tokens = data.tokens;
    //console.log("tokens");
    //console.log(tokens);

    //anzahl annotationen per user und token als matrix:
    var annoPerTokenPerUser = data.users.map(function (user) {
      return tokens.map(function (token) {
        return token.annotatingUsers.reduce(function (
          accumulator,
          currentValue
        ) {
          return accumulator + (currentValue === user ? 1 : 0);
        },
        0);
      });
    });
    var annoPerToken = tokens.map(function (t) {
      return t.annotatingUsers.length;
    });
    // console.log("annoPerTokenPerUser");
    // console.log(annoPerTokenPerUser);

    //chunks zusammenhängender annotierter token und ihre einzelnen user-annotationen
    chunks = computeChunks(tokens, data.users, annos, annosFlat);
    // console.log("chunks");
    // console.log(chunks);

    //maximale anzahl annotationen pro token bzw. pro user und token
    maxAnnoPerToken = Math.max.apply(null, annoPerToken);
    maxAnnoPerTokenPerUser = Math.max.apply(
      null,
      data.users.map(function (user, j) {
        return Math.max.apply(null, annoPerTokenPerUser[j]);
      })
    );

    //maximale anzahl annotationen pro user und bin für alle möglichen bin-grössen
    var binMax = computeMaxAnnosPerBin();

    //die gruppen für die user-annotationen
    focusGroupUser = data.users.map(function (user, i) {
      var l = data.users.length;
      var d = (height - tokenBarHeight - l * userHeight) / (l + 1);
      var offset = d * (i + 1) + i * userHeight + tokenBarHeight;

      return focusGroup
        .append("g")
        .attr("class", "focusUser" + user)
        .attr("transform", "translate(" + 0 + "," + offset + ")");
    });

    focusGroupUserRects = data.users.map(function (user, j) {
      return focusGroupUser[j]
        .append("g")
        .attr("class", "focusUser" + user + "Rects");
    });

    focusGroupUserAnnos = data.users.map(function (user, j) {
      return focusGroupUser[j]
        .append("g")
        .attr("class", "focusUser" + user + "Annos");
    });

    // focusGroupTokens = focusGroup.append("g").attr("class", "focusTokens");

    (function drawBars() {
      if (tokens.length < width / lowerTokenThreshold) {
        modeContext = "detail";
        modeFocus = "detail";

        //array mit den anfangspositionen der rects
        xPos = xPosf(tokens);

        // DATA JOIN focusRects
        focusGroupRects
          .selectAll("rect")
          .data(tokens, key)
          .enter()
          .append("rect")
          .attr("x", function (d, i) {
            return xPos[i].begin;
          })
          .attr("y", 0)
          .attr("width", function (d, i) {
            return xPos[i].inc;
          })
          .attr("height", height)
          .attr("class", function (d) {
            if (d.annotatingUsers.length > 0) return "annoFocusBar";
            else return "noAnnoFocusBar";
          })
          //den oberen und unteren (bzw. auch rechten/linken) rand der rechtecke auf 0 setzen
          .attr("stroke-dasharray", function (d, i) {
            if (i === 0)
              return (
                "0, " +
                xPos[i].inc +
                "," +
                height +
                "," +
                (xPos[i].inc + height)
              );
            if (i === tokens.length - 1)
              return "0, " + (2 * xPos[i].inc + height) + "," + height;
            return (
              "0, " +
              xPos[i].inc +
              "," +
              height +
              "," +
              xPos[i].inc +
              "," +
              height
            );
          })
          .style("fill", function (d) {
            return colorMap(
              maxAnnoPerToken === 0
                ? 0
                : d.annotatingUsers.length / maxAnnoPerToken
            );
          });

        // DATA JOIN focusUserRects (& text) & type-rects
        data.users.forEach(function (user, j) {
          var tokensInChunks = tokens.filter(function (token) {
              return token.chunkId[j] > -1;
            }),
            tokensWithAnnos = tokensInChunks.filter(function (token) {
              return token.borderOfAnnosFlat[j][0] > -1;
            }),
            firstFlatAnno = tokensWithAnnos[0].borderOfAnnosFlat[j][0],
            lastFlatAnno =
              tokensWithAnnos[tokensWithAnnos.length - 1].borderOfAnnosFlat[
                j
              ][1],
            newAnnos = annosFlat[j].slice(firstFlatAnno, lastFlatAnno + 1);

          focusGroupUserRects[j]
            .selectAll("rect")
            .data(tokens, key)
            .enter()
            .append("rect")
            .attr("x", function (d, i) {
              return xPos[i].begin;
            })
            .attr("y", 0)
            .attr("width", function (d, i) {
              return xPos[i].inc;
            })
            .attr("height", userHeight)
            .attr("class", function (d) {
              if (d.annotatingUsers.indexOf(user) > -1)
                return "userAnnoFocusBar";
              else return "noUserAnnoFocusBar";
            })
            //den oberen und unteren (bzw. auch rechten/linken) rand der rechtecke auf 0 setzen
            .attr("stroke-dasharray", function (d, i) {
              if (i === 0)
                return (
                  "0, " +
                  xPos[i].inc +
                  "," +
                  userHeight +
                  "," +
                  (xPos[i].inc + userHeight)
                );
              if (i === tokens.length - 1)
                return (
                  "0, " + (2 * xPos[i].inc + userHeight) + "," + userHeight
                );
              return (
                "0, " +
                xPos[i].inc +
                "," +
                userHeight +
                "," +
                xPos[i].inc +
                "," +
                userHeight
              );
            })
            .style("fill", function (d) {
              return colorMapUser(
                maxAnnoPerTokenPerUser === 0
                  ? 0
                  : annoPerTokenPerUser[j][d.id] / maxAnnoPerTokenPerUser
              );
            });

          focusGroupUserAnnos[j]
            .selectAll("rect")
            .data(newAnnos)
            .enter()
            .append("rect")
            .attr("x", function (d, i) {
              return xPos[
                Math.max(d.annotationTokens[0], tokens[0].id) - tokens[0].id
              ].begin;
            })
            .attr("y", function (d, i) {
              var chunk = chunks[j][tokens[d.annotationTokens[0]].chunkId[j]],
                lines = chunk.annoLines,
                pos = chunk.annoPos.filter(function (pos) {
                  return pos.annoId === d.idPerUserFlat;
                })[0],
                level = pos.level,
                sib = pos.siblings,
                fSib = pos.followingSiblings,
                padding = (userHeight - lines * annoHeight) / (lines + 1),
                paddingAggr =
                  (userHeight - lines * annoHeightAggr) / (lines + 1);

              if (padding >= minPadding) {
                return (
                  (level - 1) * annoHeight +
                  level * padding +
                  (annoHeight / (sib + 1)) * (sib - fSib)
                );
              } else {
                if (paddingAggr >= minPadding && d.firstInTypeArray)
                  return (level - 1) * annoHeightAggr + level * paddingAggr;
                else {
                  console.log("too many Annos");
                  return 0;
                }
              }
            })
            .attr("width", function (d, i) {
              var first = Math.max(d.annotationTokens[0], tokens[0].id),
                last = Math.min(
                  d.annotationTokens[d.annotationTokens.length - 1],
                  tokens[tokens.length - 1].id
                );
              return tokens
                .slice(first, last + 1)
                .reduce(function (accT, currT) {
                  return accT + xPos[currT.id - tokens[0].id].inc;
                }, 0);
            })
            .attr("height", function (d, i) {
              var chunk = chunks[j][tokens[d.annotationTokens[0]].chunkId[j]],
                lines = chunk.annoLines,
                pos = chunk.annoPos.filter(function (pos) {
                  return pos.annoId === d.idPerUserFlat;
                })[0],
                sib = pos.siblings,
                padding = (userHeight - lines * annoHeight) / (lines + 1),
                paddingAggr =
                  (userHeight - lines * annoHeightAggr) / (lines + 1);
              // console.log(annoHeight);

              if (padding >= minPadding) {
                return annoHeight / (sib + 1);
              } else {
                if (paddingAggr >= minPadding && d.firstInTypeArray) {
                  return annoHeightAggr;
                } else {
                  console.log("too many Annos");
                  return 0;
                }
              }
            })
            .attr("class", function (d) {
              return d.annotationType[0];
            })
            .style("fill", function (d, i) {
              var chunk = chunks[j][tokens[d.annotationTokens[0]].chunkId[j]],
                lines = chunk.annoLines,
                pos = chunk.annoPos.filter(function (pos) {
                  return pos.annoId === d.idPerUserFlat;
                })[0],
                sib = pos.siblings,
                padding = (userHeight - lines * annoHeight) / (lines + 1),
                paddingAggr =
                  (userHeight - lines * annoHeightAggr) / (lines + 1);

              if (padding < minPadding && paddingAggr >= minPadding) {
                return "black";
              } else {
                if (i % 2 === 0) return "blue";
                else return "green";
              }
            })
            .on(
              "mouseover",
              function () {
                console.log("test");
              },
              true
            );

          //text
          // focusGroupUserRects[j].selectAll("text").data(tokens, key)
          //     .enter()
          //     .append("text")
          //     .attr("x", function (d, i) {
          //         return xPos[i].begin + xPos[i].inc / 2;
          //     })
          //     .attr("y", userHeight / 2)
          //     .attr("class", function (d) {
          //         if (d.annotatingUsers.indexOf(user) > -1) return "userAnnoText";
          //         else return "noUserAnnoText";
          //     })
          //     .text(function (d) {
          //         return (d.id);
          //     });
        });

        // //test: einzeluser
        // var user = data.users[3],
        //     j = 3;

        // DATA JOIN contextRects
        contextGroupRects
          .selectAll("rect")
          .data(tokens, key)
          .enter()
          .append("rect")
          .attr("x", function (d, i) {
            return xPos[i].begin;
          })
          .attr("y", 0)
          .attr("width", function (d, i) {
            return xPos[i].inc;
          })
          .attr("height", height2)
          .attr("class", function (d) {
            if (d.annotatingUsers.length > 0) return "annoContextBar";
            else return "noAnnoContextBar";
          })
          //den oberen und unteren (bzw. auch rechten/linken) rand der rechtecke auf 0 setzen
          .attr("stroke-dasharray", function (d, i) {
            if (i === 0)
              return (
                "0, " +
                xPos[i].inc +
                "," +
                height2 +
                "," +
                (xPos[i].inc + height2)
              );
            if (i === tokens.length - 1)
              return "0, " + (2 * xPos[i].inc + height2) + "," + height2;
            return (
              "0, " +
              xPos[i].inc +
              "," +
              height2 +
              "," +
              xPos[i].inc +
              "," +
              height2
            );
          })
          .style("fill", function (d) {
            return colorMap(
              maxAnnoPerToken === 0
                ? 0
                : d.annotatingUsers.length / maxAnnoPerToken
            );
          });
      } else {
        modeContext = "overview";

        //erzeuge bins der breite l für die N Tokens, wobei l = width/N für N in [width/lTT, w) bzw. l=1 für N >= width
        binnedTokens = computeBins(tokens).binnedTokens;

        var maxAnnoPerBin = Math.max.apply(
          null,
          binnedTokens.map(function (b) {
            return b.numOfAnnos;
          })
        );

        var maxAnnoPerBinPerUser = Math.max.apply(
          null,
          binnedTokens.map(function (b) {
            return Math.max.apply(null, b.numOfUserAnnos);
          })
        );

        //definition der skalen-domains
        xScaleFocus.domain(
          d3.range(binnedTokens.length).map(function (i) {
            return "bin" + i;
          })
        );
        xScaleContext.domain(
          d3.range(binnedTokens.length).map(function (i) {
            return "bin" + i;
          })
        );

        //array mit den anfangspositionen der rects
        xPos = xScaleContext.domain().map(xScaleContext);

        // DATA JOIN focusRects
        focusGroupRects
          .selectAll("rect")
          .data(binnedTokens, key)
          .enter()
          .append("rect")
          .attr("x", function (d) {
            return xScaleFocus(d.id);
          })
          .attr("y", 0)
          .attr("width", xScaleFocus.bandwidth())
          .attr("height", height)
          .style("fill", function (d) {
            //return "rgb(0,0,"+ Math.round(numOfAnnoPerBin[i] / maxAnno * 255)+")";
            return colorMap(
              maxAnnoPerBin === 0 ? 0 : d.numOfAnnos / maxAnnoPerBin
            );
            // return colorMap(numOfAnnoPerBin[d.id.slice(3)] / maxAnno);
          });

        // DATA JOIN focusUserRects
        data.users.forEach(function (user, j) {
          focusGroupUserRects[j]
            .selectAll("rect")
            .data(binnedTokens, key)
            .enter()
            .append("rect")
            .attr("x", function (d) {
              return xScaleFocus(d.id);
            })
            .attr("y", 0)
            .attr("width", xScaleFocus.bandwidth())
            .attr("height", userHeight)
            .style("fill", function (d) {
              return colorMapUser(
                maxAnnoPerBinPerUser === 0
                  ? 0
                  : d.numOfUserAnnos[j] / maxAnnoPerBinPerUser
              );
              // return colorMapUser(numOfUserAnnoPerBin[j][d.id.slice(3)] / maxUserAnno[j]);
            });
        });

        // DATA JOIN contextRects
        contextGroupRects
          .selectAll("rect")
          .data(binnedTokens, key)
          .enter()
          .append("rect")
          .attr("x", function (d) {
            return xScaleContext(d.id);
          })
          .attr("y", 0)
          .attr("width", xScaleContext.bandwidth())
          .attr("height", function (d) {
            return (height2 / maxAnnoPerBin) * d.numOfAnnos;
          })
          .style("fill", "black");
        // //alternative: farbkodierte streifen wie im fokus-fenster
        // .attr("height", height2)
        // .style("fill", function (d) {
        //     //return "rgb(0,0,"+ Math.round(numOfAnnoPerBin[i] / maxAnno * 255)+")";
        //     return colorMap((maxAnnoPerBin === 0) ? 0 : d.numOfAnnos / maxAnnoPerBin);
        //     // return colorMap(numOfAnnoPerBin[d.id.slice(3)] / maxAnno);
        // });
      }
    })();

    (function brushAndZoom() {
      //erzeugung des brush für das context-fenster, deklarierung der überstreichbaren fläche, anbindung des listeners "brushed"
      brush = d3
        .brushX()
        .extent([
          [0, 0],
          [width, height2],
        ])
        .on("brush", brushed);

      //erzeugung des zoom behaviour, anbindung des listeners "zoomed"
      zoom = d3
        .zoom()
        .scaleExtent([1, Infinity]) //verkleinerung ist nicht erlaubt
        .translateExtent([
          [0, 0],
          [width, height],
        ]) //verschiebung ist auf das focus-fenster beschränkt
        .extent([
          [0, 0],
          [width, height],
        ]) //viewport = focus-fenster
        .on("zoom", zoomed);

      //der brush wird auf dem context-fenster aufgerufen
      gBrush = contextGroup
        .append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, [0, width]);

      //der zoom wird aufgerufen
      // rZoom = svg.append("rect")
      //     .attr("class", "zoom")
      //     .attr("width", width)
      //     .attr("height", height)
      //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      focusGroup.call(zoom.transform, d3.zoomIdentity).call(zoom);
      // .on("mousemove.zoom", null);
      // zoom.filter(function(){
      //     return d3.event.button;
      // });

      //bei click ausserhalb der brush-selection brush zentrieren.
      gBrush.select(".overlay").on("mousedown", mousedown);
    })();

    //handler für context-click ausserhalb der brush-selection
    function mousedown() {
      var e = d3.event;
      if (e.which === 1) {
        e.stopPropagation();
        e.preventDefault();
        var lastX = d3.mouse(gBrush.node())[0],
          w = d3.select(window),
          moved = false;
        w.on("mousemove", mousemove).on("mouseup", mouseup);
      }

      function mousemove() {
        moved = true;
        var e = d3.event;
        var newX = d3.mouse(gBrush.node())[0];
        e.stopPropagation();
        e.preventDefault();

        if (lastX < newX) brush.move(gBrush, [lastX, Math.min(newX, width)]);
        else brush.move(gBrush, [Math.max(newX, 0), lastX]);
      }

      function mouseup() {
        d3.event.stopPropagation();
        if (!moved) centerbrush();
        w.on("mouseup", null).on("mousemove", null);
        function centerbrush() {
          var sel = d3.brushSelection(gBrush.node()),
            target = d3.event.target,
            s = sel[1] - sel[0],
            y0 = s / 2,
            y1 = width - s / 2,
            center = Math.max(y0, Math.min(y1, d3.mouse(target)[0]));

          //die brush-selection wird neu gesetzt; hierbei wird auch ein brush-event abgefeuert, und daher die selection gesnappt
          brush.move(gBrush, [center - s / 2, center + s / 2]);
        }
      }
    }

    //handler für die verschiebung der brush-selection
    function brushed() {
      // ignoriere von zoom abgefeuerte brush-events
      // console.log(d3.event.sourceEvent.type);
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
      //verhindern einer schleife, da der brush hier (mittels .move) selbst brush-events abfeuert:
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;

      //default brush-bereich ist [0, width]
      var s = d3.event.selection || [0, width];

      //position für das erste und letzte token/bin im brush-bereich
      var d = s.map(xInvert.bind(null, xPos, modeContext));

      var dist, offset, updatedTokens;

      if (modeContext === "overview") {
        //tokens in den gebrushten bins
        updatedTokens = binsToTokens(binnedTokens, d[0], d[1]);

        dist = xPos[d[1]] + xScaleContext.bandwidth() - xPos[d[0]];
        offset = xPos[d[0]];

        if (updatedTokens.length < width / lowerTokenThreshold) {
          modeFocus = "detail";
        } else {
          modeFocus = "overview";
        }
      } else {
        //gebrushte tokens
        updatedTokens = tokens.slice(d[0], d[1] + 1);

        dist = xPos[d[1]].begin + xPos[d[1]].inc - xPos[d[0]].begin;
        offset = xPos[d[0]].begin;
      }

      //der brush wird auf tokens/bins gesnappt
      d3.select(this).call(d3.event.target.move, [offset, offset + dist]);

      //passe die zoom transform auf den ausgewählten (gesnappten) brush-bereich an
      focusGroup.call(
        zoom.transform,
        d3.zoomIdentity.scale(width / dist).translate(-offset, 0)
      );

      //zeichne die fokus-tokens/bins neu
      updateFocusBars(updatedTokens, modeFocus);
    }

    //handler für die änderung der zoom-transform
    function zoomed() {
      // ignoriere vom brush abgefeuerte zoom-events
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
      //verhindern einer schleife
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

      //die zoom transform
      var t = d3.event.transform;

      // ids für das erste und letzte token/bin im transformierten bereich
      var d = [0, width]
        .map(t.invertX, t)
        .map(xInvert.bind(null, xPos, modeContext));

      var dist, offset, updatedTokens;

      if (modeContext === "overview") {
        //tokens in den bins im transform-bereich
        updatedTokens = binsToTokens(binnedTokens, d[0], d[1]);

        dist = xPos[d[1]] + xScaleContext.bandwidth() - xPos[d[0]];
        offset = xPos[d[0]];

        if (updatedTokens.length < width / lowerTokenThreshold) {
          modeFocus = "detail";
        } else {
          modeFocus = "overview";
        }
      } else {
        //tokens im transform-bereich
        updatedTokens = tokens.slice(d[0], d[1] + 1);

        dist = xPos[d[1]].begin + xPos[d[1]].inc - xPos[d[0]].begin;
        offset = xPos[d[0]].begin;
      }

      //verschiebe den brush (snapping)
      contextGroup.select(".brush").call(brush.move, [offset, offset + dist]);

      //zeichne die fokus-tokens/bins neu
      updateFocusBars(updatedTokens, modeFocus);

      //passe die zoom transform auf den gesnappten bereich an
      // svg.select(".zoom").call(zoom.translateBy, offset - t.applyX(0));
      // svg.select(".zoom").call(zoom.scaleBy, dist / (t.applyX(width) - t.applyX(0)) );
    }

    function updateFocusBars(localTokens, mode) {
      //tabula rasa, notwendig insbesondere beim übergang von detail zu overview
      focusGroup.selectAll("rect").remove();
      focusGroupRects.selectAll("g").remove();

      if (mode === "detail") {
        var xPos = xPosf(localTokens);
        var aTokenWidth = Math.max.apply(
          null,
          xPos.map(function (pos) {
            return pos.inc;
          })
        );
        //definition der skalen-domains
        xScaleTokenText.domain(
          localTokens.map(function (t) {
            return t.id;
          })
        );

        // DATA JOIN focusRects
        // UPDATE
        var tokenRectsFocus = focusGroupRects
          .selectAll("g")
          .data(localTokens, key);

        // ENTER & UPDATE
        var groups = tokenRectsFocus
          .enter()
          .append("g")
          .merge(tokenRectsFocus)
          .attr("class", function (d) {
            return "token " + d.id;
          })
          .attr("fill", function (d) {
            return colorMap(
              maxAnnoPerToken === 0
                ? 0
                : d.annotatingUsers.length / maxAnnoPerToken
            );
          })
          .attr("class", function (d) {
            if (d.annotatingUsers.length === 0) return "noAnnoTokengroup";
            else return "annoTokengroup";
          });
        // .on("mouseover", function () {
        //     d3.select(this).attr("fill", "yellow");
        // });

        //anbindung der hintergrundrechtecke im annotationsbereich
        groups
          .append("rect")
          .attr("x", function (d, i) {
            return xPos[i].begin;
          })
          .attr("y", tokenBarHeight)
          .attr("width", function (d, i) {
            return xPos[i].inc;
          })
          .attr("height", height - tokenBarHeight)
          .attr("class", function (d) {
            if (d.annotatingUsers.length > 0) return "annoFocusBar";
            else return "noAnnoFocusBar";
          })
          //den oberen und unteren (bzw. auch rechten/linken) rand der rechtecke auf 0 setzen
          .attr("stroke-dasharray", function (d, i) {
            if (i === 0)
              return (
                "0, " +
                xPos[i].inc +
                "," +
                (height - tokenBarHeight) +
                "," +
                (xPos[i].inc + height - tokenBarHeight)
              );
            if (i === localTokens.length - 1)
              return (
                "0, " +
                (2 * xPos[i].inc + height - tokenBarHeight) +
                "," +
                (height - tokenBarHeight)
              );
            return (
              "0, " +
              xPos[i].inc +
              "," +
              (height - tokenBarHeight) +
              "," +
              xPos[i].inc +
              "," +
              (height - tokenBarHeight)
            );
          });
        // .style("fill", function (d) {
        //     return colorMap((maxAnnosPerToken === 0) ? 0 : d.annotatingUsers.length / maxAnnosPerToken);
        // });

        //anbindung der hintergrundrechtecke im tokenText-bereich
        groups
          .append("rect")
          .attr("x", function (d, i) {
            return xScaleTokenText(d.id);
          })
          .attr("y", 0)
          .attr("width", xScaleTokenText.bandwidth())
          .attr("height", tokenBarHeight - tokenPolygonHeight)
          .attr("class", "tokenTextRect")
          //den oberen und unteren (bzw. auch rechten/linken) rand der rechtecke auf 0 setzen
          .attr("stroke-dasharray", function (d, i) {
            if (i === 0)
              return (
                "0, " +
                xScaleTokenText.bandwidth() +
                "," +
                (tokenBarHeight - tokenPolygonHeight) +
                "," +
                (xScaleTokenText.bandwidth() +
                  tokenBarHeight -
                  tokenPolygonHeight)
              );
            if (i === localTokens.length - 1)
              return (
                "0, " +
                (2 * xScaleTokenText.bandwidth() +
                  tokenBarHeight -
                  tokenPolygonHeight) +
                "," +
                (tokenBarHeight - tokenPolygonHeight)
              );
            return (
              "0, " +
              xScaleTokenText.bandwidth() +
              "," +
              (tokenBarHeight - tokenPolygonHeight) +
              "," +
              xScaleTokenText.bandwidth() +
              "," +
              (tokenBarHeight - tokenPolygonHeight)
            );
          });
        // .style("fill", function (d) {
        //     return colorMap((maxAnnosPerToken === 0) ? 0 : d.annotatingUsers.length / maxAnnosPerToken);
        // });

        //anbindung der verbindungs-polygone
        groups
          .append("polygon")
          .attr("points", function (d, i) {
            return (
              String(xPos[i].begin) +
              "," +
              String(tokenBarHeight) +
              " " +
              String(xPos[i].begin + xPos[i].inc) +
              "," +
              String(tokenBarHeight) +
              " " +
              String(xScaleTokenText(d.id) + xScaleTokenText.bandwidth()) +
              "," +
              String(tokenBarHeight - tokenPolygonHeight) +
              " " +
              String(xScaleTokenText(d.id)) +
              "," +
              String(tokenBarHeight - tokenPolygonHeight)
            );
          })
          .attr("class", "tokenPolygons");
        // .style("fill", function (d, i) {
        //     // if (i%2===0) return "green"; else return "red";
        //     return colorMap((maxAnnosPerToken === 0) ? 0 : d.annotatingUsers.length / maxAnnosPerToken);
        // });

        //anbindung der texte im tokenText-bereich
        groups
          .append("text")
          .text(function (d) {
            return d.text;
          })
          .attr("class", "tokenTextText")
          .attr("x", function (d, i) {
            return xScaleTokenText(d.id) + xScaleTokenText.bandwidth() / 2;
          })
          .attr("y", tokenBarHeight - tokenPolygonHeight)
          .attr("text-anchor", "start")
          .attr("font-size", function (d) {
            return Math.min(xScaleTokenText.bandwidth() - 2, 12) + "px";
          })
          .attr("alignment-baseline", "middle")
          // .attr("textLength", function (d) {
          //     return Math.sqrt(Math.pow(tokenBarHeight - tokenPolygonHeight, 2) + Math.pow(xScaleTokenText.bandwidth(), 2));
          // })
          // .attr("lengthAdjust", "spacingAndGlyphs")
          .attr("transform", function (d) {
            var alpha = -90;
            return (
              "rotate(" +
              String(alpha) +
              "," +
              String(xScaleTokenText(d.id) + xScaleTokenText.bandwidth() / 2) +
              "," +
              String(tokenBarHeight - tokenPolygonHeight) +
              ")" +
              " translate(" +
              String(2) +
              ")"
            );
          })
          .attr("fill", function (d, i) {
            // if (i%2===0) return "green"; else return "red";
            if (d.annotatingUsers.length === 0) return "black";
            else return "white";
            // return colorMapText((maxAnnosPerToken === 0) ? 0 : d.annotatingUsers.length / maxAnnosPerToken);
          });
        // .attr("transform", function (d) {
        //     var alpha = -1 * Math.atan2(tokenBarHeight - tokenPolygonHeight, xScaleTokenText.bandwidth()) * (180 / Math.PI);
        //     return "rotate("
        //         + String(alpha) + ","
        //         + String(xScaleTokenText(d.id)) + ","
        //         + String(tokenBarHeight - tokenPolygonHeight) + ")"
        //         + " translate("
        //         + String(6) + ")";
        // });
        //

        // EXIT
        groups.exit().remove();

        // DATA JOIN focusUserRects (& text) & type-rects
        data.users.forEach(function (user, j) {
          var tokensInChunks = localTokens.filter(function (token) {
            return token.chunkId[j] > -1;
          });

          //DATA JOIN für die typeRects falls welche vorhanden sind
          if (tokensInChunks.length > 0) {
            var tokensWithAnnos = tokensInChunks.filter(function (token) {
                return token.borderOfAnnosFlat[j][0] > -1;
              }),
              firstFlatAnno = tokensWithAnnos[0].borderOfAnnosFlat[j][0],
              lastFlatAnno =
                tokensWithAnnos[tokensWithAnnos.length - 1].borderOfAnnosFlat[
                  j
                ][1],
              newAnnos = annosFlat[j].slice(firstFlatAnno, lastFlatAnno + 1);

            var annoUserFocus = focusGroupUserAnnos[j]
              .selectAll("rect")
              .data(newAnnos);

            annoUserFocus
              .enter()
              .append("rect")
              .merge(annoUserFocus)
              .attr("x", function (d, i) {
                var begin =
                  xPos[
                    Math.max(d.annotationTokens[0], localTokens[0].id) -
                      localTokens[0].id
                  ].begin;
                if (d.annotationTokens[0] < localTokens[0].id) return begin;
                else
                  return (
                    begin + Math.min(hPadding, aTokenWidth * paddingFactor)
                  );
              })
              .attr("y", function (d, i) {
                var chunk = chunks[j][tokens[d.annotationTokens[0]].chunkId[j]],
                  lines = chunk.annoLines,
                  pos = chunk.annoPos.filter(function (pos) {
                    return pos.annoId === d.idPerUserFlat;
                  })[0],
                  level = pos.level,
                  sib = pos.siblings,
                  fSib = pos.followingSiblings,
                  padding = (userHeight - lines * annoHeight) / (lines + 1),
                  paddingAggr =
                    (userHeight - lines * annoHeightAggr) / (lines + 1);

                if (padding >= minPadding) {
                  return (
                    (level - 1) * annoHeight +
                    level * padding +
                    (annoHeight / (sib + 1)) * (sib - fSib)
                  );
                } else {
                  if (paddingAggr >= minPadding && d.firstInTypeArray)
                    return (level - 1) * annoHeightAggr + level * paddingAggr;
                  else {
                    console.log("too many Annos");
                    return 0;
                  }
                }
              })
              .attr("width", function (d, i) {
                var first = Math.max(d.annotationTokens[0], localTokens[0].id),
                  last = Math.min(
                    d.annotationTokens[d.annotationTokens.length - 1],
                    localTokens[localTokens.length - 1].id
                  );

                var increment = tokens
                  .slice(first, last + 1)
                  .reduce(function (accT, currT) {
                    return accT + xPos[currT.id - localTokens[0].id].inc;
                  }, 0);

                if (d.annotationTokens[0] < localTokens[0].id)
                  return (
                    increment - Math.min(hPadding, aTokenWidth * paddingFactor)
                  );
                else
                  return (
                    increment -
                    2 * Math.min(hPadding, aTokenWidth * paddingFactor)
                  );
              })
              .attr("height", function (d, i) {
                var chunk = (chunk =
                    chunks[j][tokens[d.annotationTokens[0]].chunkId[j]]),
                  lines = chunk.annoLines,
                  pos = chunk.annoPos.filter(function (pos) {
                    return pos.annoId === d.idPerUserFlat;
                  })[0],
                  sib = pos.siblings,
                  padding = (userHeight - lines * annoHeight) / (lines + 1),
                  paddingAggr =
                    (userHeight - lines * annoHeightAggr) / (lines + 1);

                if (padding >= minPadding) {
                  return annoHeight / (sib + 1);
                } else {
                  if (paddingAggr >= minPadding && d.firstInTypeArray) {
                    return annoHeightAggr;
                  } else {
                    console.log("too many Annos");
                    return 0;
                  }
                }
              })
              .attr("class", "userAnnoTypes")
              .style("fill", function (d, i) {
                var chunk = chunks[j][tokens[d.annotationTokens[0]].chunkId[j]],
                  lines = chunk.annoLines,
                  pos = chunk.annoPos.filter(function (pos) {
                    return pos.annoId === d.idPerUserFlat;
                  })[0],
                  sib = pos.siblings,
                  padding = (userHeight - lines * annoHeight) / (lines + 1),
                  paddingAggr =
                    (userHeight - lines * annoHeightAggr) / (lines + 1);

                if (padding < minPadding && paddingAggr >= minPadding) {
                  return "black";
                } else {
                  return colorMapUserAnnos(d.annotationType[0]);
                }
              })
              // .style("pointer-events", "all")
              .on("click", function (d) {
                // d3.event.stopImmediatePropagation();
                var start = tokens[d.annotationTokens[0]].startOff,
                  end =
                    tokens[d.annotationTokens[d.annotationTokens.length - 1]]
                      .endOff;
                console.log("start");
                console.log(start);
                console.log("end");
                console.log(end);
              })
              //tooltips
              .append("title")
              .text(function (d) {
                return (
                  d.annotationType[0] +
                  "\n" +
                  d.annotationTokens +
                  "\n" +
                  d.annotationText
                );
              });

            annoUserFocus.exit().remove;
          }

          // UPDATE
          var tokenUserRectsFocus = focusGroupUserRects[j]
            .selectAll("rect")
            .data(localTokens, key);
          // var tokenUserRectsFocusText = focusGroupUserRects[j].selectAll("text").data(localTokens, key);

          // ENTER & UPDATE
          tokenUserRectsFocus
            .enter()
            .append("rect")
            .merge(tokenUserRectsFocus)
            .attr("x", function (d, i) {
              return xPos[i].begin;
            })
            .attr("y", 0)
            .attr("width", function (d, i) {
              return xPos[i].inc;
            })
            .attr("height", userHeight)
            .attr("class", function (d) {
              if (d.annotatingUsers.indexOf(user) > -1)
                return "userAnnoFocusBar";
              else return "noUserAnnoFocusBar";
            })
            //den oberen und unteren (bzw. auch rechten/linken) rand der rechtecke auf 0 setzen
            .attr("stroke-dasharray", function (d, i) {
              if (i === 0)
                return (
                  "0, " +
                  xPos[i].inc +
                  "," +
                  userHeight +
                  "," +
                  (xPos[i].inc + userHeight)
                );
              if (i === localTokens.length - 1)
                return (
                  "0, " + (2 * xPos[i].inc + userHeight) + "," + userHeight
                );
              return (
                "0, " +
                xPos[i].inc +
                "," +
                userHeight +
                "," +
                xPos[i].inc +
                "," +
                userHeight
              );
            })
            .style("fill", function (d) {
              return colorMapUser(
                maxAnnoPerTokenPerUser === 0
                  ? 0
                  : annoPerTokenPerUser[j][d.id] / maxAnnoPerTokenPerUser
              );
            });
          // .on("mouseover", function (d) {
          // })
          // .on("mouseout", function (d) {
          // });

          // tokenUserRectsFocusText.enter()
          //     .append("text")
          //     .merge(tokenUserRectsFocusText)
          //     .attr("x", function (d, i) {
          //         return xPos[i].begin + xPos[i].inc / 2;
          //     })
          //     .attr("y", userHeight / 2)
          //     .attr("class", function (d) {
          //         if (d.annotatingUsers.indexOf(j + 1) > -1) return "userAnnoText";
          //         else return "noUserAnnoText";
          //     })
          //     .text(function (d) {
          //         return (annoPerTokenPerUser[j][d.id] > 0) ? annoPerTokenPerUser[j][d.id] : "";
          //     });

          // EXIT
          tokenUserRectsFocus.exit().remove();
          // tokenUserRectsFocusText.exit().remove();
        });
      } else {
        var result = computeBins(localTokens),
          maxBinSize = result.maxBinSize,
          binnedFocusTokens = result.binnedTokens,
          maxAnnoPerBin = binMax.maxAnnoPerBin[maxBinSize - 1],
          maxAnnoPerBinPerUser = binMax.maxAnnoPerBinPerUser[maxBinSize - 1];

        //definition der skalen-domains
        xScaleFocus.domain(
          d3.range(binnedFocusTokens.length).map(function (i) {
            return "bin" + i;
          })
        );

        // DATA JOIN focusRects
        // UPDATE
        var tokenRectsFocus = focusGroupRects
          .selectAll("rect")
          .data(binnedFocusTokens, key);

        // ENTER
        tokenRectsFocus
          .enter()
          .append("rect")
          .merge(tokenRectsFocus)
          .attr("x", function (d) {
            return xScaleFocus(d.id);
          })
          .attr("y", 0)
          .attr("width", xScaleFocus.bandwidth())
          .attr("height", height)
          .style("fill", function (d) {
            // return colorMap((maxAnno === 0) ? 0 : numOfAnnoPerBin[d.id.slice(3)] / maxAnno);
            return colorMap(
              maxAnnoPerBin === 0 ? 0 : d.numOfAnnos / maxAnnoPerBin
            );
          })
          .attr("shape-rendering", "crispEdges");

        // EXIT
        tokenRectsFocus.exit().remove();

        // DATA JOIN focusUserRects
        data.users.forEach(function (user, j) {
          //UPDATE
          var tokenUserRectsFocus = focusGroupUserRects[j]
            .selectAll("rect")
            .data(binnedFocusTokens, key);

          //ENTER
          tokenUserRectsFocus
            .enter()
            .append("rect")
            .merge(tokenUserRectsFocus)
            .attr("x", function (d) {
              return xScaleFocus(d.id);
            })
            .attr("y", 0)
            .attr("width", xScaleFocus.bandwidth())
            .attr("height", userHeight)
            .style("fill", function (d) {
              return colorMapUser(
                maxAnnoPerBinPerUser === 0
                  ? 0
                  : d.numOfUserAnnos[j] / maxAnnoPerBinPerUser
              );
              // return colorMapUser((maxUserAnno[j] === 0) ? 0 : numOfUserAnnoPerBin[j][d.id.slice(3)] / maxUserAnno[j]);
            })
            .attr("shape-rendering", "crispEdges");
          // EXIT
          tokenUserRectsFocus.exit().remove();
        });
      }
    }

    function computeMaxAnnosPerBin() {
      var maxBinSize = Math.ceil(tokens.length / width),
        maxAnnoPerBinPerUser,
        maxAnnoPerBin,
        maxAnnoMatrix = [];

      data.users.map(function (user, j) {
        var annoArr = annoPerTokenPerUser[j].slice(),
          result = annoPerTokenPerUser[j].slice(),
          maxAnno = [];

        for (var binSize = 1; binSize <= maxBinSize; binSize++) {
          maxAnno.push(Math.max.apply(null, result));
          result.pop();
          annoArr.shift();
          result = result.map(function (r, i) {
            return r + annoArr[i];
          });
        }
        maxAnnoMatrix.push(maxAnno);
      });
      maxAnnoPerBinPerUser = maxAnnoMatrix[0].map(function (_, i) {
        return Math.max.apply(
          null,
          maxAnnoMatrix.map(function (row) {
            return row[i];
          })
        );
      });

      var annoArr = annoPerToken.slice(),
        result = annoPerToken.slice(),
        maxAnno = [];

      for (var binSize = 1; binSize <= maxBinSize; binSize++) {
        maxAnno.push(Math.max.apply(null, result));
        result.pop();
        annoArr.shift();
        result = result.map(function (r, i) {
          return r + annoArr[i];
        });
      }
      maxAnnoPerBin = maxAnno;

      return {
        maxAnnoPerBinPerUser: maxAnnoPerBinPerUser,
        maxAnnoPerBin: maxAnnoPerBin,
      };
    }

    function computeBins(tokens) {
      var n = tokens.length,
        binCard = Math.min(n, width), //anzahl bins
        binSize, //anzahl tokens pro bin
        binBaseSize = Math.floor(n / binCard),
        //die restlichen tokens werden zufällig auf alle bins verteilt
        binRest = n - binBaseSize * binCard,
        restPositions = d3
          .shuffle(d3.range(0, binCard, 1))
          .slice(0, binRest)
          .sort(function (a, b) {
            return a - b;
          }),
        maxBinSize = binRest === 0 ? binBaseSize : binBaseSize + 1,
        binnedTokens = [],
        bin,
        counter = 0;
      //upperBinSize = Math.ceil(n / width);

      for (var binI = 0; binI < binCard; binI += 1) {
        bin = [];

        if (binI === restPositions[0]) {
          restPositions.shift();
          binSize = binBaseSize + 1;
        } else binSize = binBaseSize;

        for (var i = 0; i < binSize; i += 1) {
          bin.push(tokens[counter + i]);
        }
        counter += binSize;
        //count the occurences of UserNo in the t.annotatingUsers arrays
        // var numOfUserAnnos = data.users.map(function (user) {
        //     return bin.reduce(function (accumulator, currentValue) {
        //         return accumulator + ((currentValue.annotatingUsers.indexOf(user) > -1) ? 1 : 0);
        //     }, 0);
        // });
        var numOfUserAnnos = data.users.map(function (user) {
          return bin.reduce(function (accT, currT) {
            return (
              accT +
              currT.annotatingUsers.reduce(function (accU, currU) {
                return accU + (currU === user ? 1 : 0);
              }, 0)
            );
          }, 0);
        });

        var numOfAnnos = numOfUserAnnos.reduce(function (
          accumulator,
          currentValue
        ) {
          return accumulator + currentValue;
        },
        0);

        binnedTokens.push({
          id: "bin" + binI,
          value: bin,
          numOfUserAnnos: numOfUserAnnos,
          numOfAnnos: numOfAnnos,
          //upperBinSize: upperBinSize
        });
      }
      return { binnedTokens: binnedTokens, maxBinSize: maxBinSize };
    }
  });

  function binsToTokens(bins, start, end) {
    var res = [];
    bins.slice(start, end + 1).forEach(function (bin) {
      bin.value.forEach(function (token) {
        res.push(token);
      });
    });
    return res;
  }

  function sortAnnos(data) {
    var a = [];
    data.users.map(function (user) {
      var ua = data.userAnnotations.filter(function (anno) {
        //alle annotationen von "user"; annos ohne tokenarrays werden verworfen
        return anno.userNo === user && anno.annotationTokens.length > 0;
      });

      ua.sort(function (a, b) {
        var a0 = a.annotationTokens[0],
          a1 = a.annotationTokens[a.annotationTokens.length - 1],
          b0 = b.annotationTokens[0],
          b1 = b.annotationTokens[b.annotationTokens.length - 1];
        if (a0 === b0 && a1 === b1) return 0;
        if (a0 < b0 || (a0 === b0 && a1 < b1)) return -1;
        return 1;
      });

      //die id identifiziert die anno per user eindeutig. in der flachen version können dann meherere annos die gleiche id haben
      ua.forEach(function (anno, i) {
        anno.idPerUser = i;
      });

      a.push(ua);
    });
    return a;
  }

  function sortAnnosFlat(data) {
    var a = [];
    data.users.map(function (user) {
      var annoCopy = data.userAnnotations.map(function (anno) {
        return jQuery.extend(true, {}, anno);
      });
      var ua = annoCopy.filter(function (anno) {
        //alle annotationen von "user"; annos ohne tokenarrays werden verworfen
        return anno.userNo === user && anno.annotationTokens.length > 0;
      });
      //splitten von annotationen mit mehreren typen
      var ua2 = [];
      ua.forEach(function (anno) {
        anno.annotationType.forEach(function (type) {
          ua2.push(jQuery.extend(true, {}, anno));
          ua2[ua2.length - 1].annotationType = [type];
        });
      });

      ua2.sort(function (a, b) {
        var a0 = a.annotationTokens[0],
          a1 = a.annotationTokens[a.annotationTokens.length - 1],
          b0 = b.annotationTokens[0],
          b1 = b.annotationTokens[b.annotationTokens.length - 1];
        if (a0 === b0 && a1 === b1) return 0;
        if (a0 < b0 || (a0 === b0 && a1 < b1)) return -1;
        return 1;
      });

      var compare = -1;
      ua2.forEach(function (anno, i) {
        anno.idPerUserFlat = i;

        if (anno.idPerUser > compare) {
          anno.firstInTypeArray = true;
          compare = anno.idPerUser;
        } else anno.firstInTypeArray = false;
      });
      a.push(ua2);
    });
    return a;
  }

  function tokenEnrichment(data) {
    data.tokens.forEach(function (t) {
      t.annotatingUsers = [];
      t.borderOfAnnos = [];
      t.borderOfAnnosFlat = [];
      t.chunkId = data.users.map(function (user) {
        return -1;
      });
    });

    //für jedes token markieren, welche user es in einer annotation haben. mehrfachnennungen möglich bei
    //überlappenden annotationen eines users
    data.userAnnotations.forEach(function (anno) {
      if (anno.annotationTokens.length > 0) {
        //verwerfen von annotationen ohne tokens
        for (
          var i = anno.annotationTokens[0];
          i <= anno.annotationTokens[anno.annotationTokens.length - 1];
          i += 1
        ) {
          data.tokens[i].annotatingUsers.push(anno.userNo);
        }
      }
    });

    //für jedes token die am weitesten links bzw. rechts stehende annotation angeben, die dieses token enthalten
    data.users.forEach(function (user, j) {
      var annoMatrix = annos[j].map(function (a) {
        var row = new Array(data.tokens.length);
        a.annotationTokens.forEach(function (t) {
          row[t] = 1;
        });
        return row;
      });

      var annoMatrixFlat = annosFlat[j].map(function (a) {
        var row = new Array(data.tokens.length);
        a.annotationTokens.forEach(function (t) {
          row[t] = 1;
        });
        return row;
      });

      data.tokens.forEach(function (token, tokenI) {
        var col = annoMatrix.map(function (row) {
          return row[tokenI];
        });
        var borders = [col.indexOf(1), col.lastIndexOf(1)];
        token.borderOfAnnos.push(borders);
      });

      data.tokens.forEach(function (token, tokenI) {
        var col = annoMatrixFlat.map(function (row) {
          return row[tokenI];
        });
        var borders = [col.indexOf(1), col.lastIndexOf(1)];
        token.borderOfAnnosFlat.push(borders);
      });
    });
  }

  function computeChunks(tokens, users, annos, annosFlat) {
    var chunks = users.map(function (user, j) {
      return createUserChunks(annos[j][0], 0, [], j);
    });

    function createUserChunks(anno, counter, chunks, userIndex) {
      while (true) {
        var token = tokens[anno.annotationTokens[0]];
        var chunk = {};
        chunk.id = counter;
        chunk.borderTokens = [token.id];

        token = walkAlongAnnos(token);
        chunk.borderTokens[1] = token.id;

        chunks.push(chunk);

        //trage die chunkId in die chunk-tokens ein
        tokens
          .slice(chunk.borderTokens[0], chunk.borderTokens[1] + 1)
          .forEach(function (token) {
            token.chunkId[userIndex] = chunk.id;
          });

        if (token.borderOfAnnos[userIndex][1] < annos[userIndex].length - 1) {
          anno = annos[userIndex][token.borderOfAnnos[userIndex][1] + 1];
          counter += 1;
        } else break;
      }

      function walkAlongAnnos(token) {
        var longerAnnos = annos[userIndex]
          .slice(
            token.borderOfAnnos[userIndex][0],
            token.borderOfAnnos[userIndex][1] + 1
          )
          .filter(function (a) {
            return a.annotationTokens[a.annotationTokens.length - 1] > token.id;
          })
          .sort(function (a, b) {
            if (
              a.annotationTokens[a.annotationTokens.length - 1] <
              b.annotationTokens[b.annotationTokens.length - 1]
            )
              return 1;
            if (
              a.annotationTokens[a.annotationTokens.length - 1] >
              b.annotationTokens[b.annotationTokens.length - 1]
            )
              return -1;
            return 0;
          });

        if (longerAnnos.length > 0) {
          token =
            tokens[
              longerAnnos[0].annotationTokens[
                longerAnnos[0].annotationTokens.length - 1
              ]
            ];
          return walkAlongAnnos(token);
        } else {
          return token;
        }
      }

      return chunks;
    }

    //berechne für jeden chunk und user die anzahl an annotationslinien, die eingezogen werden müssen, sowie
    //für jede annotation ihre höhenposition und die anzahl ihrer unmittelbaren "geschwister"
    users.forEach(function (user, j) {
      chunks[j].forEach(function (chunk) {
        //indices der ersten & letzten annotation (non-flat) von user j im chunk
        var chunkTokensArr = tokens.slice(
            chunk.borderTokens[0],
            chunk.borderTokens[chunk.borderTokens.length - 1] + 1
          ),
          // cTAwithAnnos = chunkTokensArr.filter(function (token) {
          //     return token.borderOfAnnos[j][0] > -1;
          // }),
          firstAnno = chunkTokensArr[0].borderOfAnnos[j][0],
          lastAnno =
            chunkTokensArr[chunkTokensArr.length - 1].borderOfAnnos[j][1];

        chunk.annoLines = lastAnno - firstAnno + 1;

        // annos[j].slice(firstAnno, lastAnno + 1).reduce(function (accA, currA) {
        //     return accA + currA.annotationType.length;
        // }, 0);
        chunk.annoPos = [];
        var firstAnnoFlat = chunkTokensArr[0].borderOfAnnosFlat[j][0],
          lastAnnoFlat =
            chunkTokensArr[chunkTokensArr.length - 1].borderOfAnnosFlat[j][1],
          localAnnosFlat = annosFlat[j].slice(firstAnnoFlat, lastAnnoFlat + 1);

        var counter = 1,
          changed = true,
          followingSiblings = 0;

        chunk.annoPos = localAnnosFlat.map(function (anno) {
          var posObj = {};
          posObj.annoId = anno.idPerUserFlat;
          var siblings = annos[j][anno.idPerUser].annotationType.length - 1;
          posObj.siblings = siblings;
          posObj.level = counter;

          if (changed) followingSiblings = siblings;
          posObj.followingSiblings = followingSiblings;
          if (followingSiblings === 0) {
            counter += 1;
            changed = true;
          } else {
            followingSiblings -= 1;
            changed = false;
          }

          return posObj;
        });
      });
    });

    return chunks;
  }

  function xPosf(tokens) {
    function tokenFactors(tokens) {
      var factors = {};
      //anzahl annotierter bzw. nicht annotierter token
      var numAnno = tokens.reduce(function (a, b) {
          if (b.annotatingUsers.length > 0) return a + 1;
          else return a;
        }, 0),
        numNoAnno = tokens.length - numAnno;

      if (numAnno === 0 || numNoAnno === 0) {
        magnificationFactor = 1;
        widthAnno = width / Math.max(numAnno, numNoAnno);
        widthNoAnno = width / Math.max(numAnno, numNoAnno);
      } else {
        //maximaler vergrösserungsfaktor M; falls minimale breite eingehalten werden soll, muss die vergrösserung in (1, M) liegen
        var maxMagnificationFactor =
          (width - numNoAnno * lowerTokenThreshold) /
          (numAnno * lowerTokenThreshold);
        //wahl des faktors
        var magnificationFactor = 1 + (maxMagnificationFactor - 1) * magFactor;
        //breite der token; falls faktor=M, so ist widthNoAnno = LowerTokenThreshold
        var widthAnno =
            (magnificationFactor * width) /
            (numNoAnno + numAnno * magnificationFactor),
          widthNoAnno = width / (numNoAnno + numAnno * magnificationFactor);
      }

      factors.magnificationFactor = magnificationFactor;
      factors.widthAnno = widthAnno;
      factors.widthNoAnno = widthNoAnno;

      return factors;
    }

    var factors = tokenFactors(tokens);

    var xPos = [];
    var d = 0;

    tokens.forEach(function (t) {
      var pos = {};
      pos.begin = d;
      if (t.annotatingUsers.length > 0) {
        pos.inc = factors.widthAnno;
        d += factors.widthAnno;
      } else {
        pos.inc = factors.widthNoAnno;
        d += factors.widthNoAnno;
      }
      xPos.push(pos);
    });
    return xPos;
  }

  function xInvert(xValues, mode, p) {
    if (p < 0) return 0;
    for (var i = xValues.length - 1; ; i -= 1) {
      if (mode === "detail") {
        if (p >= xValues[i].begin) return i;
      } else if (p >= xValues[i]) return i;
    }
  }

  function colorMap(v) {
    return d3.interpolateLab("white", "black")(v);
    // return d3.interpolateInferno(v);
    // return d3.interpolateBrBG(v);
    // return d3.interpolateGreys(v);
    // var colorScale = d3.scaleSequential(d3.schemeGreys);
    // return colorScale(v);
    // return "rgb(0,0,"+ Math.round(v * 255)+")";
  }

  // function colorMapText(v) {
  //
  //     return d3.interpolateLab("black", "white")(v);
  // }

  function colorMapUser(v) {
    return d3.interpolateLab("mistyrose", "tomato")(v);
    // return d3.interpolateInferno(v);
    // return d3.interpolateBrBG(v);
    // var colorScale = d3.scaleSequential(d3.schemeGreys);
    // return colorScale(v);
    // return "rgb(0,0,"+ Math.round(v * 255)+")";
  }

  function colorMapUserAnnos(type) {
    switch (type) {
      case "PER":
        return "palegreen";
      case "LOC":
        return "palevioletred";
      case "ORG":
        return "violet";
      case "EVT":
        return "green";
      case "WRK":
        return "peru";
      case "WVL":
        return "fuchsia";
      default:
        return "black";
    }
  }

  // function textTrunc(){
  //     var self = d3.select(this),
  //         textWidth = self.node().getComputedTextLength(), 	// Width of text in pixel.
  //         initialText = self.text(), 							// Initial text.
  //         textLength = initialText.length, 					// Length of text in characters.
  //         text = initialText,
  //         precision = 10, //textWidth / width, 				// Adjustable precision.
  //         maxIterations = 100; // width;						// Set iterations limit.
  //
  //     while (maxIterations > 0 && text.length > 0 && Math.abs(width - textWidth) > precision) {
  //
  //         text = /*text.slice(0,-1); =*/(textWidth >= width) ? text.slice(0, -textLength * 0.15) : initialText.slice(0, textLength * 1.15);
  //         self.text(text + '...');
  //         textWidth = self.node().getComputedTextLength();
  //         textLength = text.length;
  //         maxIterations--;
  //     }
  //     // console.log(width - textWidth);
  //     // var self = d3.select(this),
  //     //     textLength = self.node().getComputedTextLength(),
  //     //     text = self.text();
  //     // while (textLength > (width - 2 * padding) && text.length > 0) {
  //     //     text = text.slice(0, -1);
  //     //     self.text(text + '...');
  //     //     textLength = self.node().getComputedTextLength();
  //     // }
  // }
}
init();
