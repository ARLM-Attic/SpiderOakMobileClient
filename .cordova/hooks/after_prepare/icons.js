#!/usr/bin/env node
(function() {
  var projectName = 'SpiderOak',
    fs = require('fs'),
    path = require('path'),
    res = path.join('.', 'www', 'res', 'icon'),
    androidDest = path.join('.', 'platforms', 'android', 'res'),
    iOSDest = path
      .join('.', 'platforms', 'ios', projectName, 'Resources', 'icons');
  
  var androidIcons = [
    { file: 'cordova_android_96.png', dest: 'drawable' },
    { file: 'cordova_android_72.png', dest: 'drawable-hdpi' },
    { file: 'cordova_android_36.png', dest: 'drawable-ldpi' },
    { file: 'cordova_android_48.png', dest: 'drawable-mdpi' },
    { file: 'cordova_android_96.png', dest: 'drawable-xhdpi' }
  ];
  var iOSIcons = [
    { file: 'cordova_ios_57.png', dest: 'icon.png' },
    { file: 'cordova_ios_114.png', dest: 'icon@2x.png' },
    { file: 'cordova_ios_72.png', dest: 'icon-72.png' },
    { file: 'cordova_ios_144.png', dest: 'icon-72@2x.png' }
  ];
  
  function copyFile(from, to) {
    var readStream = fs.createReadStream(from);
    readStream.pipe(fs.createWriteStream(to));
  }
  
  if (fs.existsSync(res)) {
    // Android
    if (fs.existsSync(androidDest)) {
      for (var idx in androidIcons) {
        copyFile(
          path.join(res, androidIcons[idx].file),
          path.join(androidDest, androidIcons[idx].dest, 'icon.png')
        );
      }
    }
    if (fs.existsSync(iOSDest)) {
      // iOS
      for (var idx in iOSIcons) {
        copyFile(
          path.join(res, iOSIcons[idx].file),
          path.join(iOSDest, iOSIcons[idx].dest)
        );
      }
    }
  }
  
})();
