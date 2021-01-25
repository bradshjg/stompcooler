import json
import time

import stomp


input("Open up the stomp-demo.html file in a browser and press any key to continue...")

conn = stomp.Connection([("rabbitmq", 61613)])
conn.connect("guest", "guest")

print("check out auto subscriptions...")
time.sleep(1)
conn.send("/topic/auto", "<h2>Just auto-replaced some content</h2>")

print("about to replace some content...")
time.sleep(1)
conn.send(
    "/topic/demo",
    "<h2>Just replaced some content</h2>",
    headers={"x-sc-target": "#replace-demo"},
)

print("about to append some content...")
time.sleep(1)
conn.send(
    "/topic/demo",
    "<li>just appended some content</li>",
    headers={"x-sc-target": "#append-demo", "x-sc-swap-style": "append"},
)

print("about to append some content...")
time.sleep(1)
conn.send(
    "/topic/demo",
    "<li>just prepended some content</li>",
    headers={"x-sc-target": "#prepend-demo", "x-sc-swap-style": "prepend"},
)

print("about to send an alert script to be executed...")
time.sleep(1)
conn.send("/topic/demo", "", headers={"x-sc-script": 'alert("alert popup")'})

print("about to send a customReset jQuery event with arguments...")
time.sleep(1)
trigger_event = {
    "customReset": [
        "<h1>This is the prologue...</h1>",
        "<h3>...and this is the epilogue (always disappointing).</h3>",
    ]
}
conn.send(
    "/topic/demo",
    "",
    headers={"x-sc-target": "body", "x-sc-trigger": json.dumps(trigger_event)},
)

print("about to use the Notifications API to send a notification...")
time.sleep(1)
trigger_event = {
    "notifyUser": ['Fancy "desktop" notifications', "...even to specific users."]
}
conn.send(
    "/topic/demo",
    "",
    headers={"x-sc-target": "body", "x-sc-trigger": json.dumps(trigger_event)},
)
