import { renderToAnnotationList } from "./annotation.js";
import { renderToRelationList } from "./relation.js";
import { addAnnotationFromDB } from "./index.js";

const store = {
  annotations: [],
  annotationIDLookUp: {},
  relations: [],
  relationIDLookUp: {},
};

const storeTypes = {
  ANNOTATION: "ANNOTATION",
  RELATION: "RELATIONS",
};

const idPrefixes = {
  ANNOTATION_TO_LIST: "anno-list-",
  RELATION_TO_LIST: "rel-list-",
};

const setStore = async (newStore) => {
  Object.assign(store, newStore);
  addAnnotationFromDB(newStore);
  renderToAnnotationList();
  renderToRelationList();
  console.log(store);
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
  } else {
    //update ID lookup-table
    const len = store.relations.length;
    store.relationIDLookUp[data.id] = len;

    //immutable update set up
    const newStore = [...store.relations, data];
    store.relations = newStore;
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
  } else {
    let pointer = store.relationIDLookUp[ID];

    //immutable update
    let newStore = store.relations.slice();
    newStore[pointer] = data;
    store.relations = newStore;
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
  } else {
    //immutable update
    let newStore = store.relations.filter((relation) => {
      if (relation.id !== ID) {
        return relation;
      }
    });
    store.relations = newStore;

    //pointer array update
    let newPointers = {};
    store.relations.forEach((relation, i) => {
      newPointers[relation.id] = i;
    });
    store.relationIDLookUp = newPointers;
  }
  console.log(store);
};

export {
  store,
  storeTypes,
  idPrefixes,
  setStore,
  addToStore,
  updateStore,
  removeFromStore,
};
