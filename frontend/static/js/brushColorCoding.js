export function updateClass(chart, brushID, overview) {
  /* chart.overviews[overview]["brushGroup"] =
    chart.overviews[overview]["brushGroup"].map((el, idx) => {
      if(idx === brushID) el.attr("class", String("O" + overview))
      else return el.attr("class", "O0")
    }) */
  let altClass = overview === 0 ? "O1" : "O2";
  if (brushID === 0) {
    if (chart.overviews[overview]["brushGroup"][0] !== null)
      chart.overviews[overview]["brushGroup"][0].attr("class", altClass);
  } else {
    if (chart.overviews[overview]["brushGroup"][0] !== null)
      chart.overviews[overview]["brushGroup"][0].attr("class", "O0");
  }
  if (brushID === 1) {
    if (chart.overviews[overview]["brushGroup"][1] !== null)
      chart.overviews[overview]["brushGroup"][1].attr("class", altClass);
  } else {
    if (chart.overviews[overview]["brushGroup"][1] !== null)
      chart.overviews[overview]["brushGroup"][1].attr("class", "O0");
  }
  if (brushID === 2) {
    if (chart.overviews[overview]["brushGroup"][2] !== null)
      chart.overviews[overview]["brushGroup"][2].attr("class", altClass);
  } else {
    if (chart.overviews[overview]["brushGroup"][2] !== null)
      chart.overviews[overview]["brushGroup"][2].attr("class", "O0");
  }
}

//TO DO: FIX THIS FOR NEW IDs
export function resetAllClasses(chart) {
  chart.overviews[0]["brushGroup"][0].attr("class", "O1");
  chart.overviews[0]["brushGroup"][1].attr("class", "O1");
  chart.overviews[0]["brushGroup"][2].attr("class", "O1");
  chart.overviews[1]["brushGroup"][0].attr("class", "O2");
  chart.overviews[1]["brushGroup"][1].attr("class", "O2");
  chart.overviews[1]["brushGroup"][2].attr("class", "O2");
}
