 /**
 * SettingsView.js
 */
(function (spiderOakApp, window, undefined) {
  "use strict";
  var console = window.console || {};
  console.log = console.log || function(){};
  var Backbone    = window.Backbone,
      _           = window._,
      $           = window.$;

  spiderOakApp.SettingsView = Backbone.View.extend({
    destructionPolicy: "never",
    events: {
      "tap .send-feedback": "feedback_tapHandler",
      "tap .account-settings": "accountSettings_tapHandler",
      "tap .server": "server_tapHandler"
    },
    initialize: function() {
      _.bindAll(this);
      this.on("viewActivate",this.viewActivate);
      this.on("viewDeactivate",this.viewDeactivate);
      spiderOakApp.navigator.on("viewChanging",this.viewChanging);
    },
    render: function() {
      this.settingsInfo = spiderOakApp.storageBarModel &&
                          spiderOakApp.storageBarModel.toJSON() ||
                          { firstname: "", lastname: "" };
      _.extend(this.settingsInfo, {server: spiderOakApp.config.server});
      this.$el.html(
        _.template(
          window.tpl.get("settingsViewTemplate"), this.settingsInfo
        ));
      this.scroller = new window.iScroll(this.el, {
        bounce: !$.os.android,
        vScrollbar: !$.os.android,
        hScrollbar: false
      });

      return this;
    },
    feedback_tapHandler: function() {
      var subject = "Feedback on SpiderOak Android app version " +
        spiderOakApp.version;
      var extras = {};
      extras[spiderOakApp.fileViewer.EXTRA_SUBJECT] = subject;
      extras[spiderOakApp.fileViewer.EXTRA_EMAIL] = "android@spideroak.com";
      var params = {
        action: spiderOakApp.fileViewer.ACTION_SEND,
        type: "text/plain",
        extras: extras
      };
      spiderOakApp.fileViewer.share(
        params,
        function(){
          // ...
        },
        function(error) { // @FIXME: Real error handling...
          console.log(JSON.stringify(error));
        }
      );
    },
    accountSettings_tapHandler: function(event) {
      spiderOakApp.navigator.pushView(
        spiderOakApp.SettingsAccountView,
        {},
        spiderOakApp.defaultEffect
      );
    },
    server_tapHandler: function(event) {
      spiderOakApp.navigator.pushView(
        spiderOakApp.SettingsServerView,
        {},
        spiderOakApp.defaultEffect
      );
    },
    viewChanging: function(event) {
      if (!event.toView || event.toView === this) {
        spiderOakApp.backDisabled = true;
      }
      if (event.toView === this) {
        spiderOakApp.mainView.setTitle("Settings");
        if (!!spiderOakApp.navigator.viewsStack[0] &&
              spiderOakApp.navigator.viewsStack[0].instance === this) {
          spiderOakApp.mainView.showBackButton(false);
        }
        else if (!spiderOakApp.navigator.viewsStack[0] ||
            spiderOakApp.navigator.viewsStack.length === 0) {
          spiderOakApp.mainView.showBackButton(false);
        }
        else {
          spiderOakApp.mainView.showBackButton(true);
        }
      }
    },
    viewActivate: function(event) {
      if (spiderOakApp.navigator.viewsStack[0].instance === this) {
        spiderOakApp.mainView.showBackButton(false);
      }
      spiderOakApp.backDisabled = false;
    },
    viewDeactivate: function(event) {
      this.remove();
    },
    remove: function() {
      this.close();
      this.$el.remove();
      this.stopListening();
      return this;
    },
    close: function() {
      // Clean up our subviews
      this.scroller.destroy();
    }
  });

  spiderOakApp.SettingsAccountView = Backbone.View.extend({
    // Derive from this and define your particular rendering.
    templateID: "settingsAccountViewTemplate",
    viewTitle: "Account",
    destructionPolicy: "never",
    initialize: function() {
      _.bindAll(this);
      this.on("viewActivate",this.viewActivate);
      this.on("viewDeactivate",this.viewDeactivate);
      spiderOakApp.navigator.on("viewChanging",this.viewChanging);
    },
    getTemplateValues: function() {
      return spiderOakApp.storageBarModel.toJSON();
    },
    render: function() {
      this.$el.html(
        _.template(
          window.tpl.get(this.templateID),
          this.getTemplateValues()
        )
      );
      this.scroller = new window.iScroll(this.el, {
        bounce: !$.os.android,
        vScrollbar: !$.os.android,
        hScrollbar: false
      });
      return this;
    },
    viewChanging: function(event) {
      if (!event.toView || event.toView === this) {
        spiderOakApp.backDisabled = true;
      }
      if (event.toView === this) {
        spiderOakApp.mainView.setTitle(this.viewTitle);
        if (!!spiderOakApp.navigator.viewsStack[0] &&
              spiderOakApp.navigator.viewsStack[0].instance === this) {
          spiderOakApp.mainView.showBackButton(false);
        }
        else if (!spiderOakApp.navigator.viewsStack[0] ||
            spiderOakApp.navigator.viewsStack.length === 0) {
          spiderOakApp.mainView.showBackButton(false);
        }
        else {
          spiderOakApp.mainView.showBackButton(true);
        }
      }
    },
    viewActivate: function(event) {
      if (spiderOakApp.navigator.viewsStack[0].instance === this) {
        spiderOakApp.mainView.showBackButton(false);
      }
      spiderOakApp.backDisabled = false;
    },
    viewDeactivate: function(event) {
      this.remove();
    },
    remove: function() {
      this.close();
      this.$el.remove();
      this.stopListening();
      return this;
    },
    close: function() {
      // Clean up our subviews
      this.scroller.destroy();
    }
  });

  spiderOakApp.SettingsServerView = spiderOakApp.SettingsAccountView.extend({
    templateID: "settingsServerViewTemplate",
    viewTitle: "Server",
    getTemplateValues: function() {
      return {server: spiderOakApp.config.server};
    }
  });

})(window.spiderOakApp = window.spiderOakApp || {}, window);
