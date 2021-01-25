# Stompcooler

JavaScript library for streaming html/events to clients using STOMP and sizzle selectors/HTML snippets.

Inspired by [intercooler.js](http://intercoolerjs.org/) (with specific attention to [intercooler response headers](http://intercoolerjs.org/docs.html#responses)).

Stompcooler allows you to swap HTML content, trigger events, and run abitrary javascript based on STOMP messages.
See the `stompcooler.js` docs for details.

## Overview

The goal of Stompcooler is to make it easier to make a website event-reactive without having extensive front-end experience.

It is intended to be:

* Simple - small API surface largely based on declarative HTML attributes.
* Incremental - can be added only where events are useful to your application.
* Unobtrusive - should not conflict with other JS frameworks or have opinions about the source of STOMP messages.

## Boilerplate

To use stompcooler, the following depencies are needed:

JQuery 3.0+, stomp.js

e.g.

```
 <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js" integrity="sha256-nkP8cj5xaTdWK/BsZl+57ZCE/Y/i4UNtbNTpgH+6Taw=" crossorigin="anonymous"></script>
 <script src="path/to/stompcooler.js"></script>
 ```

You must also add the Stompcooler config as a `meta` element, e.g.

```html
<html lang="en">
  <head>
    ...
    <meta name="stompcooler:config" data-default="/topic/demo" />
  </head>
  ...
</html>
```

The following attributes (with defaults) are used as the config:

* data-ws-uri - websocket URI (ws://localhost:15674/ws)
* data-default - default queue (/topic/default)
* data-username - username (guest)
* data-password - password (guest)
* data-vhost - vhost (/)

 ## Demo

 Requires Docker.

`make demo`

## Examples

### Consuming Events

Adding a `data-sc-subscribe-to="/topic/mytopic"` attribute to an HTML element will subscribe the element
to the topic. By using a topic, all connected clients will see the changes immediately when messages that
affect the DOM are published.

When a message is published to that topic, the message will (by default) replace the `innerHTML` of the element. Headers
can affect the target element (whose `innerHTML` is affected) and whether the behavior should be to replace, append, or
prepend.

#### Example

Let's see how we can subscribe to a topic using HTML attributes and see how messages and their
body/headers will affect the DOM.

```html
<div data-sc-subscribe-to="/topic/mytopic">
    <p>initial content</p>
</div>

<div id="other-target">
    <p>initial content</p>
</div>
```

Publishing an event with body `<em>this is new content</em>` to `/topic/mytopic` would result in

```html
<div data-sc-subscribe-to="/topic/mytopic">
    <em>this is new content</em>
</div>

<div id="other-target">
    <p>initial content</p>
</div>
```

You can also affect other targets in interesting ways using headers, for example publishing an event
with body `<em>this content affects another target</em>` and headers 

```
x-sc-target: #other-target
x-sc-swap-style: prepend
```

would result in

```html
<div data-sc-subscribe-to="/topic/mytopic">
    <p>initial content</p>
</div>

<div id="other-target">
    <em>this content affects another target</em>
    <p>initial content</p>
</div>
```

### Publishing Events

Adding a `data-sc-publish-to="/queue/myqueue"` attribute to an HTML `form` element will prevent the default
form submission and instead publish the serialized (`application/x-www-form-urlencoded`) data to the queue.

You can create ephemeral queues to get replies on using a `data-sc-reply-to="/temp-queue/myqueue"` attribute
to be able to display responses.

#### Examples

We're going to create an application that will allow the user to submit a string and append the upper-cased
string to another element on the page. This activity will not be broadcast to any other connected clients.

```html
<div class="container">
    <form
    data-sc-publish-to="/queue/upcase-demo"
    data-sc-reply-to="/temp-queue/upcase-demo"
    >
    <div class="form-group">
        <label for="upperText"
        >Submit some text that will be upper-cased</label
        >
        <input
        type="text"
        id="upperText"
        name="upperText"
        />
    </div>
    <input type="submit" value="Submit" />
    </form>
</div>

<div id="display-upcased">
</div>
```

our server will look something like

```python
@app.subscribe("/queue/upcase-demo")
def rpc(headers, body, conn):
    form_data = dict(parse_qsl(body))
    reply_to = headers["reply-to"]
    upper = '<p>' + form_data.get("upperText", "").upper() + '</p>'
    conn.send(reply_to, upper, headers={"x-sc-target": "#display-upcased", "x-sc-swap-style": "append"})
```

When the form is submitted with a value of "this is some text", and then again with "this is some more text"
we'll see

```html
<div class="container">
    <form
    data-sc-publish-to="/queue/upcase-demo"
    data-sc-reply-to="/temp-queue/upcase-demo"
    >
    ...
    </form>
</div>

<div id="display-upcased">
    <p>THIS IS SOME TEXT</p>
    <p>THIS IS SOME MORE TEXT</p>
</div>
```
