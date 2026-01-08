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
  let newDate = data.split(/[: T-]/).map(parseFloat)

  const year = (newDate[0] < 10) ? `0${newDate[0]}` : newDate[0]
  const month = (newDate[1] < 10) ? `0${newDate[1]}` : newDate[1]
  const day = (newDate[2] < 10) ? `0${newDate[2]}` : newDate[2]
  const hours = (newDate[3] < 10) ? `0${newDate[3]}` : newDate[3]
  const minutes = (newDate[4] < 10) ? `0${newDate[4]}` : newDate[4]
  const seconds = (newDate[5] < 10) ? `0${newDate[5]}` : newDate[5]

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
