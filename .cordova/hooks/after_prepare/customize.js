#!/usr/bin/env node

(function(require, console) {
  var fs = require('fs'),
      path = require('path'),
      projectRootDir = path.resolve(__dirname, '..', '..', '..'),
      projectConfigFilePath = path.join(
        projectRootDir, 'custom', 'brand', 'project_config.json'),
      projectName = require(projectConfigFilePath).projectName,
      elementsFilePath = path.join(projectRootDir, 'custom', 'elements.json'),
      elements = require(elementsFilePath),
      elementsNum = 0,
      platformDestinations = {
        android: path.join(projectRootDir, 'platforms', 'android'),
        ios: path.join(projectRootDir, 'platforms', 'ios', projectName)
      },
      platformDispositions = {},
      targetActions = {},
      platform;

  console.log("[customize hook] Applying customizations from %s",
              path.relative(projectRootDir, elementsFilePath));

  /** Fill in platformDispositions.
   *
   * For each platform in platformDispositions, each disposition is one of:
   *
   * - 'ready'
   * - 'absent' - platform directory not present
   * - 'done' - [NOT YET IMPLEMENTED] prevent repeating on multiple passes
   *
   * Also, log a message for platforms we'll be skipping, due to disposition.
   */
  function determineDispositions() {
    var platform, location;
    for (platform in platformDestinations) {
      if (platformDestinations.hasOwnProperty(platform)) {
        location = platformDestinations[platform];
        if (! fs.existsSync(location)) {
          platformDispositions[platform] = 'absent';
          console.log("[customize hook] skipping not-yet existent " +
                      " platform " + platform);
        } else {
          platformDispositions[platform] = 'ready';
        }
      }
    };
  };
  determineDispositions();

  /** Copy optional customization elements to the indicated platform dir.
   *
   * @return true if item was present and copied, false otherwise.
   * @param {string} sourceFileName The file being copied from
   * @param {string} targetFileName The file being copied to
   * @param {string} targetPath The target path relative to platfom dir root
   * @param {string} platform The name of target platform (case insensitive)
   */
  function doCopyIfPresent(sourceFileName, targetFileName,
                           targetPath, platform) {
    var platformLC = platform.toLowerCase();
    if (! platformDestinations.hasOwnProperty(platformLC)) {
      throw new Error("[customize hook] Unrecognized customization platform '" +
                      platform + "'");
    }
    var fromPath = path.join(customElementsDir, sourceFileName);
    var destPath = path.join(platformDestinations[platformLC],
                             path.join.apply({}, targetPath.split("/")),
                             targetFileName);
    // Copy if optional item is present.
    if (fs.existsSync(fromPath)) {
      if (! fs.existsSync(path.dirname(destPath))) {
        console.log("[customize hook] Skipping missing %s destination dir" +
                    " for item %s: %s",
                    platform, item.FileName, path.dirname(destPath));
        return false;
      }
      var readStream = fs.createReadStream(fromPath);
      var writeStream = fs.createWriteStream(destPath);
      // Occupy event queue until write end so process doesn't exit 'til done:
      writeStream.on('end', function (event) {
        //console.log("[customize hook] %s written.", destPath);
      });
      console.log("[customize hook] (%s) %s => %s",
                  platform, sourceFileName,
                  path.relative(projectRootDir, destPath));
      readStream.pipe(writeStream);
      return true;
    }
    return false;
  };

  function doAction(action, sourceDir, sourceName, platform) {
    if (! targetActions.hasOwnProperty(action)) {
      throw new Error("[customize hook]  unknown targetAction" +
                      " '" + action + "'");
    } else {
      return targetActions[action](action, sourceDir, sourceName, platform);
    }
  };
  targetActions.iOSaddCertificate = iOSaddCertAction;
  function iOSaddCertAction (action, sourceDir, sourceName, platform) {
    console.log("[customize hook] STUB Action %s on %s", action, sourceName);
  };

  /** Return an array of files in dir matching target.
   *
   * If the target name starts with "^", it's treated as a regexp.
   *
   * @param{string} dir within which to seek matches
   * @param{string} target name to match a filename in dir
   */
  function matchesInDir(target, dir) {
    var entries = fs.readdirSync(dir) || [],
        asRegexp = target.charAt(0) === "^",
        got = entries.filter(function (name) {
          return asRegexp ? name.match(target) : (name === target);
        });
    return got;
  };

  /* Iterate the custom element entries, copying elements found in the
   * CustomElements folder to locations indicated, relative to the
   * projectRootDir. */
  for (var i in elements.Items) {
    var item = elements.Items[i],
        sourceName = item.SourceFileName,
        targetName = item.TargetFileName,
        customElementsDir =
          path.join(
            projectRootDir,
            path.join.apply({},
                            // Split+.join for platform independence:
                            (item.GetCustomElementsFrom ||
                             elements.GetCustomElementsFrom).split('/')));
    item.Platforms.forEach(function (platform) {
      if (platformDispositions[platform.toLowerCase()] !== 'ready') {
        return;
      };
      if (! item.TargetFolder && ! item.TargetAction) {
        throw new Error("[customize hook] Entry '%s' must have either a TargetFolder" +
                        " or TargetAction", JSON.stringify(item));
      } else {
        var got = sourceName;
        matchesInDir(sourceName, customElementsDir).forEach(
          function (fromName) {
            if (item.TargetFolder) {
              var toName = targetName || fromName;
              doCopyIfPresent(fromName,
                              toName,
                              item.TargetFolder,
                              platform);
            } else if (item.TargetAction) {
              doAction(item.TargetAction,
                       customElementsDir,
                       fromName,
                       platform);
            };
          });
      };
    });
  }
})(require, console);
