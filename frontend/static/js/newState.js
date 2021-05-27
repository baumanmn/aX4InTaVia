/**
 * Encapsulator for a brush object.
 * An instance of this class creates and holds reference to a d3-brush and provides an interface to interactively change properties and behaviour of the d3-brush. Every instance of a brush is coupled to an instance of Overview, where the Overview-Instance holds reference to the SVG-canvas, where the d3-brush lives.
 */
class Brush {
  constructor(id, group, brushData) {
    this.id = id;
    this.height = brushData.height;
    this.width = brushData.width;
    this.leftOverlayBorder = brushData.left;
    this.rightOverlayBorder = brushData.right;
    this.leftSelectionBorder = brushData.left;
    this.rightSelectionBorder = brushData.right;

    this.group = null; //overviewBrush
    this.brush = null; //brush

    this.activeClass = null;
    this.inactiveClass = null;
    this.storedRanges = [];

    this.createBrush(group);
  }

  createBrush(group) {
    this.group = group;

    this.group
      .append("svg")
      .attr("class", "indicatorSVG")
      .attr("width", this.width)
      .attr("height", this.height);

    this.group
      .call(this.brush)
      .call(this.brush.move, [
        this.leftSelectionBorder,
        this.rightSelectionBorder,
      ]);

    this.group.selectAll(".handle").attr("cursor", "ns-resize"); //for portrait mode

    this.brush = d3
      .brushX()
      .extent([
        [this.leftOverlayBorder, 0],
        [this.rightOverlayBorder, this.height],
      ])
      .on("start", function () {
        start();
      })
      .on("brush", function () {
        brush();
      })
      .on("end", function () {
        end();
      });
  }

  setWidth(width) {
    this.width = width;
  }

  setHeight(height) {
    this.height = height;
  }

  setOverlayRange(leftOverlayBorder, rightOverlayBorder, update = false) {
    this.leftOverlayBorder = leftOverlayBorder;
    this.rightOverlayBorder = rightOverlayBorder;

    if (update === true) {
      this.group.select(".overlay").attr("x", this.leftOverlayBorder);
      this.group.select(".overlay").attr("width", this.rightOverlayBorder);
    }

    if (this.leftOverlayBorder > this.leftSelectionBorder) {
      setSelectionRange(
        this.leftOverlayBorder,
        this.rightSelectionBorder,
        true
      );
    }
    if (this.rightOverlayBorder < this.rightSelectionBorder) {
      setSelectionRange(
        this.leftSelectionBorder,
        this.rightOverlayBorder,
        true
      );
    }
    if (update === true) {
      if (update === true) {
        this.group.select(".overlay").attr("x", this.leftOverlayBorder);
        this.group.select(".overlay").attr("width", this.rightOverlayBorder);
      }
    }
  }

  setSelectionRange(leftSelectionBorder, rightSelectionBorder, update = false) {
    this.leftSelectionBorder = leftSelectionBorder;
    this.rightSelectionBorder = rightSelectionBorder;

    if (update === true) {
      if (update === true) {
        this.group.select(".selection").attr("x", this.leftSelectionBorder);
        this.group
          .select(".selection")
          .attr("width", this.rightSelectionBorder);
      }
    }
  }

  setActivationClass(active = null, inactive = null) {
    if (active != null) {
      this.activeClass = active;
    }
    if (inactivd != null) {
      this.inactiveClass = inactive;
    }
  }

  activate() {
    this.group.attr("class", this.activeClass);
  }

  inactive() {
    this.group.attr("class", this.inactiveClass);
  }

  remove() {
    this.SVG.select("#" + id).remove();
  }

  assigneView(viewID) {
    this.assignedView = viewID;
  }

  computeSnap(chart, x0, x1) {
    var xStart,
      res = { id: [], pos: [] };

    if (
      chart.modeOverview === "aggregated" ||
      chart.modeOverview === "semiAggregated"
    ) {
      var w = chart.p.tokenExt,
        n = chart.d.overviewIds.length,
        firstId = chart.d.overviewIds[0];

      //find left snap-element
      res.id[0] = firstId + Math.floor((x0 * n) / w);
      res.pos[0] = (Math.floor((x0 * n) / w) * w) / n;

      //find right snap-element
      res.id[1] = firstId + Math.ceil((x1 * n) / w) - 1;
      res.pos[1] = (Math.ceil((x1 * n) / w) * w) / n;
    }
    if (chart.modeOverview === "atomic") {
      xStart = chart.d.overviewXValues.map(function (xPos) {
        return xPos.begin;
      });
      //find left snap-element
      for (var i = xStart.length - 1; i >= 0; i -= 1) {
        if (x0 >= xStart[i]) {
          res.id[0] = chart.d.overviewIds[i];
          res.pos[0] = xStart[i];
          break;
        }
      }
      //find right snap-element
      for (var j = xStart.length - 1; i >= 0; j -= 1) {
        if (x1 > xStart[j]) {
          res.id[1] = chart.d.overviewIds[j];
          res.pos[1] = xStart[j] + chart.d.overviewXValues[j].inc;
          break;
        }
      }
    }

    //the case when x0=x1=xStart[i] for some i
    if (res.id[0] > res.id[1]) res = [res[1], res[0]];

    return res;
  }

  centerMousedown() {
    let e = d3.scaleDivergingSqrt;
    let left = this.leftOverlayBorder;
    let right = this.rightOverlayBorder;

    if (e.which === 1) {
      e.stopPropagation();
      e.preventDefault();
      var lastX = d3.mouse(this.group.node())[0],
        w = d3.select(window),
        moved = false;
      w.on("mousemove", mousemove).on("mouseup", mouseup);
    }

    function mousemove() {
      moved = true;
      var e = d3.event;
      var newX = d3.mouse(this.group.node())[0];
      e.stopPropagation();
      e.preventDefault();

      if (lastX < newX)
        this.brush.move(this.group, [lastX, Math.min(newX, right)]);
      else this.brush.move(this.group, [Math.max(newX, left), lastX]);
    }

    function mouseup() {
      d3.event.stopPropagation();
      if (!moved) centerbrush();
      else {
        var newX = d3.mouse(this.group.node())[0];
        if (lastX < newX)
          this.brush.move(this.group, [lastX, Math.min(newX, right)]);
        else this.brush.move(this.group, [Math.max(newX, left), lastX]);
      }
      w.on("mouseup", null).on("mousemove", null);

      function centerbrush() {
        var sel = d3.brushSelection(this.group.node()),
          target = d3.event.target,
          s = sel[1] - sel[0],
          y0 = s / 2,
          y1 = chart.p.tokenExt - s / 2, //CHANGE chart.p.tokenExt TO RIGHT HERE?
          center = Math.max(y0, Math.min(y1, d3.mouse(target)[0]));

        //move the brush-selection; at this, a brush- and end- event will be fired
        //(and the selection snapped); sourceEvent is "mouseup"
        this.brush.move(this.group, [center - s / 2, center + s / 2]);
      }
    }
  }

  brushMove(chart) {
    //ignore brush-events fired by brush.move() (zoomEnd or brushEnd)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

    //ignore brush-events fired by brush.move() (zoomMove)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

    //the default brush-selection is [0, width]
    var selection = d3.event.selection || [0, chart.p.tokenExt];

    //ID of the first and last token/bin cut by the brush-selection (overview)
    var selectionRange = computeSnap(chart, selection[0], selection[1]).id;
    udateDetailBars(chart, selectionRange);
  }

  brushEnd(chart) {
    //ignore brush-events fired by brush.move() (zoomEnd or brushEnd)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

    //ignore brush-events fired by brush.move() (zoomMove)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

    //ignore brush-events fired by centerMousedowsn -> mousemove
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "mousemove")
      return;

    //the default brush-selection is [0, width]
    var selection = d3.event.selection || [0, chart.p.tokenExt];

    //the snap-borders in the brush selection (overview)
    var snapPos = computeSnap(chart, selection[0], selection[1]).pos;

    //adjust zoom-transform to the snapped selection
    var newTransform = d3.zoomIdentity
      .translate(
        (-chart.p.tokenExt * snapPos[0]) / (snapPos[1] - snapPos[0]),
        0
      )
      .scale(chart.p.tokenExt / (snapPos[1] - snapPos[0]));

    this.group.call(d3.event.target.move, snapPos);

    chart.detail.call(chart.zoom.transform, newTransform); //TO DO

    //chartClickFix();
    //updateEvents();
    autoScrollTextArea();
    deleteAllIndicators(); //HM for escaping hover bugs during the brash process

    propagateUpdate(); // TO DO
    this.setSelectionRange(snapPos[0], snapPos[1]); //Absolute value for rightEnd or diff?
  }

  brushEndOnClick(chart) {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

    //ignore brush-events fired by brush.move() (zoomMove)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;

    //ignore brush-events fired by centerMousedowsn -> mousemove
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "mousemove")
      return;

    var overviewRange = computeSnap(
      chart,
      this.leftSelectionBorder,
      this.rightSelectionBorder
    ).id;

    udateDetailBars(chart, overviewRange);
  }

  installZoom(chart) {
    chart.zoom = d3
      .zoom()
      .scaleExtent([1, Infinity]) //no downsizing
      .translateExtent([
        [0, 0],
        [chart.p.tokenExt, chart.p.annotatorExt],
      ]) //panning only within detail-window
      //.extent([[0, 0], [brushM, chart.p.annotatorExt]])
      .extent([
        [0, 0],
        [chart.p.tokenExt, chart.p.annotatorExt],
      ]) //viewport = detail-window
      .filter(function () {
        //ignore right-clicks on the zoom-area
        return !d3.event.button;
      })
      .on("start", function () {
        // HM
        tornOFEvents(); //HM
      })
      .on("zoom", function () {
        zoomMove(chart);
      })
      .on("end", function () {
        zoomEnd(chart);
      });
  }

  zoomMove(chart) {
    // ignore zoom-events fired by zoom.transform() (brushEnd or ZoomEnd)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

    //the actual zoom-transform
    var t = d3.event.transform;

    var left = this.leftOverlayBorder;
    var right = this.rightOverlayBorder;

    //ID of the first and last token/bin in the transformed area (detail)
    var r = [0, chart.p.tokenExt].map(t.invertX, t).map(function (r, i) {
      return i === 0 ? Math.max(r, left) : Math.min(r, right);
    });

    var overviewRange = computeSnap(chart, r[0], r[1]).id; //ids where the brush should snap to

    //draw the detail-tokens/bins with IDs in range

    udateDetailBars(chart, overviewRange);

    //adjust the brush to the overview-tokens/bins (unsnapped)
    this.group.call(this.brush.move, r);
    // updateFilters(); //HM
  }

  zoomEnd(chart) {
    // ignore zoom-events fired by zoom.transform() (brushEnd or ZoomEnd)
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

    //the actual zoom-transform
    var t = d3.event.transform;
    var left = this.leftOverlayBorder;
    var right = this.rightOverlayBorder;

    //ID of the first and last token/bin in the transformed area (detail)
    var r = [0, chart.p.tokenExt].map(t.invertX, t).map(function (r, i) {
      return i === 0 ? Math.max(r, left) : Math.min(r, right);
    });

    //the snap-borders
    var snapPos = computeSnap(chart, r[0], r[1]).pos;

    //adjust the zoom-transform to the snapped selection
    var newTrans = d3.zoomIdentity
      .translate(
        (-chart.p.tokenExt * snapPos[0]) / (snapPos[1] - snapPos[0]),
        0
      )
      .scale(chart.p.tokenExt / (snapPos[1] - snapPos[0]));
    //
    chart.detail.call(d3.event.target.transform, newTrans);

    //adjust the brush to the overview-tokens/bins (snapped)
    this.group.call(this.brush.move, snapPos);

    //chartClickFix();

    updateTextArea(chart);

    //updateEvents();
    autoScrollTextArea(false);
    deleteAllIndicators(); //HM for escaping hover bugs during the zoom process
  }

  quickZoom(chart) {
    var xMouse = d3.mouse(chart.detail)[0],
      unitId; //id of the bin or token at xMouse
    if (chart.modeOverview === "atomic") {
      var xStart = chart.d.overviewXValues.map(function (xPos) {
        return xPos.begin;
      });

      for (var i = xStart.length - 1; i >= 0; i -= 1) {
        if (xMouse >= xStart[i]) {
          unitId = chart.d.overviewIds[i];
          break;
        }
      }
    } else {
      var firstId = chart.d.overviewIds[0],
        w = chart.p.tokenExt,
        n = chart.d.overviewIds.length;
      unitId = firstId + Math.floor((xMouse * n) / w);
    }

    //adjust the brush to the atomic-window (snapped)
    this.group.call(this.brush.move, atomWin);
  }

  freeze() {
    this.storedRanges = {
      overlay: [this.leftOverlayBorder, this.rightOverlayBorder],
      selection: [this.leftSelectionBorder, this.rightSelectionBorder],
    };
    this.group.remove();
    this.brush.remove();
  }

  unfreeze(group) {
    this.createBrush(group);

    let overlayRange = this.storedRanges["overlay"];
    let selectionRange = this.storedRanges["selection"];
    this.setOverlayRange(overlayRange[0], overlayRange[1], true);
    this.setSelectionRange(selectionRange[0], selectionRange[1], true);
  }

  start() {
    tornOFEvents();
  }

  brush() {
    brushMove(chart);
  }

  end() {
    //
  }

  click() {
    //
  }

  propagateUpdate() {
    //
  }
}

/**
 * A level 0 Brush specific to a root-level Overview.
 * Inherits from the Brush class.
 */
class Level0Brush extends Brush {
  constructor(/** */) {
    super(/** */);
  }

  end() {
    if (currentlyActiveBrush === id) {
      setActiveOverview(chart, id);
      $(function () {
        setActiveOverview(
          chart,
          stateEncoder[stateEncoder.parentActive].children.childActive,
          2
        ); //to do
      });
    }
  }

  click() {
    this.brushEndOnClick(chart);
  }

  propagateUpdate() {}
}

/**
 * A level 1 Brush specific to a direct child-Overview of a root-level Overview.
 * Inherits from the Brush class.
 */
class Level1Brush extends Brush {
  constructor(/** */) {
    super(/** */);
  }

  end() {
    this.brushEnd(chart);
    if (stateEncoder[stateEncoder.parentActive].children.childActive === id) {
      setActiveOverview(chart, id, 2); //2 because it sets the second level overview (starting from zero)
    }
  }

  click() {
    this.brushEndOnClick(chart);
  }

  propagateUpdate() {}
}

/**
 * A level 2 Brush specific to a direct grandChild-Overview of a root-level Overview.
 * Inherits from the Brush class.
 */
class Level2Brush extends Brush {
  constructor(/** */) {
    super(/** */);
  }

  end() {
    this.brushEnd(chart);
  }

  click() {
    setBrushStateActiveInOverview(id, 2);
  }

  propagateUpdate() {}
}

/**
 * Encapsulator for an Overview object.
 * An instance of Overview creates and holds reference to an SVG-canvas functioning as an Overview.
 * Every Overview instance is assigned a level within a Overview-tree.
 * The Overview-tree is managed by the a main OverviewConfigurator instance.
 * An Overview instance also hold reference to Brush instances living within this Overview and automatically handle interactions between brushes.
 * Multiple Brush instances can be linked to a singular Overview-instance.
 */
class Overview {
  constructor(chart, id, level, width, height, maxBrushesNumber) {
    this.overview = chart.svg
      .append("g") //the overview window (with clip path) moved for margin
      .attr("id", id)
      .attr(
        "transform"
        //TO DO
      );

    this.level = level;
    this.width = width;
    this.height = height;
    this.maxBrushesNumber = maxBrushesNumber;

    this.background = null;
    this.overviewRects = null;
    this.sliderSVG = null;

    this.brushGroups = {};
    this.reverseMapping = {};
    this.activeGroup = null;
    this.numGroups = 0;

    this.brushes = {};
    this.offetArray = []; //remember order of brushes
    this.activeBrush = null;
    this.numBrushes = 0;

    this.sliders = []; //orderded according to creation order: slider i will be to the left of i+1
    this.numSliders = 0;

    this.brushDefaultWidth = null;
    this.brushDefaultHeight = null;

    this.addBackgroundRects();
    this.addOverviewRectGroup();
    this.addSliderSVG();
    this.addToBrushGroup();
    //this.appendBrush(); //!important: before slider
  }

  addBackgroundRects() {
    this.background = this.overview
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", this.width)
      .attr("height", this.height);
  }

  addOverviewRectGroup() {
    this.overviewRects = this.overview.append("g");
  }

  addSliderSVG() {
    this.sliderSVG = this.overview
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);
  }

  /**
   * Create and append a new brush to the overview.
   *
   * @returns the newly created brush object
   */
  createBrushGroup() {
    let groupID = this.id + "_group_" + String(this.numGroups);

    this.numGroups += 1;

    let newBrush = this.appendBrush(
      (brushData = {
        width: null,
        height: null,
        left: null,
        right: null,
      })
    );
    let newSlider = this.addSlider();

    this.brushGroups[groupID] = {
      brushes: [newBrush.id],
      sliders: [newSlider.id],
    };

    return newBrush;
  }

  addToBrushGroup(groupID, splitPos) {
    if (this.brushGroups[groupID]["brushes"].length === this.maxBrushesNumber) {
      return alert(
        "Maximum number of Brushes (" + this.maxBrushesNumber + ") created"
      );
    }
    let newBrush = this.appendBrush(
      (brushData = {
        width: null,
        height: null,
        left: splitPos,
        right: null,
      })
    );
    let newSlider = this.addSlider();
    this.brushGroups[groupID]["brushes"].push(newBrush.id);

    this.reverseMapping[newBrush.id] = groupID;

    currentGroup["sliders"].push(newSlider.id);
  }

  appendBrush(brushData) {
    let newBrushID = this.id + "Brush" + String(this.numBrushes);

    if (brushData.width === null) brushData.width = this.brushDefaultWidth;
    if (brushData.height === null) brushData.height = this.brushDefaultHeight;
    if (brushData.left === null) brushData.left = 0;
    if (brushData.right === null) brushData.right = this.width;

    let newBrushGroup = this.overview
      .append("g")
      .attr("id", newBrushID)
      .on("click", function () {
        newBrush.click();
      });

    let newBrush = new Brush(newBrushID, newBrushGroup, brushData);

    //does this work? Is the Brush Reference up-to-date
    this.brushes[brushID] = newBrush;
    this.offetArray.push(brushID);

    this.numBrushes += 1;

    return newBrush;
  }

  //function is called by slider on initial move
  //return newly created brush's id
  splitBrush(splitPos) {
    let nbIndex = this.offetArray[this.offetArray.length - 1];
    this.updateNeighbour(splitPos, nbIndex);
    this.addToBrushGroup(this.reverseMapping[nbIndex], splitPos + 1);
  }

  updateNeighbour(splitPos, nbIndex) {
    if (this.num_brushes > 0) {
      let leftNB = this.brushes[nbIndex];
      leftNB.setOverlayRange(leftNB.leftOverlayBorder, splitPos, true);
    }
  }

  setGroupActive(groupID) {
    if (this.brushGroups[groupID] !== undefined) {
      let currentGroupBrushes = this.brushGroups[groupID]["brushes"];
      for (let i = 0; i < currentGroupBrushes.length; i++) {
        currentGroupBrushes[i].freeze();
      }
      let currentGroupSliders = this.brushGroups[groupID]["sliders"];
      for (let i = 0; i < currentGroupSliders.length; i++) {
        currentGroupSliders[i].remove();
      }
    }
  }

  setGroupInactive(groupID) {}

  switchActiveGroup(groupID) {
    let currentGroup = this.brushGroups[this.activeGroup]["brushes"];
    for (let i = 0; i < currentGroup.length; i++) {
      currentGroup[i].freeze();
    }

    if (this.brushGroups[groupID] !== undefined) {
      currentGroup = this.brushGroups[groupID]["brushes"];
      for (let i = 0; i < currentGroup.length; i++) {
        let brushGroup = this.overview
          .append("g")
          .attr("id", currentGroup[i].id)
          .on("click", function () {
            currentGroup[i].click();
          });
        currentGroup[i].unfreeze(brushGroup);
      }
    }
  }

  setActiveBrush(id) {
    this.setInactiveBrush(this.activeBrush);
    this.brushes[id].activate();
    this.activeBrush = id;
    //do stuff for activation
  }

  setInactiveBrush(id) {
    this.brushes[id].inactive();
  }

  getActiveBrush() {
    return this.brushes[this.activeBrush];
  }

  removeBrush(id) {
    //DO STUFF FOR NEIGHBOUR BRUSHES AND LINKS
    delete this.brushes[id];
    let deleteIndex = this.offetArray.indexOf(id);
    this.offetArray.splice(deleteIndex);
    this.overview.select("#" + id).remove();
    updateNeighbour(this.width, deleteIndex - 1); //update left neighbour after deletion

    this.numBrushes -= 1;
  }

  getLastAdded(idOnly = true) {
    let last = this.offetArray[this.offetArray.length - 1];
    if (idOnly === false) {
      last = this.brushes[last];
    }
    return last;
  }

  addSlider() {
    /** STUFF */
    let newSliderID = this.id + "Slider" + this.numBrushes;
    let newSlider = new Slider(
      this,
      newSliderID,
      this.width,
      this.offetArray[this.offetArray.length - 1]
    );
    this.sliders.push(newSlider);
    return newSlider;
  }

  checkBoundary(slider) {
    for (let i = 0; i < this.sliders.length; i++) {
      if (this.sliders[i].id === slider.id) break;
      if (this.sliders[i].pos >= slider.pos) {
        return true;
      }
    }
    return false;
  }
}

class Slider {
  constructor(
    Overview,
    id,
    initPos,
    boundLeftIdx = null,
    boundRightIdx = null,
    width = null,
    handleWidth = null,
    height = null
  ) {
    this.Overview = Overview;
    this.id = id;
    this.initPos = initPos.x;
    this.x = initPos.x; //slider.pos
    this.y = initPos.y; //slider.y
    this.hasMoved = false;
    this.boundLeft = boundLeftIdx;
    this.boundRight = boundRightIdx;

    this.SVG = null;
    this.obj = null;
    this.bar = null;
    this.posRef = this.x;

    this.width = null;
    this.handleWidth = null;
    this.height = null;
    this.defaultWidth = 2;
    this.defaultHandleWith = 20;
    this.defaultHeight = 40;

    createSlider(width, handleWidth, height);
    dragHandler(this.obj);
  }

  createSlider() {
    if (width === null) width = this.defaultWidth;
    if (handleWidth === null) handleWidth = this.defaultHandleWith;
    if (height === null) height = this.defaultHeight;

    this.SVG = this.Overview.overview
      .append("svg")
      .attr("id", id)
      .attr("width", width)
      .attr("height", height);

    this.obj = this.SVG.append("rect")
      .attr("class", "slider")
      .attr("x", this.x - this.handleWidth / 2)
      .attr("y", this.y)
      .attr("width", this.handleWidth)
      .attr("height", this.height);

    this.bar = this.Overview.overview
      .append("rect")
      .attr("x", this.x)
      .attr("y", 0)
      .attr("width", this.width)
      .attr("height", this.y); //overviewHeight (looks wrong, but correct)

    return this;
  }

  setLeftBoundIdx(idx) {
    this.boundLeftIdx = idx;
  }

  setRightBoundIdx(idx) {
    this.boundRightIdx = idx;
  }

  dragHandler = d3
    .drag()
    //record change in slider position (needed for calc. new partitioning)
    .on("drag", function (e) {
      this.posRef = this.pos;
      this.x = parseInt(d3.event.x);
      this.setPosition(this.x);
    })
    .on("end", function () {
      //will return true if other slider(s) of overview are in the way
      if (this.Overview.checkBoundary(this) === true) {
        this.x = this.posRef;
      }
      if (this.hasMoved === false) {
        this.Overview.splitBrush(this.x);
        this.boundRightIdx = this.Overview.getLastAdded();
      } else {
        if (this.posRef <= this.x)
          this.Overview.updateNeighbour(this.x, this.boundLeftIdx);
        if (this.posRef > this.x)
          this.Overview.updateNeighbour(this.x, this.boundRightIdx);
      }
      this.setPosition(this.x);
      this.hasMoved = true;
    });

  setPosition(pos) {
    this.obj.attr("x", pos - this.handleWidth / 2);
    this.bar.attr("x", pos);
  }

  remove() {
    this.x = this.initPos;
    this.posRef = this.initPos;
    this.obj.remove();
    this.bar.remove();
    this.hasMoved = false;
  }

  reAppend() {
    this.obj = this.SVG.append("rect")
      .attr("class", "slider")
      .attr("x", this.x - this.handleWidth / 2)
      .attr("y", this.y)
      .attr("width", this.handleWidth)
      .attr("height", this.height);

    this.bar = this.Overview.overview
      .append("rect")
      .attr("x", this.x)
      .attr("y", 0)
      .attr("width", this.width)
      .attr("height", this.y);
  }
}

class Textview {
  constructor(id, viewClass, parentContainer, content) {
    this.textView = null;

    this.id = id;
    this.class = viewClass;
    this.parentContainer = parentContainer;
    this.textSpans = content;
    this.linkedBrush = null;
    this.height = null;

    this.createTextview();
  }

  createTextview() {
    this.textView = this.parentContainer.appendChild(
      document.createElement("div")
    );
    this.textSpans.setAttribute("id", this.id);
    this.textView.setAttribute("class", this.viewClass);

    this.textView.append(this.textSpans);
  }

  removeAndAppend() {
    this.textView.remove();
    this.createTextview();
  }
}

/**
 * An instance of OverviewConfigurator manages the relationships between Overviews of different levels.
 * The OverviewConfigurator creates a tree of Overview-instances and assigns father/child relationships between Overviews.
 * The tree spanned by the OverviewConfigurator begins as a single root-level Overview.
 * Consecutive Overview instances are descendants of the root-level Overview, thus growing a tree of parent/child Overview nodes.
 */
class OverviewConfigurator {
  constructor(maxNumBrushes) {
    this.maxNumBrushes = maxNumBrushes;
    this.numOverviews = 0;
    this.registeredOverviews = {};
    this.parentChildTable = {};
    this.brushOverviewLinkTable = {};

    this.rootOverview = null;
  }

  createOverview(chart, id, level, width, height, parentID = null) {
    //DETERMINE LEVEL
    let newOverview = new Overview(
      chart,
      id,
      level,
      width,
      height,
      this.maxBrushesNumber
    );

    if (this.rootOverview === null) {
      registerRootOverview(newOverview);
      console.log(
        "No root overview exists yet. Current overview has been registered as root."
      );
    } else {
      //DETERMINE PARENT
      registerOverview(newOverview, parentID);
    }

    return newOverview;
  }

  registerRootOverview(rootOverview) {
    this.root = rootOverview;
    this.registeredOverviews[rootOverview.id] = rootOverview;
    this.parentChildTable[rootOverview.id] = [];
    this.numOverviews += 1;
  }

  registerOverview(overview, parentID) {
    this.registeredOverviews[overview.id] = overview;
    this.parentChildTable[parentID].push(overview.id);
    this.parentChildTable[overview.id] = [];
    this.numOverviews += 1;
    this.linkOverviewToBrush(overview.id, parentID);
  }

  linkOverviewToBrush(overviewID, parentID) {
    let linkedBrushOffset = this.registeredOverviews[parentID].getLastAdded();
    this.brushOverviewLinkTable[overviewID] = linkedBrushOffset;
  }
}
