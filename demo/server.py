import logging
from urllib.parse import parse_qsl

from shattered import Shattered


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Shattered(host="rabbitmq")


@app.subscribe("/queue/rpc-demo")
def rpc(headers, body, conn):
    logger.info("%s %s", headers, body)
    form_data = dict(parse_qsl(body))
    reply_to = headers["reply-to"]
    upper = form_data.get("upperText", "").upper()
    conn.send(reply_to, upper, headers={"x-sc-target": "#rpc-replace"})


app.run()
