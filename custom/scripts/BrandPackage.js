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
    brandElementsConfigPath = path.join(projectCustomDir,
                                        "brand_elements.json"),
    brandsDir = path.join(projectRootDir, 'custom', 'brands'),
    brandSymlinkLocation = path.join(projectRootDir, 'custom', 'brand'),
    projectConfigFilePath = path.join(brandSymlinkLocation,
                                      'project_config.json'),
    configDotJsonPath = path.join(projectRootDir, ".cordova", "config.json"),
    platformsDir = path.join(projectRootDir, "platforms");

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

  blather(relativeToProjectRoot(scriptName));

  if (reporting) {
    report()
  }
  else if (priming) {
    prime();
  }
  else {
    var wasCurrent = getCurrentBrandName();
    if (refreshing) {
      if (! wasCurrent) {
        blather("No current brand to reestablish.");
        process.exit(1);
      }
      else {
        brandName = wasCurrent;
      }
    }
    else if (brandName === wasCurrent) {
      blather("Brand is already current, no change: " + brandName);
      process.exit(0);
    }
    if (! establishBrandByName(brandName, refreshing)) {
      process.exit(1);
    }
  }
  process.exit(0);
}

/** Print the current brand dir and the available choices. */
function report() {
  var current = getCurrentBrandName();
  blather("Current brand: " +
          current ||
          ((typeof current === "undefined") ? "<no link>" : "<bad link>"));
  blather("Available brands: " + fs.readdirSync(brandsDir).join(", "));
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
    blather("No change to already established brand: " + current);
    return false;
  }
  else {
    if (establishBrandByName(defaultBrandName)) {
      blather("Establishing default package brand: " + defaultBrandName);
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
function establishBrandByName(brandName, doingRefresh) {
  var brandPath = path.join(brandsDir, brandName),
      relpath = path.join('brands', brandName);
  if (! fs.existsSync(brandPath)) {
    blather("No such brand dir %s" + brandPath);
    return false;
  }
  else {
    try {
      fs.readlinkSync(brandSymlinkLocation);
      fs.unlinkSync(brandSymlinkLocation);
    }
    catch (err) {
      if (err.errno === errnos.EINVAL.errno) {
        // Exists, but not a symlink
        blather("File or directory blocking brand symlink, " +
                    "please remove it: " + brandSymlinkLocation);
        process.exit(1);
      }
    }
    var disposition = doingRefresh ? "Reestablishing" : "Set";
    blather(disposition + " package brand: " + brandName);
    fs.symlinkSync(relpath, brandSymlinkLocation);
    if (! fs.readlinkSync(brandSymlinkLocation)) {
      throw new Error("Brand link creation failed");
    }
    else {
      adjustManifestsToBrand();
      createCordovaPlatforms();
      blather("Done.");
      return true;
    }
  }
}

/** Produce various platform manifests including brand-specific values.
 *
 * > .cordova/config.json - fabricate entirely, identifier, projectName
 * > www/config.xml - substitute values in .template:
 *       projectName, description, name
 * > www/res/config/AndroidManifest.xml - substitute values in .template:
 *       identifier, projectName
 * > www/res/config/SpiderOak-Info.plist - substitute values in .template:
 *       identifier
 */
function adjustManifestsToBrand() {
  var projectConfig = require(path.join(brandSymlinkLocation,
                                        "project_config.json")),
      brandElementsConfig = require(brandElementsConfigPath),
      i;
  fabricateConfigDotJson(projectConfig);
  for (i in brandElementsConfig) {
    var relpath = brandElementsConfig[i][0],
        elementsSpec = brandElementsConfig[i][1],
        confResultFile = path.join(projectRootDir,
                                   path.join.apply({}, relpath.split("/"))),
        confResultFileTemplate = confResultFile + ".template";
    fabricateConfigFromTemplate(confResultFile, confResultFileTemplate,
                                projectConfig, elementsSpec);
  }
}
/** Create project config file from template, brand values, and elements spec.
 *
 * Each elements spec is a list containing two or three items:
 * 1. Name of projectConfig value to substitute
 * 2. Path to tag within template structure - XPath for XML, plist for .plist
 * 3. Optional tag attribute to receive the value.
 * When no tag attribute is specified, the tag itself receives the value.
 *
 * Errors are thrown if specified projectConfig attributes or template tags
 * or tag attributes are not found.
 *
 * @param {string} resultPath to the output file
 * @param {string} templatePath to the input file
 * @param {object} projectConfig with the fields and brand-specific values
 * @param {object} elementsSpec identifying the changes - see above for details
 */
function fabricateConfigFromTemplate(resultPath, templatePath,
                                     projectConfig, elementsSpec) {
  var ext = path.extname(resultPath),
      transformer = ((ext === ".plist") ?
                     PlistTemplateTransformer :
                     XMLTemplateTransformer),
      subject = new transformer(templatePath, resultPath);

  for (i in elementsSpec) {
    var curSpec = elementsSpec[i],
        field = curSpec[0],
        tagPath = curSpec[1],
        attrName = curSpec[2],
        value = projectConfig[field];

    subject.replace(value, tagPath, attrName);
  }
  fs.writeFileSync(resultPath, subject, {mode: "0644"});
  blather("Fabricated project configuration file " +
          relativeToProjectRoot(resultPath));
}

/** Create platforms per changed configs, removing existing ones if present. 
 * We just remove all the existing platforms and then recreate them.
 */
function createCordovaPlatforms() {
  var shell = require('shelljs'),
      platforms = fs.readdirSync(platformsDir),
      init = false,
      removeCmd, addCmd, code;

  debugger;
  platforms = platforms.filter(function(fname) {
    return (fname[0] !== '.') ? fname : false;
  });
  platforms = platforms.join(" ");

  if (platforms === "") {
    platforms = "ios android";
  }
  else {
    removeCmd = "cordova platform remove " + platforms;
    blather("Removing existing cordova platforms: " + removeCmd);
    code = shell.exec(removeCmd).code;
    if (code !== 0) {
      blather("Platforms remove failed (" + code + "): " + addCmd);
      process.exit(1)
    }
  }
  addCmd = "cordova platform add " + platforms;
  blather((init ? "Creating" : "Recreating") +
          " cordova platforms: " + addCmd);
  code = shell.exec(addCmd).code;
  if (code !== 0) {
    blather("Platforms add failed (" + code + "): " + addCmd);
    process.exit(1)
  }
}

function PlistTemplateTransformer(templatePath, resultPath) {
  this.plist = require('plist');
  this.subject = this.plist.parseFileSync(templatePath, 'utf-8');
}
PlistTemplateTransformer.prototype.replace = function(value, tagPath, attr) {
  // We don't implement attr replacement in plist transformer.
  this.subject[tagPath] = value;
};
PlistTemplateTransformer.prototype.toString = function() {
  return this.plist.build(this.subject);
};
function XMLTemplateTransformer(templatePath, resultPath) {
  var et = require('elementtree');
  this.templatePath = templatePath;
  this.subject = et.parse(fs.readFileSync(templatePath, 'utf-8').toString());
}
XMLTemplateTransformer.prototype.replace = function(value, tagPath, attr) {
  var tag = this.subject.find(tagPath);
  attr ? tag.set(attr, value) : tag.text = value;
};
XMLTemplateTransformer.prototype.toString = function() {
  return this.subject.write({indent: true});
};

function fabricateConfigDotJson(projectConfig) {
  var data = {id: projectConfig.identifier, name: projectConfig.projectName};
  fs.writeFileSync(configDotJsonPath, JSON.stringify(data) + "\n",
                   {mode: 0644});
  blather("Fabricated " + relativeToProjectRoot(configDotJsonPath));
}

function relativeToProjectRoot(thePath) {
  return path.relative(projectRootDir, thePath);
}
function blather(message) {
  console.log("[BrandPackage] %s", message)
}

if (require.main === module) {
    main(process.argv[0], process.argv[1], process.argv[2]);
}
