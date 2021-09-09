//create the chunk-array for "user"
var userChunks = [];
var annoIndex = 0,
  chunkIndex = 0;
while (annoIndex < userAnnos.length) {
  var chunk = new Chunk(chunkIndex);
  var anno = userAnnos[annoIndex];

  chunk.annos.first = annoIndex;
  annoIndex = walkAlongAnnos(anno, userAnnos);
  chunk.annos.last = annoIndex;

  //write the level into the respective anno
  userAnnos
    .slice(chunk.annos.first, chunk.annos.last + 1)
    .forEach(function (anno, i) {
      anno.level = i + 1;
    });

  chunk.tokens = {
    first: userAnnos[chunk.annos.first].tokens.first,
    last: userAnnos[chunk.annos.last].tokens.last,
  };
  chunk.levels = chunk.annos.last - chunk.annos.first + 1;
  userChunks.push(chunk);
  chunkIndex += 1;
}
