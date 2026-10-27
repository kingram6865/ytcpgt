# Youtube Channel and Playlist Public Contents Gathering Tool

## Background:

Youtube's UI is painfully poor. No sorting of playlists. Sequenced videos for a channel are 
difficult to find. The search function is not even rudimentary. Trying to find a specific 
video based on minimal search information is painful at best.

In addition to the poor UI, if a creator renames or reuploads a particular video, the original
link dies, with no trail. If one uses the Youtube tools to save a file, it simply becomes a 
dead brick in a growing inert wall of failed video links.

Further, if a channel disappears for whatever reason, the associated videos disappear and the 
links are useless from an historical perspective.

Often one may interact with youtube in a meandering manner, traveling down strange rabbit-holes
and not really tracking the journey.

The poor interface and possibility of losing journey history compelled me to find a solution
for my frustration.

Once I found out that there was an API with video information, I saw this as an apt project to
improve my softeng skills in Node.js and how to build a server side app in a Linux CLI environment.

## Purpose

Given a Youtube URL containing a channel id, channel link or playlist id, the app will retrieve
and store the publically available contents of the channel, recording all relevant details about 
the channel, playlists and each video created by the chnnel owner and store it in a JSON file
for further possible processing. The app will also accept a naked channel id (@channel, channel number
or playlist id alone) and run the process.

A couple of other modules will read the contents of the saved file and output the video date, url and 
video title for a quick summary view in ascending date order.

With this method, it's easier to search for a specific title, date or videoid if any of those details 
are known.

## Usage

In order to use this app, you need a Google API KEY. These keys are free (as of the 10/25/26) so if 
one already has a gmail account, it is as simple as creating a Google Cloud account, enabling the 
Youtube API and generating an API KEY. This process is well documented in many other places and can 
also be provided by any of the AI assistants with minimal tokens. This all should essentially be free.

Once an API KEY is obtained, create a .env file in the root of the project and it should have this
content:

```env
## ---------- MYSQL 5.5
MYSQLHOST=<mysql server name or ip address>
MYSQLPORT=<mysql connection port>
MYSQLUSER=<user who will have admin access to database>
MYSQLPWD<database password>

## Youtube key associated with Google Cloud account <xxx@gmail.com>
API_KEY1 = <APIKEY>
API_KEY2 = <APIKEY>

```

I recommend having 2 API keys for this app in case there are issues at any given time with a key.
Also consider restricting what IP addresses have access to the key. Again that type of information
is well documented in other places.

A MySQL database is not required. Use whatever RDBMS makes sense for a repository for your purposes.
The data model will be minimal. My database use involves triggers and stored procedures so those
details will be provided in case anyone would like to leverage those mecahnics. Be advised that a 
database could grow really quickly as the ease of use improves.

The saved info is currently just the channel data. The videos are left as JSON, in case all the playlist
or channel videos are not necessarily desired for archival.

### Execute

In a shell environment (typically BASH on Linux. This should work fine on any system that can run Node.js
and npm. I recommend Bash for Windows or Cygwin for Windows machines).

- > npm run start https://www.youtube.com/channel/UChwlUA0A8d2A7_UiKIqdNjw
- > npm run start UChwlUA0A8d2A7_UiKIqdNjw
- > npm run start http://www.youtube.com/@retronate 
- > npm run start @retronate 
- > npm run start https://www.youtube.com/playlist?list=PLD9Ow2Roi9awZ-sisppnjAA3HmDqxcSpd
- > npm run start PLD9Ow2Roi9awZ-sisppnjAA3HmDqxcSpd

The progress is output to the screen. The final destination of the output is data/<canonical channel name>/videos.json
