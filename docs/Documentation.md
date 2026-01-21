#

## Get the channel data and playlist info for a given video: `node channelPlaylists.js <videoid>`
E.g.
```bash
node channelPlaylists.js JU_8fJjtGxA
```

## Show the video API data that was saved: `node listvideos.js <file absolute path>`
E.g.
```bash
node listvideos.js ./data/Predictive_History/videos.json
```

## Show the playlist items for the given playlist id `node playlistItems.js <playlist id>`
```bash
node playlistItems.js 
```
With a given playlist, there will be elements of the playlist. Those elements may have a sequence attached.
The response data JSON for the API request has this form:

```json
{
  "kind": "youtube#playlistItem",
  "etag": "RXAGOprbZNDV2YSkFYDYUIL6_gQ",
  "id": "UEx6OFZCNVNhQm5zWmpEZmFEaEVtdEtFOXhnM29hREJ1Yi41NkI0NEY2RDEwNTU3Q0M2",
  "snippet": {
    "publishedAt": "2020-01-01T21:40:33Z",
    "channelId": "UCmu5OxLyy_CsS0enTu3xHyg",
    "title": "Private video",
    "description": "This video is private.",
    "thumbnails": {},
    "channelTitle": "Ollie Loops",
    "playlistId": "PLz8VB5SaBnsZjDfaDhEmtKE9xg3oaDBub",
    "position": 0,
    "resourceId": {
      "kind": "youtube#video",
      "videoId": "OnXhTA4DUNs"
    }
  },
  "contentDetails": {
    "videoId": "OnXhTA4DUNs"
  },
  "status": {
    "privacyStatus": "private"
  }
}
```






## `youtube/getData.js`

### `videoData(id)`

videoData() takes either a single youtube video id (v=xxxxxxxxxx) or an array of video id's
it returns a JSON object:

```json
{
  kind: 'youtube#video',
  etag: 'NnJXoMxUzhkMTvN6HG3_moNrb54',
  id: '7X4I8vxlDQs',
  snippet: {
    publishedAt: '2025-06-10T15: 32: 43Z',
    channelId: 'UCT78OnJ9NbgR3WBcL7vXg4w',
    title: 'ONE Thing That Makes a Man a Top 1 % Lover that Women Dream About  | Alexey Welsh',
    description: '✅ Become The Best Lover For Your Woman: Step-By-Step Course\n' +
      'https: //www.lovefloweducation.com/lp/the-perfect-lover\n' +
      '    👉 FREE COURSE: "7 Biggest Mistakes MOST Men Make in Sex - Instantly Become a Better Lover”:\n' +
      'https: //www.lovefloweducation.com/lp/guide-to-womans-body-lp\n' +
      '\n' +
      'Most men have never learned this, and yet this  is the main reason of failure of your sexual technique,
    99% of the time. Only one change in your approach can maximise her pleasure, arousal and orgasms. \n' +
      '\n' +
      'CONNECT WITH ME:\n' +
      '\n' +
      'Instagram:\n' +
      'https: //www.instagram.com/alexeywelsh\n' +
      '\n' +
      'This video uses AI generated images from Openart.ai and Envato.com\n' +
      '\n' +
      '--\n' +
      '\n' +
      'ALEXEY WELSH  – VIDEO DISCLAIMER\n' +
      'The information contained within this video is for informational purposes only. We shall in no event be held liable to any party for any reason arising directly or indirectly for the use or interpretation of the information presented in this video.\n' +
      '\n' +
      'Copyright 2023, Alexey Welsh - All Rights Reserved.',
    thumbnails: {
      default: [Object
      ],
      medium: [Object
      ],
      high: [Object
      ],
      standard: [Object
      ],
      maxres: [Object
      ]
    },
    channelTitle: 'Alexey Welsh',
    tags: [
      'Alexey Welsh',
      'sexuality',
      'holistic sex',
      'tantric sex',
      'sex advice',
      'sex tips',
      'best sexual technique',
      'sexual technique',
      'how to be a good lover',
      'sex skills',
      'best technique for orgasm'
    ],
    categoryId: '27',
    liveBroadcastContent: 'none',
    defaultLanguage: 'en',
    localized: {
      title: 'ONE Thing That Makes a Man a Top 1 % Lover that Women Dream About  | Alexey Welsh',
      description: '✅ Become The Best Lover For Your Woman: Step-By-Step Course\n' +
        'https: //www.lovefloweducation.com/lp/the-perfect-lover\n' +
        '    👉 FREE COURSE: "7 Biggest Mistakes MOST Men Make in Sex - Instantly Become a Better Lover”:\n' +
        'https: //www.lovefloweducation.com/lp/guide-to-womans-body-lp\n' +
        '\n' +
        'Most men have never learned this, and yet this  is the main reason of failure of your sexual technique,
      99% of the time. Only one change in your approach can maximise her pleasure, arousal and orgasms. \n' +
        '\n' +
        'CONNECT WITH ME:\n' +
        '\n' +
        'Instagram:\n' +
        'https: //www.instagram.com/alexeywelsh\n' +
        '\n' +
        'This video uses AI generated images from Openart.ai and Envato.com\n' +
        '\n' +
        '--\n' +
        '\n' +
        'ALEXEY WELSH  – VIDEO DISCLAIMER\n' +
        'The information contained within this video is for informational purposes only. We shall in no event be held liable to any party for any reason arising directly or indirectly for the use or interpretation of the information presented in this video.\n' +
        '\n' +
        'Copyright 2023, Alexey Welsh - All Rights Reserved.'
    },
    defaultAudioLanguage: 'en'
  },
  contentDetails: {
    duration: 'PT15M32S',
    dimension: '2d',
    definition: 'hd',
    caption: 'false',
    licensedContent: false,
    contentRating: {},
    projection: 'rectangular'
  },
  statistics: {
    viewCount: '71544',
    likeCount: '2414',
    favoriteCount: '0',
    commentCount: '101'
  }
}
```

