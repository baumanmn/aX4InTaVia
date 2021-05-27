import { typeArray, stopWords, language } from "./constants.js";
import * as d3 from "d3";
//import * as d3 from "../node_modules/d3/build/d3.js";
//import * as d3 from "../node_modules/d3";
var stem = require("snowball-german");

function compareTypes(a, b) {
  //how to compare single type-objects
  if (typeArray.indexOf(a.type) < typeArray.indexOf(b.type)) return -1;
  else if (typeArray.indexOf(a.type) > typeArray.indexOf(b.type)) return 1;
  else return 0;
}

export function cleanUpData(rawData, w) {
  if (w) {
    //remove werther-annotators 16 and 18 and 4 and all types not in the typeArray
    var data = {
      userAnnotations: rawData.userAnnotations.filter(function (anno) {
        var validUsers =
          anno.userNo !== "16" && anno.user !== "18" && anno.user !== "4";
        var validTypes = anno.annotationType.every(function (type) {
          return typeArray.includes(type);
        });
        return validUsers && validTypes;
      }),
      size: 4,
      tokens: rawData.tokens,
      users: ["11", "12", "13", "26"],
    };
  } else {
    var data = rawData;
  }

  //filter out annos with missing data
  data.userAnnotations = data.userAnnotations.filter(function (anno) {
    return (
      anno.annotationTokens.length > 0 &&
      data.users.includes(anno.userNo) &&
      anno.annotationType.length > 0 &&
      anno.annotationText.length > 0
    );
  });

  //var test = {};
  //data.userAnnotations.map(function (anno) {
  //    return anno.annotationType;
  //}).forEach(function (typeArray) {
  //    typeArray.forEach (function (type) {
  //        if (!test.hasOwnProperty(type)) test[type] = 1;
  //        else test[type] += 1;
  //    });
  //});
  //console.log(test);
  return data;
}

export function computeTokens(data) {
  function Token(i) {
    this.annotated = false;
    this.users = {};
    this.types = {};
    this.annos = {};
    this.id = i;
    this.displayType = []; //HM
  }

  var tokens = data.tokens.map(function (t, i) {
    var token = new Token(i);
    token.text = t.text;
    token.stem = stem(t.text);
    token.start = t.startOff;
    token.end = t.endOff;
    //initialize user- & type-objects
    data.users.forEach(function (user) {
      //initialize the user-object
      token.users["user" + user] = 0;
      token.types["user" + user] = [];
      token.annos["user" + user] = [];
    });

    return token;
  });

  //specify for each token and user how many (overlapping) annotations contain this token
  //and specify for each user and token which (non-multiple) types are annotated
  //and adjust the "annotated"-flag
  data.userAnnotations
    .filter(function (anno) {
      //filter all annotations that have a nonzero tokenarray
      return anno.annotationTokens.length > 0;
    })
    .forEach(function (anno) {
      for (
        var i = anno.annotationTokens[0];
        i <= anno.annotationTokens[anno.annotationTokens.length - 1];
        i++
      ) {
        tokens[i].users["user" + anno.userNo] += 1;
        typeArray.forEach(function (type) {
          if (
            !tokens[i].types["user" + anno.userNo].includes(type) &&
            anno.annotationType.includes(type)
          ) {
            tokens[i].types["user" + anno.userNo].push(type);
          }
        });
        if (!tokens[i].annotated) tokens[i].annotated = true;
      }
    });

  //sum up the annotations per token
  //and sort the type arrays
  tokens.forEach(function (token) {
    token.annosPerToken = Object.values(token.users).reduce(function (
      acc,
      curr
    ) {
      return acc + curr;
    });
    Object.keys(token.types).forEach(function (user) {
      token.types[user].sort(compareTypes);
    });
  });

  Token.prototype.maxAnnosPerToken = Math.max.apply(
    null,
    tokens.map(function (t) {
      return t.annosPerToken;
    })
  );
  Token.prototype.maxAnnosPerTokenPerUser = Math.max.apply(
    null,
    tokens.map(function (t) {
      return Math.max.apply(null, Object.values(t.users));
    })
  );

  // HM
  // checking token types for all users
  // if (anno type is identical for all users) then {display type = anno type} else {display type = []}
  tokens.forEach(function (token) {
    var tempStorage = [];
    Object.entries(token.types).forEach(function (type) {
      if (type[1].length > 0) {
        tempStorage.push(type[1]);
      }
    });
    if (tempStorage.length > 0) {
      if (tempStorage.length === 1) {
        token.displayType = tempStorage[0];
      } else {
        var identical = true;
        for (var i = 1; i < tempStorage.length; i++) {
          if (
            tempStorage[0].sort().toString() !==
            tempStorage[i].sort().toString()
          ) {
            identical = false;
          }
        }
        if (identical) {
          token.displayType = tempStorage[1];
        }
      }
    }
  });
  //HM

  return tokens;
}

export function computeTerms(chart) {
  function Term(id) {
    this.tokens = [];
    this.globalAnnosPerTerm = 0;
    this.id = id;
  }

  var terms = {};

  //Array.from(new Set(chart.d.tokens
  //    .filter(function (t) { //filter stopwords
  //        stopWords.includes(t);
  //    })
  //    .map(function (t) { //delete duplicate stems
  //        return t.stem;
  //    })))
  //    .sort(function (a, b) { //sort term-stems alphabetically
  //        return a.text.localeCompare(b.text, language);
  //    })
  //    .forEach(function (termStem) { //generate term-objects as key-value pairs in "terms"
  //        terms.termStem = newTerm(termStem);
  //    });

  chart.d.tokens
    .filter(function (t) {
      //filter stopwords and non-annotated words and words containing spaces
      return (
        t.annotated &&
        !stopWords.includes(t.text.toLowerCase()) &&
        !t.text.match(" ")
      );
    })
    .forEach(function (token) {
      if (!terms.hasOwnProperty("st_" + token.stem)) {
        terms["st_" + token.stem] = new Term(token.id); //generate term-objects as key-value pairs in "terms"
      }
      terms["st_" + token.stem].tokens.push(token); //register tokens with "their" term
      terms["st_" + token.stem].globalAnnosPerTerm += token.annosPerToken; //book-keeping of annos
    });

  //assign term.text as majority vote over all of its token.texts
  for (var stem in terms) {
    if (terms.hasOwnProperty(stem)) {
      //prevent prototype-properties
      terms[stem].text = terms[stem].tokens
        .map(function (token) {
          //the token-texts
          return token.text;
        })
        .reduce(function (acc, curr, _, arr) {
          //majority-vote
          return arr.filter(function (v) {
            return v === acc;
          }).length >=
            arr.filter(function (v) {
              return v === curr;
            }).length
            ? acc
            : curr;
        }, null);
    }
  }

  Term.prototype.maxGlobalAnnosPerTerm = Math.max.apply(
    null,
    Object.values(terms).map(function (term) {
      return term.globalAnnosPerTerm;
    })
  );

  chart.d.terms = terms;
}

export function computeAnnosAndChunks(data) {
  //constructors of the basic elements
  function Anno() {}

  function Chunk(i) {
    this.annos = {};
    this.id = i;
    this.type = "";
  }

  //auxiliary functions for the anno-construction
  function compareTypeArrays(aT, bT) {
    //how to compare typeObject-arrays
    var l = Math.min(aT.length, bT.length);

    for (var i = 0; i < l; i++) {
      if (compareTypes(aT[i].type, bT[i].type) !== 0)
        return compareTypes(aT[i].type, bT[i].type);
    }

    if (aT.length < bT.length) return -1;
    if (aT.length > bT.length) return 1;
    return 0;
  }

  //auxiliary functions for the chunk-construction
  function walkAlongAnnos(anno, annos) {
    var actualAnnoId = anno.id,
      lastTokenId = anno.tokens.last,
      laterAnnos = (actualAnnoId === annos[annos.length - 1].id
        ? []
        : annos.slice(actualAnnoId - annos[0].id + 1)
      )
        .filter(function (anno, i) {
          return anno.tokens.first <= lastTokenId; //all annos cutting the actual anno
        })
        .sort(function (a, b) {
          //sort such, that the rightest annos come last
          if (a.tokens.last < b.tokens.last) return -1;
          if (a.tokens.last > b.tokens.last) return 1;
          return 0;
        });
    if (laterAnnos.length === 0) return actualAnnoId;
    return walkAlongAnnos(laterAnnos[laterAnnos.length - 1], annos);
  }

  var annos = {},
    chunks = {};

  data.users.forEach(function (user) {
    ////filter all annotations of "user" that have a nonzero tokenarray and typearray
    //var userOldAnnos = data.userAnnotations.filter(function (anno) {
    //    return (anno.userNo === user) && (anno.annotationTokens.length > 0) && (anno.annotationType.length > 0);
    //});

    //filter all annotations of "user"
    var userOldAnnos = data.userAnnotations.filter(function (anno) {
      return anno.userNo === user;
    });

    //create the new custom annotations
    var userAnnos = userOldAnnos.map(function (anno, i) {
      var newAnno = new Anno();
      newAnno.text = anno.annotationText;
      newAnno.tokens = {
        first: anno.annotationTokens[0],
        last: anno.annotationTokens[anno.annotationTokens.length - 1],
      };

      newAnno.types = anno.annotationType.map(function (type) {
        return { type };
      });
      newAnno.types.sort(compareTypes);
      newAnno.types.forEach(function (type, i) {
        //vertical positioning of types within an anno
        type.sib = newAnno.types.length - 1;
        type.fsib = type.sib - i;
      });

      return newAnno;
    });

    //sort the new annos according to their token-positions (and types)
    userAnnos.sort(function (a, b) {
      var a0 = a.tokens.first,
        a1 = a.tokens.last,
        b0 = b.tokens.first,
        b1 = b.tokens.last,
        aT = a.types,
        bT = b.types;
      if (
        a0 < b0 ||
        (a0 === b0 && a1 < b1) ||
        (a0 === b0 && a1 === b1 && compareTypeArrays(aT, bT) === -1)
      )
        return -1;
      else if (a0 === b0 && a1 === b1 && compareTypeArrays(aT, bT) === 0)
        return 0;
      else return 1;
    });

    //define ids: flat ids (idFlat) for the types & ids for the annos (id)
    var prevAnno = 0;
    for (var i = 0; i < userAnnos.length; i++) {
      userAnnos[i].id = i;
      userAnnos[i].types.forEach(function (type, i) {
        type.idFlat = prevAnno + i;
      });
      prevAnno = userAnnos[i].types[userAnnos[i].types.length - 1].idFlat + 1;
    }

    //create the chunk-array for "user"
    var userChunks = [];
    var annoIndex = 0,
      chunkIndex = 0;
    var remainingAnnos = userAnnos;
    while (annoIndex < userAnnos.length) {
      var chunk = new Chunk(chunkIndex);
      var anno = userAnnos[annoIndex];

      chunk.annos.first = annoIndex;

      annoIndex = walkAlongAnnos(anno, remainingAnnos);
      chunk.annos.last = annoIndex;
      annoIndex += 1;
      remainingAnnos = userAnnos.slice(annoIndex);

      //write the level into the respective anno
      //define chunk-type (of only 1, else "multiple")
      var typeNamesChunk = [];
      userAnnos
        .slice(chunk.annos.first, chunk.annos.last + 1)
        .forEach(function (anno, i) {
          anno.level = i + 1;
          if (chunk.type !== "multiple") {
            var typeNames = anno.types.map(function (type) {
              return type.type;
            });
            if (typeNames.length > 1) chunk.type = "multiple";
            else typeNamesChunk.push(typeNames[0]);
          }
        });
      if (chunk.type !== "multiple") {
        typeNamesChunk = Array.from(new Set(typeNamesChunk));
        if (typeNamesChunk.length > 1) chunk.type = "multiple";
        else chunk.type = typeNamesChunk[0];
      }

      chunk.tokens = {
        first: userAnnos[chunk.annos.first].tokens.first,
        last: userAnnos[chunk.annos.last].tokens.last,
      };
      chunk.levels = chunk.annos.last - chunk.annos.first + 1;

      userChunks.push(chunk);
      chunkIndex += 1;
    }

    annos["user" + user] = userAnnos;
    chunks["user" + user] = userChunks;
  });
  return [annos, chunks];
}

export function updateTokensWithAnnos(tokens, annos) {
  Object.keys(tokens[0].annos).forEach(function (user) {
    annos[user].forEach(function (anno) {
      tokens
        .slice(anno.tokens.first, anno.tokens.last + 1)
        .forEach(function (token) {
          token.annos[user].push(anno);
        });
    });
  });
}

export function computeUsers(data) {
  return data.users;
}

export function computeBins(width, tokens) {
  var bins = [];

  //bin-constructor
  function Bin(i) {
    this.tokens = [];
    this.users = {};
    this.types = {};
    this.binCuttingAnnos = {};
    this.id = i;
  }

  var binCard = Math.min(tokens.length, width); //number of bins

  var binSize, //number of tokens per bin
    binBaseSize = Math.floor(tokens.length / binCard),
    binLeftoverTokens = tokens.length - binBaseSize * binCard,
    //distribute the lager bins randomly
    leftoverTokensPos = d3
      .shuffle(d3.range(binCard))
      .slice(0, binLeftoverTokens)
      .sort(function (a, b) {
        return a - b;
      }),
    tokenCounter = 0;

  //construction of the bins
  for (var i = 0; i < binCard; i += 1) {
    var bin = new Bin(i);

    //determine binSize
    if (i === leftoverTokensPos[0]) {
      leftoverTokensPos.shift();
      binSize = binBaseSize + 1;
    } else binSize = binBaseSize;

    //create the tokenarray (objects, not indices)
    for (var j = 0; j < binSize; j += 1) {
      bin.tokens.push(tokens[tokenCounter + j]);
    }
    tokenCounter += binSize;

    //compute the # of annos on tokens in the bin
    //and the type-arrays (multiple types not counted)
    //and the annos that cut this bin
    Object.keys(bin.tokens[0].users).forEach(function (user) {
      bin.users[user] = bin.tokens.reduce(function (acc, curr) {
        return acc + curr.users[user];
      }, 0);
      bin.types[user] = bin.tokens.reduce(function (acc, curr) {
        curr.types[user].forEach(function (type) {
          if (!acc.includes(type)) acc.push(type);
        });
        return acc.sort(compareTypes);
      }, []);

      var annoIds = [];
      bin.binCuttingAnnos[user] = bin.tokens.reduce(function (acc, curr) {
        curr.annos[user].forEach(function (anno) {
          if (!annoIds.includes(anno.id)) {
            acc.push(anno);
            annoIds.push(anno.id);
          }
        });
        return acc;
      }, []);
    });
    bin.annosPerBin = Object.values(bin.users).reduce(function (acc, curr) {
      return acc + curr;
    }, 0);

    bins.push(bin);
  }

  bins.maxSize = Math.ceil(tokens.length / width);

  return bins;
}

export function computeBinMaxima(width, tokens) {
  var maxBinSize = Math.ceil(tokens.length / width);
  var binMaxima = { users: {}, maxAnnosPerBin: [] };

  //compute binMaxima for all respective users
  Object.keys(tokens[0].users).forEach(function (user) {
    var annoArr = tokens.map(function (token) {
        return token.users[user];
      }),
      result = annoArr.slice();

    binMaxima.users[user] = [];

    for (var binSize = 1; binSize <= maxBinSize; binSize += 1) {
      binMaxima.users[user].push(Math.max.apply(null, result));
      result.pop();
      annoArr.shift();
      result = result.map(function (r, i) {
        return r + annoArr[i];
      });
    }
  });

  //compute binMaxima per user
  binMaxima.maxAnnosPerBinPerUser = Object.values(binMaxima.users)[0].map(
    function (_, i) {
      return Math.max.apply(
        null,
        Object.values(binMaxima.users).map(function (row) {
          return row[i];
        })
      );
    }
  );

  //compute binMaxima over all users
  var annoArrTotal = tokens.map(function (token) {
      return token.annosPerToken;
    }),
    result = annoArrTotal.slice();
  for (var binSize = 1; binSize <= maxBinSize; binSize += 1) {
    binMaxima.maxAnnosPerBin.push(Math.max.apply(null, result));
    result.pop();
    annoArrTotal.shift();
    result = result.map(function (r, i) {
      return r + annoArrTotal[i];
    });
  }

  return binMaxima;
}
