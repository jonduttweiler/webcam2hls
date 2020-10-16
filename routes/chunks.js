const fs = require("fs");
const path = require("path");
const express = require('express');
const router = express.Router();
const VIDEOS_PATH = path.join(__dirname,"../public/videos");

const { findVideoDuration,
        computeStartTimes,
        webm2Mpegts,
        generateM3u8Playlist
    } = require("../videoUtils");

const LIVE = true;
const PREV_ITEMS_IN_LIVE = 4;
const fileDataArrs = {};

function lastN(arr, n) { // non-destructive
	arr = arr.slice();
	var l = arr.length;
	var i = l - n;
	if (i < 0) { i = 0; }
	return arr.splice(i, n);
}



router.post('/chunk/:prefix/:num/:isLast?', async function (req, res) {
    let { prefix, num, isLast = false } = req.params;
    let isFirst = false;

    if ((/^0+$/).test(num)) {
        await fs.promises.mkdir(`${VIDEOS_PATH}/` + prefix);
        isFirst = true;
    }

    const fragmentPath = `${VIDEOS_PATH}/` + prefix + '/' + num + '.webm';
    let msg = 'got ' + fragmentPath;
    console.log(msg);
    console.log('isFirst:%s, isLast:%s', isFirst, isLast);
    
    const stream = fs.createWriteStream(fragmentPath, {encoding:'binary'});
    req.pipe(stream); //stores chunks on fs
    req.on('end', () => {
        processChunk(prefix,fragmentPath,isFirst,isLast)
        res.send(msg);
    });
})

function processChunk(prefix,fragmentPath,isFirst,isLast){
    //make it async
    findVideoDuration(fragmentPath, function(err, duration) {
        if (err) { return console.error(err); }
        console.log('duration: %s', duration.toFixed(2));

        const fragmentDescription = {
            filePath: fragmentPath,
            fileName: path.basename(fragmentPath),
            duration: duration
        };
        
        let fileDataArr;
        if (isFirst) {
            fileDataArr = [];
            fileDataArrs[ prefix ] = fileDataArr;
        }
        else {
            fileDataArr = fileDataArrs[ prefix ];
        }

        fileDataArr.push(fragmentDescription);

        computeStartTimes(fileDataArr);

        webm2Mpegts(fragmentDescription, function(err, mpegtsFp) {
            if (err) { return console.error(err); }
            console.log('created %s', mpegtsFp);
            
            var playlistFp = `${VIDEOS_PATH}/` + prefix + '/playlist.m3u8';

            var fileDataArr2 = (isLast ? fileDataArr : lastN(fileDataArr, PREV_ITEMS_IN_LIVE));

            var action = (isFirst ? 'created' : (isLast ? 'finished' : 'updated') );

            generateM3u8Playlist(fileDataArr2, playlistFp, !isLast, function(err) {
                console.log('playlist %s %s', playlistFp, (err ? err.toString() : action) );
            });
        });


    });


}



module.exports = router





