import {
  createEmptyAnnotation,
  assignAnnotationColor,
  addTagToAnnotation,
  removeTagFromAnnotation,
  checkAnnotationTags,
} from "./annotation";

import {
  getAnnotationData,
  getGlobalTags,
  storeTypes,
  updateStore,
  removeFromStore,
  addGlobalTag,
  doesGlobalTagExist,
  getTagColor,
} from "./store";

/**
 * HACK to store starting point of current selection
 */
let GLOBAL_CACHED_SPAN = null;

let GLOBAL_SPAN_NUM = 0;

const generateDataID = () => {
  const newID = "span-" + GLOBAL_SPAN_NUM;
  GLOBAL_SPAN_NUM += 1;
  return newID;
};

const resetDataIDs = () => {
  GLOBAL_SPAN_NUM = 0;
};

/**
 * Adds annotation behaviour to a given list of textual spans.
 * The spans MUST NOT have a id or data-id attribute yet.
 * They can however contain any class not named 'annotated-span'.
 * @param {Array[HTML]} spans Array of pre-existing spans
 * @returns Same set of spans, now annotatable
 */
const makeSpanifiedAnnotatable = (spans) => {
  resetDataIDs();
  let annotatableSpans = spans.map((spanEL) => {
    const spanDataID = generateDataID();
    spanEL.setAttribute("data-id", spanDataID);

    addSelectionBehaviour(spanEL);

    return spanEL;
  });

  return annotatableSpans;
};

/**
 * Spanify a given string of text
 *
 * @param {String} text
 * @returns Array of annotate-able spans
 */
const spanify = (text) => {
  resetDataIDs();
  let spans = text.split(" ");

  spans = spans.map((span) => {
    const spanDataID = generateDataID();
    const spanEL = document.createElement("span");
    spanEL.innerHTML = span + " ";
    spanEL.setAttribute("data-id", spanDataID);

    addSelectionBehaviour(spanEL);

    return spanEL;
  });

  return spans;
};

/**
 * Make a span 'selectable' for single- or multi-string annotations
 * @param {HTML} spanEL
 */
const addSelectionBehaviour = (spanEL) => {
  /**
   * Mark span as starting point upon selection
   */
  spanEL.onmousedown = () => {
    if (!spanEL.classList.contains("annotated-span")) {
      GLOBAL_CACHED_SPAN = spanEL;
    }
  };

  /**
   * Retrieve range of spans selected for annotation
   */
  spanEL.onmouseup = () => {
    if (
      !spanEL.classList.contains("annotated-span") &&
      GLOBAL_CACHED_SPAN !== null
    ) {
      const dataID1 = spanEL.getAttribute("data-id");
      const dataID2 = GLOBAL_CACHED_SPAN.getAttribute("data-id");

      let src;
      let dest;
      if (dataID1 > dataID2) {
        src = GLOBAL_CACHED_SPAN;
        dest = spanEL;
      } else {
        src = spanEL;
        dest = GLOBAL_CACHED_SPAN;
      }

      const selectedSpans = [src];
      let currEL = src;
      while (
        !currEL.isEqualNode(dest) &&
        currEL !== null &&
        currEL !== undefined
      ) {
        currEL = currEL.nextElementSibling;
        selectedSpans.push(currEL);
      }

      /**
       * roundabout way to wrap the selected range of spans with one
       * wrapper span, acting as the annotation interface
       */
      const wrapperSpan = document.createElement("span");
      const textBody = [];
      const spanData = [];
      selectedSpans.forEach((i, count) => {
        textBody.push(i.innerHTML);
        spanData.push({
          "data-id": i.getAttribute("data-id"),
          id: i.getAttribute("id"),
          class: i.getAttribute("class"),
          background: i.style.backgroundColor,
        });

        const copySpan = document.createElement("span");
        copySpan.innerHTML = i.innerHTML;
        copySpan.setAttribute("data-id", i.getAttribute("data-id"));
        copySpan.setAttribute("id", i.getAttribute("id"));
        copySpan.setAttribute("class", i.getAttribute("class"));
        copySpan.style.backgroundColor = i.style.backgroundColor;
        wrapperSpan.appendChild(copySpan);

        if (count !== 0) i.remove();
      });
      selectedSpans[0].replaceWith(wrapperSpan);
      annotateSpan(wrapperSpan, textBody, spanData);
    }
    GLOBAL_CACHED_SPAN = null;
  };
};

/**
 * Annotate a given span (of spans),
 * create a new annotation in the store
 * and instantiate an annotation-menu for the annotated span
 *
 * @param {HTML} spanEL
 * @param {Array[String]} textBody
 */
const annotateSpan = (spanEL, textBody, spanData, existingID = null) => {
  let newSpanID;
  if (existingID) {
    newSpanID = existingID;
  } else {
    newSpanID = createEmptyAnnotation(textBody, spanData);
  }

  spanEL.setAttribute("id", newSpanID);
  spanEL.classList.add("annotated-span");
  displayAnnotationMenu(newSpanID);

  spanEL.onclick = () => {
    if (!document.getElementById("annotation-menu-" + newSpanID)) {
      displayAnnotationMenu(newSpanID);
    } else {
      document.getElementById("annotation-menu-" + newSpanID).remove();
    }
  };
};

/**
 * Decompose an annotated span into its original components,
 * creating spans with the separated words as their contents
 * @param {String} spanID
 */
const resetSpan = (spanID) => {
  const annotation = getAnnotationData(spanID);
  const annotatedSpan = document.getElementById(spanID);
  const originalStrings = annotation.textBody;
  const spanData = annotation.spanData;

  originalStrings.forEach((word, count) => {
    const reconstructed = document.createElement("span");
    reconstructed.innerHTML = word;
    reconstructed.setAttribute("data-id", spanData[count]["data-id"]);
    reconstructed.setAttribute("id", spanData[count]["id"]);
    reconstructed.setAttribute("class", spanData[count]["class"]);
    reconstructed.style.backgroundColor = spanData[count]["background"];

    annotatedSpan.parentNode.insertBefore(reconstructed, annotatedSpan);

    addSelectionBehaviour(reconstructed);
  });
  annotatedSpan.remove();
};

const restoreSpans = (annotations) => {
  annotations.forEach((annotation) => {
    const annotationID = annotation.id;
    const spanData = annotation.spanData;
    const textBody = annotation.textBody;

    const annotatedSpans = spanData.map((span) => {
      return document.querySelector("[data-id='" + span["data-id"] + "']");
    });

    const wrapperSpan = document.createElement("span");

    annotatedSpans.forEach((span, count) => {
      const copySpan = document.createElement("span");
      copySpan.innerHTML = textBody[count];
      copySpan.setAttribute("data-id", spanData[count]["data-id"]);
      copySpan.setAttribute("class", spanData[count]["class"]);
      copySpan.setAttribute("id", spanData[count]["id"]);
      copySpan.style.backgroundColor = spanData[count]["background"];

      wrapperSpan.appendChild(copySpan);
      if (count != 0) span.remove();
    });

    annotatedSpans[0].replaceWith(wrapperSpan);
    annotateSpan(wrapperSpan, textBody, spanData, annotationID);
    if (annotation.tags.length > 0)
      assignAnnotationColor(
        annotationID,
        annotation.tags[annotation.tags.length - 1]
      );
  });
};

/**
 * Create a new annotation-menu for an annotated span.
 * The menu consists of
 * - a removal/closing interface
 * - a list displaying the currently assigned tags
 * - a list displaying the globally available tags
 * - an input field to add a new tag (globally)
 * - a list displaying the currently added comments
 * - an input field to add a new comment
 *
 * @param {String} newSpanID
 */
const displayAnnotationMenu = (newSpanID) => {
  const menuID = "annotation-menu-" + newSpanID;
  if (document.getElementById(menuID)) {
    document.getElementById(menuID).remove();
  }

  const spanEL = document.getElementById(newSpanID);
  const parent = spanEL.parentNode;

  /**
   * The menu is absolutely positioned,
   * need to set its position appropiately
   */
  const [top, left] = [
    spanEL.offsetTop + spanEL.offsetHeight - parent.scrollTop,
    spanEL.offsetLeft + spanEL.offsetWidth,
  ];

  /**
   * Retrieve the annotation data to display in the menu
   */
  const annotation = getAnnotationData(newSpanID);
  const tags = annotation.tags;
  const comments = annotation.comments;

  /**
   * The container element
   */
  const annoMenu = document.createElement("div");
  annoMenu.setAttribute("id", menuID);
  annoMenu.setAttribute("class", "annotation-menu");
  annoMenu.style.top = top + "px";
  annoMenu.style.left = left + "px";

  /**
   * The container for the removal/close interface,
   * followed by divs acting as buttons to remove/close
   */
  const closeAndRemove = document.createElement("div");
  closeAndRemove.setAttribute("class", "close-remove");

  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = "close";
  closeBtn.setAttribute("class", "close-btn");
  closeBtn.onclick = () => annoMenu.remove();

  /**
   * Decompose the annotation span and remove the annotation on removal
   */
  const removeBtn = document.createElement("div");
  removeBtn.innerHTML = "remove";
  removeBtn.setAttribute("class", "remove-btn");
  removeBtn.onclick = () => {
    const confirmMsg = "Remove Annotation?";
    if (confirm(confirmMsg)) {
      resetSpan(newSpanID);
      removeFromStore(storeTypes.ANNOTATION, newSpanID);
      annoMenu.remove();
    }
  };

  closeAndRemove.appendChild(removeBtn);
  closeAndRemove.appendChild(closeBtn);

  /**
   * Utility to create a new tag (button)
   * @param {String} tag
   * @param {String} value
   * @returns
   */
  const createTagButton = (tag, value) => {
    const newTagBtn = document.createElement("div");
    newTagBtn.setAttribute("class", "tag");
    newTagBtn.innerHTML = tag;
    newTagBtn.value = value;
    newTagBtn.style.background = getTagColor(tag);
    return newTagBtn;
  };

  /**
   * Given a tag (button), handle what happens onclick:
   * - If its a tag within the list of currently assigned tags,
   * unassign the tag (and move the ui component back to the list of global tags)
   * - If its an unassigned tag within the list of globally available tags,
   * assign the tag to the annotation and move the ui component to the above list
   *
   * @param {HTML} element
   */
  const tagsOnClick = (element) => {
    element.onclick = () => {
      if (element.value === "tagsList") {
        tagOptions.insertAdjacentElement("beforeEnd", element);
        element.value = "tagOptions";
        removeTagFromAnnotation(newSpanID, element.innerHTML);
      } else {
        tagsList.insertAdjacentElement("beforeEnd", element);
        element.value = "tagsList";
        addTagToAnnotation(newSpanID, element.innerHTML);
      }
    };
  };

  /**
   * List of currently assigned tags
   */
  const tagsList = document.createElement("div");
  tagsList.setAttribute("class", "tags-list");
  tags.forEach((tag) => {
    const assignedTag = createTagButton(tag, "tagsList");
    tagsOnClick(assignedTag);
    tagsList.appendChild(assignedTag);
  });

  /**
   * List of currently available global tags, yet to assign
   */
  const tagSet = getGlobalTags();
  const intersection = tagSet.filter((x) => !tags.includes(x));
  const tagOptions = document.createElement("div");
  tagOptions.setAttribute("class", "tag-options");
  intersection.forEach((tag) => {
    const tagOption = createTagButton(tag, "tagOptions");
    tagsOnClick(tagOption);
    tagOptions.appendChild(tagOption);
  });

  /**
   * Input field to add a new (global) tag
   */
  const tagInsert = document.createElement("div");
  tagInsert.setAttribute("class", "tag-insert");
  const tagtInput = tagInsert.appendChild(document.createElement("input"));
  tagtInput.placeholder = "Add a new tag";

  /**
   * Logic handling the creation of a new global tag,
   * iff the created tag doesn't exist already
   */
  tagtInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      const newTagValue = tagtInput.value;
      if (doesGlobalTagExist(newTagValue)) {
        addGlobalTag(newTagValue);
      } else {
        const tagOptionTags = [...tagOptions.getElementsByClassName("tag")];
        tagOptionTags.forEach((tag) => {
          if (tag.innerHTML === newTagValue) {
            tag.remove();
          }
        });
      }
      if (checkAnnotationTags(newSpanID, newTagValue)) {
        const newTag = createTagButton(newTagValue, "tagsList");
        tagsList.appendChild(newTag);
        tagsOnClick(newTag);
        addTagToAnnotation(newSpanID, newTagValue);
      }
    }
  });

  /**
   * Logic handling the creation and display of a newly created comment.
   * Comments are rendered as input fields themselves, such that inputs
   * can be edited afterwards.
   * Also handles the update of the annotation upon edit.
   *
   * @param {String} comment
   * @param {String} newSpanID
   */
  const createNewComment = (comment, newSpanID) => {
    const newComment = document.createElement("input");
    newComment.setAttribute("class", "comment");
    newComment.placeholder = comment;
    newComment.value = comment;
    commentList.appendChild(newComment);
    newComment.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        const currentAnnotation = getAnnotationData(newSpanID);
        const oldComment = newComment.placeholder;
        const updatePos = currentAnnotation.comments.indexOf(oldComment);
        currentAnnotation.comments[updatePos] = newComment.value;

        const updatedAnnotation = {
          ...currentAnnotation,
          comments: [...currentAnnotation.comments],
        };
        updateStore(storeTypes.ANNOTATION, newSpanID, updatedAnnotation);
      }
    });
  };

  /**
   * Display the currently available comments for this annotation
   */
  const commentList = document.createElement("div");
  commentList.setAttribute("class", "comment-list");
  comments.forEach((comment) => {
    createNewComment(comment, newSpanID);
  });

  /**
   * Input field to add a new comment
   */
  const commentInsert = document.createElement("div");
  commentInsert.setAttribute("class", "comment-insert");
  const commentInput = commentInsert.appendChild(
    document.createElement("input")
  );
  commentInput.placeholder = "Add a new comment";

  commentInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      createNewComment(commentInput.value, newSpanID);
      const updatedAnnotation = {
        ...annotation,
        comments: [...comments, commentInput.value],
      };
      updateStore(storeTypes.ANNOTATION, newSpanID, updatedAnnotation);
    }
  });

  /**
   * Handle the movement of tags from/to each of the tag lists.
   * Needs to be invoked this way to ensure newly created tags are moved too.
   */
  [...document.getElementsByClassName("tag")].forEach((element) => {
    element.onclick = () => {
      if (element.value === "tagsList") {
        tagOptions.insertAdjacentElement("beforeEnd", element);
        element.value = "tagOptions";
      } else {
        tagsList.insertAdjacentElement("beforeEnd", element);
        element.value = "tagsList";
      }
    };
  });

  /**
   * Append everything to the container element
   */
  annoMenu.appendChild(closeAndRemove);
  annoMenu.appendChild(tagsList);
  annoMenu.appendChild(tagOptions);
  annoMenu.appendChild(tagInsert);
  annoMenu.appendChild(commentList);
  annoMenu.appendChild(commentInsert);

  document.getElementsByTagName("body")[0].appendChild(annoMenu);
};

export { spanify, makeSpanifiedAnnotatable, restoreSpans };
