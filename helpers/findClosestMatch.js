function findClosestMatch(word, wordArray) {
    let closestIndex = -1;
    let highestScore = -Infinity;
  
    function similarity(a, b) {
      let matches = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        if (a[i] === b[i]) matches++;
      }
      return matches / Math.max(a.length, b.length);
    }
  
    wordArray.forEach((candidate, index) => {
      const score = similarity(word, candidate);
      if (score > highestScore) {
        highestScore = score;
        closestIndex = index;
      }
    });
  
    return closestIndex;
}

module.exports = findClosestMatch;