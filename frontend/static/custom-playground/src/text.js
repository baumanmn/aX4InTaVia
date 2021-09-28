import {
  createEmptyAnnotation,
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
  addNewAssignedTag,
  doesGlobalTagExist,
  getTagColor,
} from "./store";

const spanify = (text) => {
  let spans = text.split(" ");

  spans = spans.map((span) => {
    const spanEL = document.createElement("span");
    spanEL.innerHTML = span + " ";

    spanEL.ondblclick = () => {
      if (!spanEL.classList.contains("annotated-span")) {
        const newSpanID = createEmptyAnnotation(span);
        spanEL.setAttribute("id", newSpanID);
        spanEL.setAttribute("class", "annotated-span");
        displayAnnotationMenu(spanEL, newSpanID);

        spanEL.onclick = () => {
          if (!document.getElementById("annotation-menu-" + newSpanID)) {
            displayAnnotationMenu(spanEL, newSpanID);
          } else {
            document.getElementById("annotation-menu-" + newSpanID).remove();
          }
        };
      }
    };
    return spanEL;
  });

  return spans;
};

const resetSpan = (spanID) => {
  const annotatedSpan = document.getElementById(spanID);
  annotatedSpan.onclick = () => {};
  annotatedSpan.removeAttribute("id");
  annotatedSpan.removeAttribute("class");
};

const createText = () => {
  const text =
    "Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte. »Es ist ein eigentümlicher Apparat«, sagte der Offizier zu dem Forschungsreisenden und überblickte mit einem gewissermaßen bewundernden Blick den ihm doch wohlbekannten Apparat. Sie hätten noch ins Boot springen können, aber der Reisende hob ein schweres, geknotetes Tau vom Boden, drohte ihnen damit und hielt sie dadurch von dem Sprunge ab. In den letzten Jahrzehnten ist das Interesse an Hungerkünstlern sehr zurückgegangen. Aber sie überwanden sich, umdrängten den Käfig und wollten sich gar nicht fortrühren. Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte. »Es ist ein eigentümlicher Apparat«, sagte der Offizier zu dem Forschungsreisenden und überblickte mit einem gewissermaßen bewundernden Blick den ihm doch wohlbekannten Apparat. Sie hätten noch ins Boot springen können, aber der Reisende hob ein schweres, geknotetes Tau vom Boden, drohte ihnen damit und hielt sie dadurch von dem Sprunge ab. In den letzten Jahrzehnten ist das Interesse an Hungerkünstlern sehr zurückgegangen. Aber sie überwanden sich, umdrängten den Käfig und wollten sich gar nicht fortrühren. Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte. »Es ist ein eigentümlicher Apparat«, sagte der Offizier zu dem Forschungsreisenden und überblickte mit einem gewissermaßen bewundernden Blick den ihm doch wohlbekannten Apparat. Sie hätten noch ins Boot springen können, aber der Reisende hob ein schweres, geknotetes Tau vom Boden, drohte ihnen damit und hielt sie dadurch von dem Sprunge ab. In den letzten Jahrzehnten ist das Interesse an Hungerkünstlern sehr zurückgegangen. Aber sie überwanden sich, umdrängten den Käfig und wollten sich gar nicht fortrühren. Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte. »Es ist ein eigentümlicher Apparat«, sagte der Offizier zu dem Forschungsreisenden und überblickte mit einem gewissermaßen bewundernden Blick den ihm doch wohlbekannten Apparat. Sie hätten noch ins Boot springen können, aber der Reisende hob ein schweres, geknotetes Tau vom Boden, drohte ihnen damit und hielt sie dadurch von dem Sprunge ab. In den letzten Jahrzehnten ist das Interesse an Hungerkünstlern sehr zurückgegangen. Aber sie überwanden sich, umdrängten den Käfig und wollten sich gar nicht fortrühren. Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte. »Es ist ein eigentümlicher Apparat«, sagte der Offizier zu dem Forschungsreisenden und überblickte mit einem gewissermaßen bewundernden Blick den ihm doch wohlbekannten Apparat. Sie hätten noch ins Boot springen können, aber der Reisende hob ein schweres, geknotetes Tau vom Boden, drohte ihnen damit und hielt sie dadurch von dem Sprunge ab. In den letzten Jahrzehnten ist das Interesse an Hungerkünstlern sehr zurückgegangen. Aber sie überwanden sich, umdrängten den Käfig und wollten sich gar nicht fortrühren. Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten Absichten, als am Ziele ihrer Fahrt die Tochter als erste sich erhob und ihren jungen Körper dehnte. »Es ist ein eigentümlicher Apparat«, sagte der Offizier zu dem Forschungsreisenden und überblickte mit einem gewissermaßen bewundernden Blick den ihm doch wohlbekannten Apparat. Sie hätten noch ins Boot springen können, aber der Reisende hob ein schweres, geknotetes Tau vom Boden, drohte ihnen damit und hielt sie dadurch von dem Sprunge ab. In den letzten Jahrzehnten ist das Interesse an Hungerkünstlern sehr zurückgegangen. Aber sie überwanden sich, umdrängten den Käfig und wollten sich gar nicht fortrühren.Jemand musste Josef K. verleumdet haben, denn ohne dass er etwas Böses getan hätte, wurde er eines Morgens verhaftet. »Wie ein Hund!« sagte er, es war, als sollte die Scham ihn überleben. Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Und es war ihnen wie eine Bestätigung ihrer neuen Träume und guten";

  const textDiv = document.getElementById("text");
  const spanified = spanify(text);
  spanified.forEach((span) => {
    textDiv.appendChild(span);
  });

  textDiv.onscroll = () => {
    Array.from(
      document
        .getElementsByTagName("body")[0]
        .getElementsByClassName("annotation-menu")
    ).forEach((menu) => {
      menu.remove();
    });
  };

  return { text, textDiv };
};

const displayAnnotationMenu = (spanEL1, newSpanID) => {
  const menuID = "annotation-menu-" + newSpanID;
  if (document.getElementById(menuID)) {
    document.getElementById(menuID).remove();
  }

  const spanEL = document.getElementById(newSpanID);
  const parent = spanEL.parentNode;

  const [top, left] = [
    spanEL.offsetTop + spanEL.offsetHeight - parent.scrollTop,
    spanEL.offsetLeft + spanEL.offsetWidth,
  ];
  const annotation = getAnnotationData(newSpanID);
  const tags = annotation.tags;
  const comments = annotation.comments;

  const annoMenu = document.createElement("div");
  annoMenu.setAttribute("id", menuID);
  annoMenu.setAttribute("class", "annotation-menu");
  annoMenu.style.top = top + "px";
  annoMenu.style.left = left + "px";

  const closeAndRemove = document.createElement("div");
  closeAndRemove.setAttribute("class", "close-remove");

  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = "close";
  closeBtn.setAttribute("class", "close-btn");
  closeBtn.onclick = () => annoMenu.remove();

  const removeBtn = document.createElement("div");
  removeBtn.innerHTML = "remove";
  removeBtn.setAttribute("class", "remove-btn");
  removeBtn.onclick = () => {
    const confirmMsg = "Remove Annotation?";
    if (confirm(confirmMsg)) {
      removeFromStore(storeTypes.ANNOTATION, newSpanID);
      resetSpan(newSpanID);
      annoMenu.remove();
    }
  };

  closeAndRemove.appendChild(removeBtn);
  closeAndRemove.appendChild(closeBtn);

  const createTagButton = (tag, value) => {
    const newTagBtn = document.createElement("div");
    newTagBtn.setAttribute("class", "tag");
    newTagBtn.innerHTML = tag;
    newTagBtn.value = value;
    newTagBtn.style.background = getTagColor(tag);
    return newTagBtn;
  };

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

  const tagsList = document.createElement("div");
  tagsList.setAttribute("class", "tags-list");
  tags.forEach((tag) => {
    const assignedTag = createTagButton(tag, "tagsList");
    tagsOnClick(assignedTag);
    tagsList.appendChild(assignedTag);
  });

  const tagSet = getGlobalTags();
  const intersection = tagSet.filter((x) => !tags.includes(x));
  const tagOptions = document.createElement("div");
  tagOptions.setAttribute("class", "tag-options");
  intersection.forEach((tag) => {
    const tagOption = createTagButton(tag, "tagOptions");
    tagsOnClick(tagOption);
    tagOptions.appendChild(tagOption);
  });

  const tagInsert = document.createElement("div");
  tagInsert.setAttribute("class", "tag-insert");
  const tagtInput = tagInsert.appendChild(document.createElement("input"));
  tagtInput.placeholder = "Add a new tag";

  tagtInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      const newTagValue = tagtInput.value;
      if (doesGlobalTagExist(newTagValue)) {
        addNewAssignedTag(newTagValue);
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

  const commentList = document.createElement("div");
  commentList.setAttribute("class", "comment-list");
  comments.forEach((comment) => {
    createNewComment(comment, newSpanID);
  });

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

  //annoMenu.appendChild(closeBtn);
  annoMenu.appendChild(closeAndRemove);
  annoMenu.appendChild(tagsList);
  annoMenu.appendChild(tagOptions);
  annoMenu.appendChild(tagInsert);
  annoMenu.appendChild(commentList);
  annoMenu.appendChild(commentInsert);

  document.getElementsByTagName("body")[0].appendChild(annoMenu);
};

export default createText;
