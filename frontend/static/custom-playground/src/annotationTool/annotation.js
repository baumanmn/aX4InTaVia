import {
  storeTypes,
  generateID,
  addToStore,
  getAnnotationData,
  getTagColor,
  updateStore,
} from "./store.js";

/**
 * Creates a new annotation from a given string of text.
 * The annotation is empty in the sense of no assigned tags or comments.
 * The annotation format is inspired by the W3C format, but 'dumbed' down for testing purposes.
 * @param {Array[String]} textBody
 * @returns the ID of the newly created annotation
 */
const createEmptyAnnotation = (textBody, spanDataIDs) => {
  const id = generateID();
  const text = textBody.join(" ");
  const newAnnotation = {
    "@context": "http://www.w3.org/ns/anno.jsonld",
    id,
    text,
    textBody,
    spanDataIDs,
    type: "Annotation",
    tags: [],
    comments: [],
  };
  addToStore(storeTypes.ANNOTATION, newAnnotation);
  return id;
};

/**
 * Retrieves a color for a given tag and assign to the background of the given the associated span.
 * @param {String} newSpanID
 * @param {String} tag
 */
const assignAnnotationColor = (newSpanID, tag) => {
  const span = document.getElementById(newSpanID);
  const color = getTagColor(tag);
  span.style.backgroundColor = color;
};

/**
 * Checks if a given annotation is assigned a specific tag.
 * @param {String} newSpanID
 * @param {String} tag
 * @returns
 */
const checkAnnotationTags = (newSpanID, tag) => {
  const annotation = getAnnotationData(newSpanID);
  return annotation.tags.indexOf(tag) === -1;
};

/**
 * Adds a given new tag to an annotation, updating the annotation in the store.
 * Also retrieves and assigns the appropiate colors to the annotation span.
 * @param {String} newSpanID
 * @param {String} tag
 */
const addTagToAnnotation = (newSpanID, tag) => {
  const annotation = getAnnotationData(newSpanID);
  if (annotation.tags.indexOf(tag) === -1) {
    const newTagSet = [...annotation.tags];
    newTagSet.push(tag);
    const updatedAnnotation = {
      ...annotation,
      tags: newTagSet,
    };
    updateStore(storeTypes.ANNOTATION, newSpanID, updatedAnnotation);
    assignAnnotationColor(newSpanID, tag);
  }
};

/**
 * Removes a given tag from an annotation and updates the annoation in the store.
 * Assigns, i.e. resets, the appropriate color to the annotation span.
 * @param {String} newSpanID
 * @param {String} tag
 */
const removeTagFromAnnotation = (newSpanID, tag) => {
  const annotation = getAnnotationData(newSpanID);
  const pos = annotation.tags.indexOf(tag);
  if (pos !== -1) {
    const newTagSet = [...annotation.tags];
    newTagSet.splice(pos, 1);
    const updatedAnnotation = {
      ...annotation,
      tags: newTagSet,
    };

    updateStore(storeTypes.ANNOTATION, newSpanID, updatedAnnotation);
    assignAnnotationColor(newSpanID, newTagSet[newTagSet.length - 1]);
  }
};

export {
  createEmptyAnnotation,
  assignAnnotationColor,
  checkAnnotationTags,
  addTagToAnnotation,
  removeTagFromAnnotation,
};
