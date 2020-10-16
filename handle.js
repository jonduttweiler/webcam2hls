const fs = require('fs');
const path = require('path');
const async = require('async');
const VIDEOS_PATH = "./public/videos"

var videoUtils = require('./videoUtils');
var THREADS =  1;

var prefix = process.argv.pop();

var files = fs.readdirSync(`${VIDEOS_PATH}`+ prefix);
//console.log(files);
var regex = new RegExp('^\\d+\\.webm');
files = files.filter(function(f) {
	var m = regex.exec(f);
	var f2 = !!m;
	regex.lastIndex = 0;
	return f2;
});

var fileDataArr = files.map(function(f) {
	return {
		filePath: `${VIDEOS_PATH}` + prefix + '/' + f,
		fileName: f
	};
});
//console.log(fileDataArr);



function findVideoDuration2(fileData, cb) {
	videoUtils.findVideoDuration(fileData.filePath, function(err, duration) {
		if (err) { return cb(err); }
		fileData.duration = duration;
		cb(null, duration);
	});
}





async.mapLimit(fileDataArr, THREADS, findVideoDuration2, function(err, durations) {
	// console.log(err, durations);

	videoUtils.computeStartTimes(fileDataArr);

	async.mapLimit(fileDataArr, THREADS, videoUtils.webm2Mpegts, function(err, tsFiles) {
		var playlistFp = `${VIDEOS_PATH}` + prefix + '/playlist.m3u8';
		videoUtils.generateM3u8Playlist(fileDataArr, playlistFp, false, function(err) {
			console.log(err ? err : 'ALL DONE!');
		});
	});
});
