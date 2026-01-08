export function formatDuration(input){
  /**
   * Youtube metadata contains a duration field in the form PT99H99M99S
   * 
   * The duration data in the video data is in ISO 8601 format (https://www.w3.org/TR/NOTE-datetime)
   * E.g.: PT11M58S
   * 
   * This function converts it to a string of digits
   */

  let timeinfo = [];
  let timedata = input
  let matches =[/(\d+)H/,/(\d+)M/,/(\d+)S/];

  for (let k=0; k < matches.length; k++){
    timeinfo[k] = (timedata.match(matches[k])) ? timedata.match(matches[k])[1].padStart(2,'0') : '00';
  }

  return timeinfo.join("");
}

export function formatPublishedDate(data) {
  const date = new Date(data)
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
