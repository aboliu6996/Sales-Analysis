function csvJSON(csv) {
    const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split(',');
  
    for (let i = 1; i < lines.length-1; i++) {
      const obj = {};
      const currentLine = lines[i].split(',');
  
      // Check if the current line has the expected number of columns
      if (currentLine.length === headers.length) {
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j].trim()] = currentLine[j].trim();
        }
  
        result.push(obj);
      } else {
        console.error(`Skipping line ${i} due to incorrect number of columns.`);
      }
    }
  
    return result;
}