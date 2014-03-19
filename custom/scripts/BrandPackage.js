#!/usr/bin/env node

/** Configure project packaging according to brand-specific parameters.
 *
 * Without any arguments, we indicate the current brand link and the
 * available brands.
 *
 * With one argument, select the indicated brand directory as current and,
 * if the brand directory has changed:
 *
 * - suitably point the <repo>/custom/brand symlink
 * - apply the brand specification file, <repo>/custom/brand/brand_config.json
 * - reestablish the Cordova platforms
 *
 * There are two special brand-name arguments:
 *
 * -  "dash" for priming brand configuration. Establishes the default
 *    value (`SpiderOak`) iff no brand setting is established, but otherwise
 *    doing nothing. Thus we can use it as part of 'npm install' actions, to
 *    establish an initial setting.
 *
 * !  "bang" to redo the processing for the current setting. Useful if the
 *    processign was disrupted, or changes made to the relevant templates.
 *
 * @param {string} The name of the brand directory, in <repo>/custom/brands/, or `-' for initializing
 */

/* App defaults configuration: */
var defaultBrandName = 'SpiderOak',
    defaultBrandIdentifier = "com.spideroak.spideroak";

/* Internal program setup: */
var fs = require('fs'),
    path = require('path'),
    errnos = require('errno-codes'),
    projectRootDir = path.resolve(__dirname, '..', '..'),
    projectCustomDir = path.resolve(__dirname, '..'),
    brandsDir = path.join(projectRootDir, 'custom', 'brands'),
    brandSymlinkLocation = path.join(projectRootDir, 'custom', 'brand'),
    projectConfigFilePath = path.join(brandSymlinkLocation,
                                      'project_config.json'),
    // platformDestinations resolves later - requires specified brand:
    platformDestinations = {};

/** Driver, for when this module is run as a script.
 *
 * @param {string} executive javascript engine executing the script
 * @param {string} scriptName
 * @param {string} brandName name of brand dir being selected in custom/brands
 */
function main(executive, scriptName, brandName) {
  var reporting = (! brandName),
      priming = (brandName === "-"),
      refreshing = (brandName === "!");

  console.log("[hooks] BrandPackage %s",
              path.relative(projectRootDir, scriptName));

  if (reporting) {
    report()
  }
  else if (priming) {
    if (prime()) {
      adjustManifestsToBrand();
      recreateCordovaPlatforms();
    }
  }
  else {
    var wasCurrent = getCurrentBrandName();
    if (refreshing) {
      if (! wasCurrent) {
        console.log("No current brand to reestablish.");
        process.exit(1);
      }
      else {
        brandName = wasCurrent;
      }
    }
    else if (brandName === wasCurrent) {
      console.log("Brand is already current, no change: %s", brandName);
      process.exit(0);
    }
    if (! establishBrandByName(brandName)) {
      process.exit(1);
    }
    else {
      var disposition = refreshing ? "Reestablishing" : "Set";
      console.log("%s package brand: %s", disposition, brandName);
    }
  }
  process.exit(0);
}

/** Print the current brand dir and the available choices. */
function report() {
  var current = getCurrentBrandName();
  console.log("Current brand: %s",
              current ||
              ((typeof current === "undefined") ? "<no link>" : "<bad link>"));
  console.log("Available brands: %s", fs.readdirSync(brandsDir).join(", "));
}
/** Only if no brand currently established, set to the default one.
 *
 * ("No brand established" includes invalid link.)
 *
 * @return {boolean} true if brand was changed, false otherwise.
 */
function prime() {
  var current = getCurrentBrandName();
  if (current) {
    console.log("No change to already established brand: %s", current);
    return false;
  }
  else {
    if (establishBrandByName(defaultBrandName)) {
      console.log("Establishing default package brand: %s", defaultBrandName);
      return true;
    }
  }
}

/** Get the package's current brand, by name.
 * @returns {string} the name of the brand dir in custom/brands, if valid, or
 * @returns {boolean} false if link points at a non-existent target, or
 * @returns {undefined} undefined if not set. 
 */
function getCurrentBrandName() {
  var got, exc;
  try { got = fs.readlinkSync(brandSymlinkLocation); }
  catch (exc) { return undefined; };
  return (fs.existsSync(path.resolve(path.dirname(
    brandSymlinkLocation), got)) &&
          path.basename(got));
}
/** Set the package's brand.
 *
 * This includes:
 *
 * - assert the custom/brand@ link to the indicated custom/brands/name dir,
 *
 * in the case of error:
 *   - apply suitable handling and bail
 *
 * or, on successful linking:
 *   - massaging of the manifest templates with the brand-specific values, and
 *   - recreation of the various platforms, which will incorporate the results.
 *
 * @param {string} brandName name of brand dir in custom/brands/
 * @returns {boolean} true if successful, false if not.
 */
function establishBrandByName(brandName) {
  var brandPath = path.join(brandsDir, brandName),
      relpath = path.join('brands', brandName);
  if (! fs.existsSync(brandPath)) {
    console.log("No such brand dir %s", brandPath);
    return false;
  }
  else {
    // We had to wait until validated brand name to set platform destinations:
    setPlatformDestinations(brandName);
    try {
      fs.readlinkSync(brandSymlinkLocation);
      fs.unlinkSync(brandSymlinkLocation);
    }
    catch (err) {
      if (err.errno === errnos.EINVAL.errno) {
        // Exists, but not a symlink
        console.log("File or directory blocking brand symlink, " +
                    "please remove it: %s", brandSymlinkLocation);
        process.exit(1);
      }
    }
    fs.symlinkSync(relpath, brandSymlinkLocation);
    if (! fs.readlinkSync(brandSymlinkLocation)) {
      throw new Error("Brand link creation failed");
    }
    else {
      adjustManifestsToBrand();
      recreateCordovaPlatforms();
      return true;
    }
  }
}
/** Fill in platformDestinations using brand name.
 *
 * The filled-in information is necessary for manifest placements.
 *
 * @param {string} brandName name of brand dir in custom/brands/
 */
function setPlatformDestinations (brandName) {
  platformDestinations = {
    android: path.join(projectRootDir, 'platforms', 'android'),
    ios: path.join(projectRootDir, 'platforms', 'ios', brandName)
  };
}

function adjustManifestsToBrand() {
}
function recreateCordovaPlatforms() {
}

/** Copy optional customization elements to the indicated platform dir.
 *
 * @return true if item was present and copied, false otherwise.
 * @param {string} sourceFileName The file being copied from
 * @param {string} targetFileName The file being copied to
 * @param {string} targetPath The target path relative to platfom dir root
 * @param {string} platform The name of the target platform (case insensitive)
 */
function doCopyIfPresent(sourceFileName, targetFileName,
                         targetPath, platform) {
  var platformLC = platform.toLowerCase();
  if (! platformDestinations.hasOwnProperty(platformLC)) {
    throw new Error("[hooks] Unrecognized customization platform '%s'",
                    platform);
  }
  var fromPath = path.join(customElementsDir, sourceFileName);
  var destPath = path.join(platformDestinations[platformLC],
                           path.join.apply({}, targetPath.split("/")),
                           targetFileName);
  // Copy if optional item is present.
  if (fs.existsSync(fromPath)) {
    if (! fs.existsSync(path.dirname(destPath))) {
      console.log("[hooks] Skipping missing %s destination dir" +
                  " for item %s: %s",
                  platform, item.FileName, path.dirname(destPath));
      return false;
    }
    var readStream = fs.createReadStream(fromPath);
    var writeStream = fs.createWriteStream(destPath);
    // Occupy event queue until write 'end' so process doesn't exit 'til done:
    writeStream.on('end', function (event) {
      // console.log() seems to be ineffective in an event handler?
      //console.log("[hooks] %s written.", destPath);
    });
    //console.log("[hooks] Copying custom platform %s element %s to: %s",
    //            platform, sourceFileName, destPath);
    readStream.pipe(writeStream);
    return true;
  }
  return false;
}

if (require.main === module) {
    main(process.argv[0], process.argv[1], process.argv[2]);
}
