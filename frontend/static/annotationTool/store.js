/**
 * The annotation store holding all relevant annotation information:
 * - Annotation objects are stored in the annotations array
 * - The annotation look-up table stores for each annotation ID the position of the annotation in the array.
 * - The tags array holds all globally available tags.
 * - numAnnotations keeps track of the number of annotations.
 */
const store = {
  annotations: [],
  annotationIDLookUp: {},
  tags: ["test", "test2"],
  numAnnotations: 0,
};

/**
 * [Not implemented yet]
 * The necessary store types to distinguish between annotation and relation objects in the store.
 */
const storeTypes = {
  ANNOTATION: "ANNOTATION",
  RELATION: "RELATIONS",
};

/**
 * A continuous color scale to assign colors to tags.
 */
const colorScale = d3.scaleOrdinal(d3.schemeAccent);

const assignColor = (number) => {
  return colorScale(number);
};

/**
 * Generate a ID for a newly created annotation.
 * The ID is generated from the annotation count to assure unique IDs.
 * @returns generated annotation ID
 */
const generateID = () => {
  const nextNum = store.numAnnotations + 1;
  const newID = "annotatedSpan" + nextNum;
  return newID;
};

/**
 * Utility function to forward the annotation store.
 * @param {Object} newStore
 */
const getStore = () => {
  return store;
};

/**
 * Utility function to load/set a pre-existing annotation store.
 * @param {Object} newStore
 */
const setStore = (newStore) => {
  Object.assign(store, newStore);
};

/**
 * Adds a new annotation to the store.
 * The store update is done immutabely,
 * first copying the existing store, appending the new annotation to the copy
 * and finally setting the copy as the updated, new store.
 * @param {storeType} type
 * @param {annotation} data
 */
const addToStore = (type, data) => {
  if (type === storeTypes.ANNOTATION) {
    //update ID lookup-table
    const len = store.annotations.length;
    store.annotationIDLookUp[data.id] = len;

    //immutable update set up
    const newStore = [...store.annotations, data];

    //replace for now, TO DO: save history
    store.annotations = newStore;
    store.numAnnotations += 1;
  }
  //console.log(store);
};

/**
 * Updates an existing annotation in the store.
 * The store update is done immutabely,
 * first copying the existing store, setting the updated annotation
 * and finally setting the copy as the updated, new store.
 * @param {storeType} type
 * @param {String} ID
 * @param {annotation} data
 */
const updateStore = (type, ID, data) => {
  if (type === storeTypes.ANNOTATION) {
    let pointer = store.annotationIDLookUp[ID];

    //immutable update
    let newStore = store.annotations.slice();
    newStore[pointer] = data;
    store.annotations = newStore;
  }
  //console.log(store);
};

/**
 * Removes an existing annotation from the store.
 * The store update is done immutabely,
 * first copying the existing store, removing the annotation
 * and finally setting the copy as the updated, new store.
 * @param {storeType} type
 * @param {String} ID
 */
const removeFromStore = (type, ID) => {
  if (type === storeTypes.ANNOTATION) {
    //immutable update
    let newStore = store.annotations.filter((annotation) => {
      if (annotation.id !== ID) {
        return annotation;
      }
    });
    store.annotations = newStore;

    //pointer array update
    let newPointers = {};
    store.annotations.forEach((annotation, i) => {
      newPointers[annotation.id] = i;
    });
    store.annotationIDLookUp = newPointers;
    store.numAnnotations -= 1;
  }
  //console.log(store);
};

/**
 * Returns the annotation for a given ID.
 * @param {String} id
 * @returns the annotation object
 */
const getAnnotationData = (id) => {
  const lookUpID = store.annotationIDLookUp[id];
  const annotation = store.annotations[lookUpID];
  return annotation;
};

/**
 *
 * @returns Globally available set of tags.
 */
const getGlobalTags = () => {
  return store.tags;
};

/**
 *
 * @param {String} tag
 * @returns Appropriate color for a given tag.
 */
const getTagColor = (tag) => {
  const pos = store.tags.indexOf(tag);
  if (pos !== -1) {
    return assignColor(pos);
  }
  return "gray";
};

/**
 *
 * @param {String} tag
 * @returns Boolean assessment of whether the given tag exists.
 */
const doesGlobalTagExist = (tag) => {
  return store.tags.indexOf(tag) === -1;
};

/**
 * Add a new tag to the set of globally available tags.
 * @param {String} newTag
 */
const addGlobalTag = (newTag) => {
  if (store.tags.indexOf(newTag) === -1) {
    const newTagSet = [...store.tags, newTag];
    store.tags = newTagSet;
  }
  //console.log(store.tags);
};

/**
 * Remove a tag from the globally available tags.
 * Updates all affected annotations containing the tag.
 * @param {String} oldTag
 */
const removeGlobalTag = (oldTag) => {
  const newTagSet = [...store.tags];
  const pos = newTagSet.tags.indexOf(oldTag);
  if (pos !== -1) {
    newTagSet.splice(pos, 1);
  }
  store.tags = newTagSet;

  const annotationsToUpdate = [];
  store.annotations.forEach((annotation) => {
    if (annotation.tags.indexOf(oldTag) !== -1) {
      annotationsToUpdate.push(annotation);
    }
  });
  annotationsToUpdate.forEach((annotation) => {
    const updatedTags = annotation.tags;
    updatedTags.splice(updatedTags.indexOf(oldTag), 1);
    const newAnnotation = {
      ...annotation,
      tags: updatedTags,
    };
    updateStore(storeTypes.ANNOTATION, newAnnotation);
  });
};

export {
  store,
  storeTypes,
  generateID,
  getStore,
  setStore,
  addToStore,
  updateStore,
  removeFromStore,
  getAnnotationData,
  getGlobalTags,
  addGlobalTag,
  removeGlobalTag,
  doesGlobalTagExist,
  getTagColor,
};
