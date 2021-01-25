/**
 * Intercooler.js inspired functionality for STOMP WebSocket connections.
 *
 * <pre>
 * STOMP headers:
 *   x-sc-script: arbitrary javascript to execute
 *   x-sc-target: jQuery selector to target.
 *   x-sc-swap-style: 'replace', 'append', or 'prepend' (default: 'replace').
 *   x-sc-trigger: Allows you to trigger a JQuery event handler on the client side.
 *     The value of this header can either be a plain string for the event name, or
 *     a JSON object that satisfies the jQuery parseJSon() requirements, where each
 *     property is an event name to trigger, and the value of each property is an
 *     array of arguments to pass to that event.
 * STOMP body:
 *   HTML string to inject (included javascript **will** be executed).
 * </pre>
 *
 * @example <caption>boilerplate</caption>
 * <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js" integrity="sha256-nkP8cj5xaTdWK/BsZl+57ZCE/Y/i4UNtbNTpgH+6Taw=" crossorigin="anonymous"></script>
 * <script src="path/to/stompcooler.js"></script>
 * <script type="application/javascript">
 *   Stompcooler.connect('ws://localhost:15674/ws', 'guest', 'guest', '/', '/queue/test')
 * </script>
 *
 * @example <caption>Sending directives from Python (see demo.py and the corresponding stomp-demo.html)</caption>
 * conn = stomp.Connection()
 * conn.connect('guest', 'guest')
 *
 * print('about to replace some content...')
 * conn.send('/queue/test', "<h2>Just replaced some content</h2>", headers={'x-sc-target': '#replace-demo'})
 *
 * print('about to append some content...')
 * conn.send('/queue/test', "<li>just appended some content</li>", headers={'x-sc-target': '#append-demo',
 *                                                                          'x-sc-swap-style': 'append'})
 * print('about to append some content...')
 * conn.send('/queue/test', "<li>just prepended some content</li>", headers={'x-sc-target': '#prepend-demo',
 *                                                                           'x-sc-swap-style': 'prepend'})
 *
 * print('about to send an alert script to be executed...')
 * conn.send('/queue/test', "", headers={'x-sc-script': 'alert("alert popup")'})
 *
 * print('about to send a customReset jQuery event with arguments..')
 * trigger_event = {'customReset': ['<h1>This is the prologue...</h1>',
 *                                  '<h3>...and this is the epilogue (always disappointing).</h3>']}
 * conn.send('/queue/test', "", headers={'x-sc-target': 'body',
 *                                       'x-sc-trigger': json.dumps(trigger_event)})
 *
 * @namespace Stompcooler
 */
const Stompcooler = (function() {
  "use strict"; // inside function for better merging

  const has = Object.prototype.hasOwnProperty;

  const scriptHeader = "x-sc-script";
  const triggerHeader = "x-sc-trigger";
  const targetHeader = "x-sc-target";
  const swapStyleHeader = "x-sc-swap-style";

  function convertStompEscapedChars(headerValue) {
    if ($.type(headerValue) === "string") {
      return headerValue.replace(/\\c/g, ":").replace(/\\\\/g, "\\");
    }
  }

  /**
   * Fires on connection failure
   */
  function logConnectionError() {
    console.log("Error creating STOMP connection");
  }

  function init() {
    const config = $('meta[name="stompcooler:config"]');
    if (config.length > 0) {
      let client = initSubscriptions(config);
      initPublishers(client);
    }
  }

  /**
   * Attach STOMP publisher event handlers
   *
   * @param client
   */
  function initPublishers(client) {
    let publishAttr = "data-sc-publish-to";
    let replyToAttr = "data-sc-reply-to";
    let fieldAttr = "data-field-id";
    $("body")
      .find("[" + publishAttr + "]")
      .each(function() {
        let _this = $(this);
        let destination = getAttr(_this, publishAttr);
        let replyTo = getAttr(_this, replyToAttr, null);
        let fieldId = getAttr(_this, fieldAttr, null);
        _this.on("submit", function(e) {
          e.preventDefault();
          let message_body;
          if (fieldId == null) {
            message_body = _this.serialize();
          } else {
            message_body = _this
              .find("#" + fieldId)
              .first()
              .val();
          }
          let headers;
          if (replyTo == null) {
            headers = {};
          } else {
            headers = { "reply-to": replyTo };
          }
          console.log("sending data");
          console.log(message_body);
          client.send(destination, headers, message_body);
          return false;
        });
      });
  }

  /**
   * Set up STOMP subscriptions based on html attributes.
   *
   * @param config {object} - JQuery object with connection attributes
   * @returns client {object} - connected STOMP client
   */
  function initSubscriptions(config) {
    const ws_uri = getAttr(config, "data-ws-uri", "ws://localhost:15674/ws");
    const default_queue = getAttr(config, "data-default", "/topic/default");
    const username = getAttr(config, "data-username", "guest");
    const password = getAttr(config, "data-password", "guest");
    const vhost = getAttr(config, "data-vhost", "/");
    let client = Stomp.over(new WebSocket(ws_uri));
    client.connect(
      username,
      password,
      getOnConnectCallBack(client, default_queue),
      logConnectionError,
      vhost
    );
    return client;
  }

  /**
   * Return function to auto-subscribe to proper channels with proper behavior TODO rewrite this
   *
   * @param client
   * @param default_queue {string} - default queue (used to trigger events or directly interact w/ DOM
   */
  function getOnConnectCallBack(client, default_queue) {
    let subscriptionAttr = "data-sc-subscribe-to";
    return function() {
      client.onreceive = getDefaultCallback();
      client.subscribe(default_queue, getDefaultCallback());
      $("body")
        .find("[" + subscriptionAttr + "]")
        .each(function() {
          let _this = $(this);
          let destination = getAttr(_this, subscriptionAttr);
          console.log("subscribing to " + destination);
          client.subscribe(destination, getSubscribeCallback(_this));
        });
    };
  }

  /**
   * Returns default queue on_message callback
   *
   * @returns {Function}
   */
  function getDefaultCallback() {
    return function(message) {
      let headers = message.headers;
      let body = message.body;

      let requireTarget = body || has.call(headers, triggerHeader);
      let hasTarget = has.call(headers, targetHeader);

      if (requireTarget && !hasTarget) {
        throw `Message requires a ${targetHeader} header.`;
      }

      if (has.call(headers, scriptHeader)) {
        eval(convertStompEscapedChars(headers[scriptHeader]));
      }

      let target = $(convertStompEscapedChars(headers[targetHeader]));

      if (has.call(message.headers, triggerHeader)) {
        let triggerValue = convertStompEscapedChars(headers[triggerHeader]);

        if (triggerValue.indexOf("{") >= 0) {
          $.each($.parseJSON(triggerValue), function(event, args) {
            target.trigger(event, args);
          });
        } else {
          target.trigger(triggerValue, []);
        }
      }

      if (body) {
        let content = $($.parseHTML(body, null, true));
        let swapStyle = headers[swapStyleHeader] || "replace";
        swapContent(target, content, swapStyle);
      }
    };
  }

  /**
   * Determine the message handler behavior based on HTML attributes
   *
   * @param elt {object} - JQuery object that defines the message handler
   * @returns {function} - STOMP message handler
   */
  function getSubscribeCallback(elt) {
    return function(message) {
      let body = message.body;
      let content = $($.parseHTML(body, null, true));
      let swapStyle = getAttr(elt, "data-sc-swap-style", "replace");
      swapContent(elt, content, swapStyle);
    };
  }

  /**
   * Swap JQuery elements content based on a swap style
   *
   * @param elt {object} - JQuery object representing the element to act on
   * @param content {object} - JQuery object representing content to be swapped in
   * @param swapStyle {string} - Decides how to swap the content
   */
  function swapContent(elt, content, swapStyle) {
    switch (swapStyle) {
      case "append": {
        elt.append(content);
        break;
      }
      case "prepend": {
        elt.prepend(content);
        break;
      }
      case "replace": {
        elt.empty().append(content);
        break;
      }
      default: {
        throw `${swapStyleHeader} must be one of ['append', 'prepend', 'replace'].`;
      }
    }
  }

  /**
   * Attribute getter that allows for defaults
   *
   * @param elt {object} - JQuery element
   * @param attr {string} - Attribute name
   * @param defaultValue - Default return value
   * @returns {string}
   */
  function getAttr(elt, attr, defaultValue) {
    return elt.attr(attr) || defaultValue;
  }

  $(function() {
    init();
  });

  // TODO There _has_ to be some sort of reasonable public API right?
  return {};
})();
