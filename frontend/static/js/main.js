var MODE = "POS";

const GLOBALS = {
  POScolor: d3.scaleOrdinal(d3.schemeSet3),
  ENTcolor: d3.scaleOrdinal(d3.schemeCategory10),
};

/**
 * get the text content and its annotation via AJAX
 */
$(function () {
  $.ajax({
    type: "POST",
    url: "/get_text",
    data: { dummy: {} },
    dataType: "json",
    success: function (results) {
      if (Object.keys(results).length > 0) {
        let text = results["text"];
        let annotation = results["annotation"];
        let POS = results["POS"];
        let ENT = results["ENT"];
        let container = document.getElementsByClassName("text")[0];
        fillView(container, text, annotation);
        fillSideBarPOS(POS);
        fillSideBarENT(ENT);
        colorTokens(annotation);
        onTabSwitch(annotation);
        //addAnnotationFunc();
      }
    },
  });
});

/**
 * fill the text container by creating spans for each text token
 *
 * @param {*} container text container
 * @param {*} text text content
 * @param {*} annotation POS and ENT information
 */
function fillView(container, text, annotation) {
  for (let i = 0; i < text.length; i++) {
    //span inlcuding the token span + tooltip
    let tokenSpan = container.appendChild(document.createElement("span"));
    tokenSpan.setAttribute("class", "tooltip");

    // the actual text token
    let tokenTextSpan = tokenSpan.appendChild(document.createElement("span"));
    tokenTextSpan.setAttribute("class", "tokenText");
    tokenTextSpan.innerHTML = text[i] + " ";
    //tokenSpan.setAttribute("id", "");

    // tooltip showing POS and, if existent, the ENT tag
    let tooltipText = tokenSpan.appendChild(document.createElement("span"));
    tooltipText.setAttribute("class", "tooltiptext");
    if (annotation[text[i]]["POS"].length > 0) {
      tooltipText.innerHTML = "POS: " + annotation[text[i]]["POS"];
    }
    if (annotation[text[i]]["Entity"].length > 0) {
      tooltipText.innerHTML += "<br>";
      tooltipText.innerHTML += "ENT: " + annotation[text[i]]["Entity"];
    }
  }
}

/**
 * fill the sidebar showing every POS tag and each token with that specific POS tag
 *
 * @param {*} POS POS tag dict.
 */
function fillSideBarPOS(POS) {
  GLOBALS.POScolor.domain(Object.keys(POS));

  let container = document.getElementsByClassName("pos")[0];
  let numEntries = 0;

  for (const [posTAG, tokens] of Object.entries(POS)) {
    for (let i = 0; i < tokens.length; i++) {
      //a row for every token with the specific tag
      let row = container.appendChild(document.createElement("div"));
      row.setAttribute("class", "row");

      let tagElement = row.appendChild(document.createElement("span"));
      tagElement.style.backgroundColor = GLOBALS.POScolor(posTAG);
      tagElement.innerHTML = posTAG;

      let word = row.appendChild(document.createElement("span"));
      word.setAttribute("class", "wordSpan");
      word.innerHTML = tokens[i];

      numEntries += 1;
    }
  }
  container.style.gridTemplateRows = "repeat( " + numEntries + " , 1fr)";
}

/**
 * fill the sidebar showing every ENT tag and each token with that specific POS tag
 *
 * @param {*} ENT ENT tag dict.
 */
function fillSideBarENT(ENT) {
  GLOBALS.ENTcolor.domain(Object.keys(ENT));

  let container = document.getElementsByClassName("ent")[0];
  let numEntries = 0;

  for (const [entTAG, tokens] of Object.entries(ENT)) {
    for (let i = 0; i < tokens.length; i++) {
      let row = container.appendChild(document.createElement("div"));
      row.setAttribute("class", "row");

      let tagElement = row.appendChild(document.createElement("span"));
      tagElement.style.backgroundColor = GLOBALS.ENTcolor(entTAG);
      tagElement.innerHTML = entTAG;

      let word = row.appendChild(document.createElement("span"));
      word.setAttribute("class", "wordSpan");
      word.innerHTML = tokens[i];

      numEntries += 1;
    }
  }
  container.style.gridTemplateRows = "repeat( " + numEntries + " , 1fr)";
}

/**
 * function assigning each tab button its (UI) logic when switch tabs
 */
function onTabSwitch(annotation) {
  let tabs = document.getElementsByClassName("tablinks");

  for (let i = 0; i < tabs.length; i++) {
    let button = tabs[i];

    button.onclick = function () {
      //each button holds as its value the MODE, which can be POS or ENT
      if (MODE !== button.value) {
        MODE = button.value;
        button.classList.add("active");
        for (let j = 0; j < tabs.length; j++) {
          if (MODE !== tabs[j].value) tabs[j].classList.remove("active");
        }
        colorTokens(annotation);
      }
    };
  }
}

/**
 * color each text token according to the active MODE (POS or ENT)
 * and its respective tag
 *
 * @param {*} annotation annotation information
 */
function colorTokens(annotation) {
  let tokenSpans = document.getElementsByClassName("tooltip");

  for (let i = 0; i < tokenSpans.length; i++) {
    let token = tokenSpans[i].getElementsByClassName("tokenText")[0];
    let tokenText = token.innerHTML.trim();
    let tag =
      MODE == "POS"
        ? annotation[tokenText]["POS"]
        : annotation[tokenText]["Entity"];

    //ignore junk tags
    if (tag !== "X" && tag !== "MISC" && tag.length !== 0) {
      let color = MODE == "POS" ? GLOBALS.POScolor(tag) : GLOBALS.ENTcolor(tag);
      token.style.backgroundColor = color;
    } else {
      token.style.backgroundColor = "white";
    }
  }
}
