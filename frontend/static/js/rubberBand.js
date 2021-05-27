import $ from "jquery";
import "jquery-ui-bundle";
import * as d3 from "d3";
import { view0, bandInstance } from "./controller.js";
export let rubberBand = (function () {
  /**
   * INVARIANT:
   *          - rubberheight has to be a multiple of 30
   *          - y_scaling has to be a multiple of 10
   *          - ruberheight > 2 * y_scaling
   *          - rubberheigt % y_scaling = 0
   * Example values:
   *          - rubberheight 90. y_scaling 30
   *          - rubberheight 60, y_scaling 20
   *          - rubberheight 120, y_scaling 40
   * DISCLAMER: ensueing the above constraints SHOULD lead to the desired rubberband functionality, yet for specific value combinations funny behaviour MIGHT emerge
   */
  const rubberHeight = 60;
  const y_scaling = 20; //increasing y_scaling leads to the rubberbands being 'rounder'
  const x_scaling = 100;
  let container; //html container
  let container2;
  let instance; //TO DO: REMOVE

  /**
   * initialize new rubberband:
   * a) set attributes
   * b) creeate a new div
   * c) create the rubberband according to the desired form (inward/outward)
   * d) return two public functions to adjust rubberband form according to current distance
   * e) return new instance via getInstace() instantiator method
   */

  //TO DO: FIX PATHS FOR MULTIPLE BANDS
  function init(predec, containerID = "band1Area", bandID = "1", form = true) {
    let bandForm = form;
    predec = "#" + predec;
    let rubberWidth = $(predec).width() + 25; //set the width of the rubberband area according to the predecessor width (which is a splitView) + 25 magix pixels (padding and margin of parent div)
    let rubberLeftFix = 0; //Fix denotes the amount of pixel the left part of the rubberband is rounded inward
    let rubberRightFix = rubberWidth; //Fix denotes the amount of pixel the right part of the rubberband is rounded inward - HARDCODED TO TEXTVIEW WIDTH
    let rubberLeftData = []; //contains the actual data of the left part of the rubberband
    let rubberRightData = []; //contains the actual data of the right part of the rubberband
    let rubberLeftPath = undefined; //pointer to the drawn path
    let rubberRightPath = undefined; //"" ""
    let lastUVScroll = 0; //denotes how far the upper view, i.e. view0, was scrolled down
    let lastOVScroll = 0; //denotes how far the bottom view, i.e. view1, was scrolled down
    let mouseX = 0; //y coordinate of mouse while separator field is dragged
    let mouseY = 0;
    let bandColor = bandID === "1" ? "blue" : "orange";

    //remove existing rubberband container
    if ($("#" + containerID) != undefined) {
      $("#" + containerID).remove();
    }

    if (bandID === "1") {
      container = $("<div id=" + containerID + "></div>").insertAfter(predec); //create a new container
      container.append(
        '<div id="rubberBand' + bandID + '" class="unset">' + "</div>"
      );
      container.append(
        '<div id="band' +
          bandID +
          'Distance" class="invisible"' +
          "<p></p>" +
          "</div>"
      );
      container.width(rubberWidth);
      container.height(rubberHeight);
    } else {
      container2 = $("<div id=" + containerID + "></div>").insertAfter(predec); //create a new container
      container2.append(
        '<div id="rubberBand' + bandID + '" class="unset">' + "</div>"
      );
      container2.append(
        '<div id="band' +
          bandID +
          'Distance" class="invisible"' +
          "<p></p>" +
          "</div>"
      );
      container2.height(rubberHeight);
      container2.width(rubberWidth);
    }
    // container.mouseup(function(e) {
    //   //Needed for split on mouse position
    //   mouseX = e.pageX;
    //   mouseY = e.pageY;
    // });

    d3.select("#rubberBand" + bandID)
      .append("svg")
      .attr("id", "svg" + bandID)
      .attr("width", rubberWidth)
      .attr("height", rubberHeight);
    // $("#rubberBand1").draggable({
    //   axis: "y",
    //   revert: "invalid",
    //   drag: function(e) {
    //     //HARD CODED BACKLAYER
    //     d3.select("#tool")
    //       .select("#orientationLine")
    //       .remove();
    //     var y = e.pageY;
    //     d3.select("#tool")
    //       .append("line")
    //       .attr("id", "orientationLine")
    //       .attr("x1", container.offset().left)
    //       .attr("y1", y)
    //       .attr("x2", container.offset().left + container.width())
    //       .attr("y2", y)
    //       .style("stroke", "red")
    //       .style("stroke-width", 4)
    //       .style("stroke-dasharray", 8);
    //   }
    // });

    $("#rubberBand" + bandID).droppable({
      disabled: true,
    });
    $("#band" + bandID + "Area").droppable({
      // accept: "#rubberBand1"
      disabled: true,
    });

    if (bandForm == true) {
      for (let i = 0; i <= rubberHeight; i += y_scaling) {
        rubberLeftData.push({ x: rubberLeftFix, y: i });
        rubberRightData.push({ x: rubberRightFix, y: i });
      }
    } else {
      for (let i = 0; i <= rubberHeight; i += y_scaling) {
        if (i <= rubberHeight / 2) {
          rubberLeftData.push({ x: rubberLeftFix, y: i });
          rubberRightData.push({ x: rubberRightFix, y: i });
          rubberLeftFix += x_scaling;
          rubberRightFix -= x_scaling;
        } else {
          rubberLeftFix -= x_scaling;
          rubberRightFix += x_scaling;
          rubberLeftData.push({ x: rubberLeftFix, y: i });
          rubberRightData.push({ x: rubberRightFix, y: i });
        }
      }
    }

    rubberLeftPath = d3
      .select("#svg" + bandID)
      .append("path")
      .attr("d", rubberBandFunction(rubberLeftData))
      .attr("stroke", bandColor)
      .attr("stroke-width", 12)
      .attr("fill", "none");

    rubberRightPath = d3
      .select("#svg" + bandID)
      .append("path")
      .attr("d", rubberBandFunction(rubberRightData))
      .attr("stroke", bandColor)
      .attr("stroke-width", 12)
      .attr("fill", "none");
    return {
      getHeight: function () {
        return rubberHeight;
      },

      getForm: function () {
        return bandForm;
      },

      getMouseX: function () {
        return mouseX;
      },

      getMouseY: function () {
        return mouseY;
      },

      getUVScroll: function () {
        return lastUVScroll;
      },

      getOVScroll: function () {
        return lastOVScroll;
      },

      setUVScroll: function (update) {
        lastUVScroll = update;
      },

      setOVScroll: function (update) {
        lastOVScroll = update;
      },

      showDistance: function (distance) {
        $("#band" + bandID + "Distance > p").text(distance);
        $("#band" + bandID + "Distance")
          .addClass("visible")
          .removeClass("invisible");
        clearTimeout($.data(this, "scrollTimer"));
        $.data(
          this,
          "scrollTimer",
          setTimeout(function () {
            $("#band" + bandID + "Distance")
              .addClass("invisible")
              .removeClass("visible");
          }, 2500)
        );
      },

      /**
       * this function is called everytime one of the views is scrolled
       * given the current distance between both bigSplit views and the amount of words in the currently scrolled view,
       * the rubberband form is updated, i.e. it is rounded accordingly
       * @param {number} distance - current distance between view0 and view0 as number of hidden words
       * @param {number} wC - current word count in the particular view
       */
      adjustBandInward1: function (distance, wC, viewWidth) {
        let wordScaling;
        /* if (wC != undefined) {
                    wordScaling = distance / wC; //prozentsatz wie viele der max. möglichen wörter verdeckt - TO DO: Für individuelle Ansichten bestimmen
                } else {
                    wordScaling = distance / wordCount; //prozentsatz wie viele der max. möglichen wörter verdeckt - TO DO: Für individuelle Ansichten bestimmen
                } */
        wordScaling = distance / wC;
        rubberLeftData = [];
        rubberRightData = [];
        /**
         * if a certain lower bound is met, i.e. the distance between both views is miniscule,
         * set maximal rounding of both parts of the rubberband
         */
        if (wordScaling <= 0.01) {
          //TO DO: find a better lower bound
          for (let i = 0; i <= rubberHeight; i += y_scaling) {
            rubberLeftData.push({ x: rubberLeftFix, y: i });
            rubberRightData.push({ x: rubberRightFix, y: i });
          }
        } else {
          let scaling = (viewWidth / 2.0) * wordScaling; //Anzahl der Pixel die Band nach innen gedehnt werden muss
          let jumps = rubberHeight / (2.0 * (y_scaling + 10)); //Anzahl Iterationen innerhalb Schleife, in denen band nach innen gedehnt wird + 10 HACK
          scaling = scaling / jumps; //y wird 6 mal inkrementiert, in jeder runde soll band um scaling/6 nach innen gedehnt werden, sodass am Ende Dehnung um scaling

          /**
           * round rubberbands according to distance by 'moving' each consecutive point of the respective path a little bit more inward
           */
          rubberLeftFix = 0;
          for (let i = 0; i <= rubberHeight; i += y_scaling) {
            if (i <= rubberHeight / 2) {
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
              /* rubberLeftFix = Math.min(725, rubberLeftFix + scaling);
                            rubberRightFix = Math.max(725, rubberRightFix - scaling); */
              rubberLeftFix += scaling;
              rubberRightFix -= scaling;
            } else {
              rubberLeftFix -= scaling;
              rubberRightFix += scaling;
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
            }
          }
        }

        rubberLeftPath
          .transition()
          .duration(1200)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberLeftData));
        rubberRightPath
          .transition()
          .duration(1200)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberRightData));
      },

      //HOTFIX: JUST DO NOTHING
      adjustBandInward: function (distance, wC, viewWidth) {
        for (let i = 0; i <= rubberHeight; i += y_scaling) {
          rubberLeftData.push({ x: rubberLeftFix, y: i });
          rubberRightData.push({ x: rubberRightFix, y: i });
        }
        rubberLeftPath
          .transition()
          .duration(1200)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberLeftData));
        rubberRightPath
          .transition()
          .duration(1200)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberRightData));
      },

      /**
       * this function is called everytime one of the views is scrolled
       * given the current distance between both bigSplit views and the amount of words in the currently scrolled view,
       * the rubberband form is updated, i.e. it is rounded accordingly
       * @param {number} distance - current distance between view0 and view0 as number of hidden words
       * @param {number} wC - current word count in the particular view
       */
      adjustBandStraight: function (distance, wC, viewWidth) {
        let wordScaling;
        /* if (wC != undefined) {
                    wordScaling = distance / wC;
                } else {
                    wordScaling = distance / wordCount;
                } */
        wordScaling = distance / wC;
        wordScaling = distance / wordCount;
        let scaling = (viewWidth / 2.0) * wordScaling;
        let jumps = rubberHeight / (2.0 * (y_scaling + 12.5));
        scaling = scaling / jumps;

        if (wordScaling <= 0.01) {
          rubberLeftData = [];
          rubberRightData = [];
          scaling = viewWidth / 4.0;
          for (let i = 0; i <= rubberHeight; i += y_scaling) {
            if (i <= band.rubberHeight / 2) {
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
              rubberLeftFix += scaling;
              rubberRightFix -= scaling;
            } else {
              rubberLeftFix -= scaling;
              rubberRightFix += scaling;
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
            }
          }
        } else if (wordScaling >= 0.95) {
          for (let i = 0; i < rubberLeftData.length; i++) {
            rubberLeftData[i].x = rubberLeftFix;
            rubberRightData[i].x = rubberRightFix;
          }
        } else {
          rubberLeftData = [];
          rubberRightData = [];
          let continuosIncrement = viewWidth / 4.0 - scaling;
          for (let i = 0; i <= rubberHeight; i += y_scaling) {
            if (i <= rubberHeight / 2) {
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
              rubberLeftFix += continuosIncrement;
              rubberRightFix -= continuosIncrement;
            } else {
              rubberLeftFix -= continuosIncrement;
              rubberRightFix += continuosIncrement;
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
            }
          }
        }

        rubberLeftPath
          .transition()
          .duration(1200)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberLeftData));
        rubberRightPath
          .transition()
          .duration(1200)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberRightData));
      },

      /**
       * displays distance approx. in the middle of the seperator
       * @param {number} distance - current distance
       */
      displayDistance: function (distance) {
        $("#band" + bandID + "Distance > p").text(distance);
        $("#band" + bandID + "Distance")
          .addClass("visible")
          .removeClass("invisible");
      },

      /**
       * hides the displayed distance
       */
      hideDistance: function () {
        $("#band" + bandID + "Distance")
          .addClass("invisible")
          .removeClass("visible");
      },

      /**
       * caller when inverter-button is pressed
       */
      invertBand: function () {
        bandForm = !bandForm;
        changeForm();
      },

      /**
       * change form and behaviour of rubberband
       * default: straight when relaxed, round with growing distance
       */
      changeForm: function () {
        if (bandForm == true) {
          rubberLeftData = [];
          rubberRightData = [];
          for (var i = 0; i <= rubberHeight; i += y_scaling) {
            rubberLeftData.push({ x: rubberLeftFix, y: i });
            rubberRightData.push({ x: rubberRightFix, y: i });
          }
        } else {
          rubberLeftData = [];
          rubberRightData = [];
          let scaling = view0.getWidth() / 4.0;
          for (var i = 0; i <= rubberHeight; i += y_scaling) {
            if (i <= rubberHeight / 2) {
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
              rubberLeftFix += scaling;
              rubberRightFix -= scaling;
            } else {
              rubberLeftFix -= scaling;
              rubberRightFix += scaling;
              rubberLeftData.push({ x: rubberLeftFix, y: i });
              rubberRightData.push({ x: rubberRightFix, y: i });
            }
          }
        }
        rubberLeftPath
          .transition()
          .duration(2500)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberLeftData));
        rubberRightPath
          .transition()
          .duration(2500)
          .ease(d3.easeElastic)
          .attr("d", rubberBandFunction(rubberRightData));
      },

      /**
       * reset the rubberband and place it below the text view
       */
      resetBand: function () {
        container.remove();
        return bandInstance.getInstance();
        //PLACE BELOW view0
      },

      removeBand: function () {
        console.log(container);
        console.log(container2);
        if (bandID === "1") {
          container.remove();
        } else {
          container2.remove();
        }
      },
    };
  }

  return {
    getInstance: function (predec, containerID, bandID, form = true) {
      var newInstance = init(predec, containerID, bandID, form);
      //let instance = newInstance;
      return newInstance;
    },
  };
})();

/**
 * function used to draw the rubberband svg-path
 */
var rubberBandFunction = d3
  .line()
  .x(function (d) {
    return d.x;
  })
  .y(function (d) {
    return d.y;
  })
  .curve(d3.curveBasis);
