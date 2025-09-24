export function listPublishTitle(data) {
  console.log(data.length, "\n", data[0]);
  // data.items.forEach(element => {
  //   console.log(element.snippet)
  // });
}

export function findByCaption(data, searchTerm) {
  const REGEX = new RegExp(searchTerm)
  const info = data.filter(x => x.snippet.title.match(REGEX))
  return info;
}
