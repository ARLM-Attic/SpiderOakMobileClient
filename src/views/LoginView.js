/**
 * MainView.js
 */
(function (spiderOakApp, window, undefined) {
  "use strict";
  var console = window.console || {};
  console.log = console.log || function(){};
  var Backbone    = window.Backbone,
      _           = window._,
      $           = window.$;

  spiderOakApp.LoginView = Backbone.View.extend({
    el: "#login",
    events: {
      'focus input': 'input_focusHandler',
      'blur input': 'input_blurHandler',
      'submit form': 'form_submitHandler',
      'tap .shareRoomsButton': 'shareRoomsButton_tapHandler',
      'tap .loginButton': 'loginButton_tapHandler',
      'tap .switch': 'switch_tapHandler'
    },
    initialize: function() {
      _.bindAll(this);
      this.$el.bind('pageAnimationStart', this.pageAnimationStart_handler);
      this.$el.bind('pageAnimationEnd', this.pageAnimationEnd_handler);
    },
    render: function() {
      // @FIXME: This will actually be set by the users choice...
      if (this.$('.switch').hasClass('on')) {
        this.$('.switch input[type=checkbox]').attr('checked',true);
      }
      return this;
    },
    pageAnimationStart_handler: function(event, data) {
      // ...
    },
    pageAnimationEnd_handler: function(event, data) {
      // ...
    },
    input_focusHandler: function(event) {
      // window.setTimeout(function(){
        this.$('.login-logo').addClass('rotated');
      // },50);
    },
    input_blurHandler: function(event) {
      // window.setTimeout(function(){
        this.$('.login-logo').removeClass('rotated');
      // },50);
    },
    form_submitHandler: function(event) {
      this.$('input').blur();
      // @FIXME: Repace with actual login procedure
      var username = $('#username').val();
      var b32username = spiderOakApp.nibbler.encode($('#username').val());
      var password = $('#password').val();

      // Pop us some kinda blocker/spinner
      $.ajax({
        type: "POST",
        url: "https://spideroak.com/storage/"+b32username+"/login",
        data: {
          password: password
        },
        success: function(data, status, xhr) {
          if (/^login:/.test(data)) {
            // Try again at appropriate DC
            $.ajax({
              type: "POST",
              url: data,
              data: {
                password: password
              },
              success: function(data, status, xhr) {
                // Set the basicauth details
                Backbone.BasicAuth.set(username,password);
                // Set the b32username
                spiderOakApp.b32username = b32username;
                // Set the keychain credentials
                // Unblock the spinner
                window.jQT.goTo("#main","slidedown");
              },
              error: function(xhr, errorType, error) {
                // console.log([xhr, errorType, error]);
                navigator.notification.alert("Authentication failed. Please check your details and try again.", null, 'Authentication Error');
              }
            });
          }
          else {
            // Set the basicauth details
            Backbone.BasicAuth.set(username,password);
            // Set the b32username
            spiderOakApp.b32username = b32username;
            // Set the keychain credentials
            // Unblock the spinner
            window.jQT.goTo("#main","slidedown");
          }
        },
        error: function(xhr, errorType, error) {
          navigator.notification.alert("Authentication failed. Please check your details and try again.", null, 'Authentication Error');
        }
      });
    },
    loginButton_tapHandler: function(event) {
      this.$('input').blur();
      event.preventDefault();
    },
    shareRoomsButton_tapHandler: function(event) {
      this.$('input').blur();
      event.preventDefault();
    },
    switch_tapHandler: function(event) {
      var $this = $(event.target).hasClass('switch') ? $(event.target) : $(event.target).closest('.switch');
      $this.find('input[type=checkbox]').attr('checked',!$this.find('input[type=checkbox]').attr('checked'));
      $this.toggleClass('on');
    }
  });
  spiderOakApp.loginView = new spiderOakApp.LoginView().render();


})(window.spiderOakApp = window.spiderOakApp || {}, window);
