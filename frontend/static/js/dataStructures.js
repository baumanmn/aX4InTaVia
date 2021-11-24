/**
 * Key: id of overview
 * Value:
 *  - num_active: how many brushes are rendered
 *  - active: id of active brush
 */
const activeDict = {
  0: {
    num_rend: 2,
    active: 1,
  },
  //...
};

/**
 * Key: id of brush
 *  - format: idOfRootOverview_idOfRoot+1Overview_..._idOfBrush
 * Value:
 *  - rendered: flag set to true if brush is rendered
 *  - overlay: overlay range
 *  - selection: selection range
 */
const stateDict = {
  0: {
    rendered: true,
    overlay: [0, 1000],
    selection: [0, 1000],
  },
  //...
  "0_2_1": {
    rendered: true,
    overlay: [0, 1000],
    selection: [0, 1000],
  },
};

const linkDict = {
  0: {
    parent: null,
    siblings: ["1", "2"],
    children: ["0_1", "0_2", "0_3"],
  },
};

/**
 * Value: id of brush
 *  - format: idOfRootOverview_idOfRoot+1Overview_..._idOfBrush
 * Key:
 */
const indicatorDict = {
  0: {
    child_ids: ["0_0", "0_1", "0_2"],
  },
};
