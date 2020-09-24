const express = require('express');
const torrentStream = require('torrent-stream');

const fs = require('fs');
const srt2vtt = require('srt2vtt');
const glob = require('glob');

const { verifyToken } = require('../utils/auth');
const movieListService = require('../services/movieLists');
const Logger = require('../utils/logger');

const Movie = require('../models/Movie');

const router = express.Router();

router.get('/start/:magnet/:token/:imdb', async (req, res) => {
  const { magnet, token, imdb } = req.params;
  let retSubs = [];
  console.log(imdb);
  console.log('start');
  const engine = torrentStream("magnet:?" + magnet, {
    tmp: "../public",
    path: "../public/" + imdb,
    trackers: [
      "udp://glotorrents.pw:6969/announce",
      "udp://tracker.opentrackr.org:1337/announce",
      "udp://torrent.gresille.org:80/announce",
      "udp://tracker.openbittorrent.com:80",
      "udp://tracker.coppersurfer.tk:6969",
      "udp://tracker.leechers-paradise.org:6969",
      "udp://p4p.arenabg.ch:1337",
      "udp://tracker.internetwarriors.net:1337"
    ],
  });
let tries = 0;
  engine.on('ready', () =>
    {
      console.log("READY");
      engine.files.forEach(file =>
        {
          if (file.name.includes('.srt'))
          {
            file.select();
            console.log("SELECTED FILE:", file.name);
          }
        })

    })
    engine.on('torrent', () => console.log("\033[35mmetadata has been fetched\033[0m"));

    engine.on('download', () => console.log("\033[35mmetadata has been downloaded\033[0m"));
    
    engine.on('idle', () => {
      console.log("\033[36mAll subs downloaded\033[0m"); 
      // TAHAN VALIIN TEKSTITYSTEN TARKASTUS JA HAKU JA ALLA RES ANTAA URLIN TEKSTEIHIN.

      //search for srt files. If found, fun cb.

      setTimeout(() => {

        glob('../public/' + imdb + '/**/*.srt', {}, (err, files) => {
          console.log("LOYTYI: ");
          console.log(files);

          if (files.length)
          {

            //moving the subtitle file to imdb-folder.
            files.forEach((file) => {
              const filePath = file.split('/');
              const fileName = filePath[filePath.length - 1].split('.');
              const langIdentifier = fileName.length === 3 && fileName[1].length === 3 ? fileName[fileName.length - 2] : fileName.length === 2 && fileName[0].length <= 3 ? fileName[fileName.length - 2] : 'eng';
              fs.rename(file, '../public/' + imdb + '/sub.' + langIdentifier + '.srt', (err) => { if(err) console.log(err); });
            })
            //fs.rename(files[0], '../public/' + imdb + '/sub.srt', (err) => { if(err) console.log(err); });

            setTimeout(() => {
              
            glob('../public/' + imdb + '/*.srt', {}, (err, files) => {
              console.log("FILEESS: ", files);
              if (err)
                console.log("ERROR", err);
              files.forEach((file) => {
                let lang = file.split('/');
                lang = lang[lang.length - 1].split('.');
                var srtData = fs.readFileSync(file);
                srt2vtt(srtData, (err, vttData) => {
                  fs.writeFileSync('../public/' + imdb + '/sub.' + lang[lang.length - 2] + '.vtt', vttData);

                  retSubs.push(imdb + '/sub.' + lang[lang.length - 2] + '.vtt');
                })
              })
              console.log("RETURNATAAN: ", retSubs);
              console.log("jsut ennen sendia: ", retSubs);

              if (res.headersSent)
                return;
              return res.status(200).json({sub: retSubs, message: 'found'});
              
            })

            
            

          }, 500)
            //convert srt2vtt. Timeout, that fs.rename has time to run..
            // setTimeout(() => {
            //   var srtData = fs.readFileSync('../public/' + imdb + '/sub.srt');
            
            //   srt2vtt(srtData, (err, vttData) => {
            //     if (err) console.log(err);
            //     fs.writeFileSync('../public/' + imdb + '/sub.vtt', vttData);
            //   })
            //   console.log("LOYTYYYY");

              
            // }, 1000);

              
          }
          else {
            engine.destroy();
            return res.status(200).send("subtitles not found");
          }
        })
      }, 500);
      
      
      //res.status(200).send("JEES");
      
  });
    

})

router.get('/:magnet/:token/:imdb', async (req, res, next) => {
  try {
    const { magnet, token, imdb } = req.params;
	// const token = req.query.token;
	
	console.log("magnet", magnet);
	console.log("token", token);

    const user = await verifyToken(token);
    if (!user)
      return res.status(401).json('auth error');

    // Add movie to user's watched movies
    try {
      movieListService.addToList(
        magnet,
        {...user, id: user.id},
        movieListService.Lists.watched
      );
    } catch(err) {
      Logger.error(err);
    }

    // Saving movie into database or editing its lastViewed
    try {
      const dbMovie = new Movie({magnet});
      await dbMovie.save();
    } catch(err) {
      // Movie is already in database
      const oldMovie = Movie.findOne({magnet});
      if (oldMovie.fullyDownloaded)
        console.log('Movie is already fully downloaded');
        // The above is not actually implemented yet
      await Movie.findOneAndUpdate({magnet}, {lastViewed: new Date()});
    }

    // start engine

    
      const engine = torrentStream("magnet:?" + magnet, {
        tmp: "../public",
        path: "../public/" + imdb,
        trackers: [
          "udp://glotorrents.pw:6969/announce",
          "udp://tracker.opentrackr.org:1337/announce",
          "udp://torrent.gresille.org:80/announce",
          "udp://tracker.openbittorrent.com:80",
          "udp://tracker.coppersurfer.tk:6969",
          "udp://tracker.leechers-paradise.org:6969",
          "udp://p4p.arenabg.ch:1337",
          "udp://tracker.internetwarriors.net:1337"
        ],
      });

    // Experimental unnecessary engine destroyer
    res.on('close', () => {
      engine.destroy();
    });
    
    // emitted when the engine is ready to be used. 
    engine.on('ready', () =>
    {
      let file = null;
      // STREAM
      engine.files.forEach(currentFile => {
        if (!file || currentFile.length > file.length)
          file = currentFile;
      });

      const range = req.headers.range;

      console.log(range);

      const pos = range ? range.replace(/bytes=/, '').split('-') : null;
      const start = pos ? parseInt(pos[0], 10) : 0;
      const end = (pos && pos[1]) ? parseInt(pos[1], 10) : file.length - 1;

      res.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4'
      });
      
      file.createReadStream({
        start: start,
        end: end
      })
        .pipe(res);
        
        
    })

    // emitted when the metadata has been fetched.
    engine.on('torrent', () => console.log("\033[35mmetadata has been fetched\033[0m"));

    // // emitted everytime a piece has been downloaded and verified.
	  engine.on('download', index => {console.log("\033[36mpart " + index +  " downloaded and verified\033[0m");});

    // emitted when all selected files have been completely downloaded.
    engine.on('idle', () => {
      console.log("\033[0;32mall selected files have been completely downloaded\033[0m");
      // This will prevent the streaming of the very last couple of seconds in Top Gun
      //engine.destroy();
    });

    // kill the stream somehow?

  } catch (err) {
    console.error(err.message);
  }
});

module.exports = router;
