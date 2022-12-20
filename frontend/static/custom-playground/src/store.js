const store = {
  annotations: [],
  annotationIDLookUp: {},
  tags: ["test", "test2"],
  numAnnotations: 0,
};

const storeTypes = {
  ANNOTATION: "ANNOTATION",
  RELATION: "RELATIONS",
};

const colorScale = d3.scaleOrdinal(d3.schemeAccent);

const assignColor = (number) => {
  return colorScale(number);
};

const generateID = () => {
  const nextNum = store.numAnnotations + 1;
  const newID = "annotatedSpan" + nextNum;
  return newID;
};

const setStore = async (newStore) => {
  Object.assign(store, newStore);
};

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
  console.log(store);
};

const updateStore = (type, ID, data) => {
  if (type === storeTypes.ANNOTATION) {
    let pointer = store.annotationIDLookUp[ID];

    //immutable update
    let newStore = store.annotations.slice();
    newStore[pointer] = data;
    store.annotations = newStore;
  }
  console.log(store);
};

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
  console.log(store);
};

const getAnnotationData = (id) => {
  const lookUpID = store.annotationIDLookUp[id];
  const annotation = store.annotations[lookUpID];
  return annotation;
};

const getGlobalTags = () => {
  return store.tags;
};

const getTagColor = (tag) => {
  const pos = store.tags.indexOf(tag);
  if (pos !== -1) {
    return assignColor(pos);
  }
  return "gray";
};

const doesGlobalTagExist = (tag) => {
  return store.tags.indexOf(tag) === -1;
};

const addNewAssignedTag = (newTag) => {
  if (store.tags.indexOf(newTag) === -1) {
    const newTagSet = [...store.tags, newTag];
    store.tags = newTagSet;
  }
  //console.log(store.tags);
};

const removeGlobalTag = (oldTag) => {
  const newTagSet = [...store.tags];
  const pos = newTagSet.tags.indexOf(oldTag);
  if (pos !== -1) {
    newTagSet.splice(pos, 1);
  }
  store.tags = newTagSet;
};

export {
  store,
  storeTypes,
  generateID,
  setStore,
  addToStore,
  updateStore,
  removeFromStore,
  getAnnotationData,
  getGlobalTags,
  addNewAssignedTag,
  removeGlobalTag,
  doesGlobalTagExist,
  getTagColor,
};
